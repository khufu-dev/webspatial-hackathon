import * as THREE from "three/webgpu";

export type XRChoice = {
  value: number;
  label: string;
  icon?: CanvasImageSource;
};

export type XRPanelState = {
  selected: number;
  speed: number;
  paused: boolean;
};

export type XRPanelOptions = {
  backend: "WebGPU" | "WebGL";
  planets: readonly XRChoice[];
  speeds: readonly XRChoice[];
  getState: () => XRPanelState;
};

export type XRPanelActions = {
  select: (index: number) => void;
  speed: (value: number) => void;
  overview: () => void;
  pause: () => void;
  exit: () => void;
};

type Menu = "planets" | "speed";
type Button = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  context: CanvasRenderingContext2D;
  map: THREE.CanvasTexture;
  label: () => string;
  detail?: () => string;
  selected?: () => boolean;
  icon?: CanvasImageSource;
  menu?: Menu;
  painted: string;
};

export function createSolarXRPanel(
  actions: XRPanelActions,
  options: XRPanelOptions,
) {
  const object = new THREE.Group();
  object.name = "Solar VR controls";
  object.position.set(0, -0.5, -1.25);
  object.rotation.x = -0.22;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const buttons: Button[] = [];
  let openMenu: Menu | undefined;
  let hovered = new Set<THREE.Object3D>();
  let state = options.getState();
  let disposed = false;
  const currentLabel = (choices: readonly XRChoice[], value: number) =>
    choices.find((choice) => choice.value === value)?.label ?? "Overview";

  // An opaque backing also catches rays between options, so selecting an
  // empty part of a menu cannot accidentally select a planet behind it.
  const backing = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: "#091420", toneMapped: false }),
  );
  backing.name = "solar-xr-menu-backing";
  backing.position.set(0, 0.33, -0.003);
  backing.scale.set(1.2, 0.3, 1);
  backing.visible = false;
  object.add(backing);

  function refresh() {
    if (disposed) return;
    state = options.getState();
    backing.visible = !!openMenu;
    for (const button of buttons) {
      const { mesh, context, map, icon } = button;
      mesh.visible = !button.menu || button.menu === openMenu;
      if (!mesh.visible) continue;
      const active = button.selected?.() ?? false;
      const pointing = hovered.has(mesh);
      const label = button.label();
      const detail = button.detail?.() ?? "";
      const key = JSON.stringify([active, pointing, label, detail]);
      if (key === button.painted) continue;
      button.painted = key;
      const { width, height } = context.canvas;
      context.fillStyle = pointing ? "#2b4a5b" : active ? "#25434a" : "#13202f";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = active
        ? "#efd19a"
        : pointing
          ? "#d2f2ff"
          : "#648493";
      context.lineWidth = active || pointing ? 5 : 2;
      context.strokeRect(3, 3, width - 6, height - 6);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = active ? "#ffe3aa" : "#edf7ff";
      context.font = "40px system-ui";
      if (icon) {
        context.drawImage(icon, width / 2 - 47, 14, 94, 94);
        context.fillText(label, width / 2, 157, width - 28);
      } else if (detail) {
        context.fillText(label, width / 2, 70, width - 28);
        context.font = "32px system-ui";
        context.fillStyle = "#b8cfdb";
        context.fillText(detail, width / 2, 146, width - 28);
      } else {
        context.fillText(label, width / 2, height / 2, width - 28);
      }
      map.needsUpdate = true;
    }
  }

  function addButton(
    id: string,
    x: number,
    y: number,
    width: number,
    action: () => void,
    content: Pick<Button, "label" | "detail" | "selected" | "icon" | "menu">,
  ) {
    const canvas = document.createElement("canvas");
    canvas.height = 200;
    canvas.width = Math.round((width / 0.1) * canvas.height);
    const context = canvas.getContext("2d")!;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map, toneMapped: false }),
    );
    mesh.name = `solar-xr-${id}`;
    mesh.position.set(x, y, 0);
    mesh.scale.set(width, 0.1, 1);
    mesh.userData.action = () => {
      if (disposed) return;
      action();
      refresh();
    };
    object.add(mesh);
    buttons.push({ mesh, context, map, ...content, painted: "" });
  }

  const toggle = (menu: Menu) => {
    openMenu = openMenu === menu ? undefined : menu;
    hovered.clear();
  };
  const choose = (action: () => void) => {
    action();
    openMenu = undefined;
    hovered.clear();
  };
  addButton("overview", -0.472, 0, 0.224, () => choose(actions.overview), {
    label: () => "Overview",
    selected: () => state.selected === -1,
  });
  addButton("pause", -0.236, 0, 0.224, actions.pause, {
    label: () => (state.paused ? "Play" : "Pause"),
    selected: () => state.paused,
  });
  addButton("planets", 0, 0, 0.224, () => toggle("planets"), {
    label: () => `Planets ${openMenu === "planets" ? "▴" : "▾"}`,
    detail: () => currentLabel(options.planets, state.selected),
    selected: () => openMenu === "planets",
  });
  addButton("speed", 0.236, 0, 0.224, () => toggle("speed"), {
    label: () => `Time speed ${openMenu === "speed" ? "▴" : "▾"}`,
    detail: () => currentLabel(options.speeds, state.speed),
    selected: () => openMenu === "speed",
  });
  addButton("exit", 0.472, 0, 0.224, actions.exit, { label: () => "Exit VR" });

  const backendCanvas = document.createElement("canvas");
  backendCanvas.width = 800;
  backendCanvas.height = 100;
  const backendContext = backendCanvas.getContext("2d")!;
  backendContext.fillStyle = "#091420";
  backendContext.fillRect(0, 0, 800, 100);
  backendContext.fillStyle = "#b5e3e8";
  backendContext.font = "48px system-ui";
  backendContext.textAlign = "center";
  backendContext.textBaseline = "middle";
  backendContext.fillText(`${options.backend} rendering`, 400, 50, 760);
  const backendTexture = new THREE.CanvasTexture(backendCanvas);
  backendTexture.colorSpace = THREE.SRGBColorSpace;
  const backendBadge = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: backendTexture,
      toneMapped: false,
    }),
  );
  backendBadge.name = "solar-xr-backend";
  backendBadge.position.y = -0.105;
  backendBadge.scale.set(0.52, 0.065, 1);
  object.add(backendBadge);

  for (const menu of ["planets", "speed"] as const) {
    const choices = menu === "planets" ? options.planets : options.speeds;
    const columns = menu === "planets" ? 5 : 4;
    const pitch = 1.18 / columns;
    choices.forEach((choice, index) => {
      addButton(
        `${menu}-option-${choice.value}`,
        ((index % columns) - (columns - 1) / 2) * pitch,
        0.395 - Math.floor(index / columns) * 0.13,
        pitch - 0.014,
        () =>
          choose(() =>
            menu === "planets"
              ? actions.select(choice.value)
              : actions.speed(choice.value),
          ),
        {
          menu,
          label: () => choice.label,
          icon: choice.icon,
          selected: () =>
            choice.value ===
            (menu === "planets" ? state.selected : state.speed),
        },
      );
    });
  }

  const readoutCanvas = document.createElement("canvas");
  readoutCanvas.width = 1536;
  readoutCanvas.height = 128;
  const readoutContext = readoutCanvas.getContext("2d")!;
  const readoutTexture = new THREE.CanvasTexture(readoutCanvas);
  readoutTexture.colorSpace = THREE.SRGBColorSpace;
  const readout = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: readoutTexture,
      transparent: true,
      toneMapped: false,
    }),
  );
  readout.position.y = 0.115;
  readout.scale.set(1.17, 0.095, 1);
  object.add(readout);
  let previousReadout = "";
  refresh();

  return {
    object,
    pickable() {
      if (disposed) return [];
      // Three's raycaster does not automatically exclude invisible meshes.
      return [
        ...buttons.filter(({ mesh }) => mesh.visible).map(({ mesh }) => mesh),
        ...(backing.visible ? [backing] : []),
      ];
    },
    setHovered(objects: THREE.Object3D[]) {
      hovered = new Set(objects);
    },
    update(text: string) {
      if (disposed) return;
      refresh();
      if (text === previousReadout) return;
      readoutContext.clearRect(0, 0, 1536, 128);
      readoutContext.fillStyle = "#edf7ff";
      readoutContext.font = "38px system-ui";
      readoutContext.textAlign = "center";
      readoutContext.textBaseline = "middle";
      readoutContext.fillText(text, 768, 64, 1500);
      readoutTexture.needsUpdate = true;
      previousReadout = text;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      buttons.forEach(({ mesh, map }) => {
        mesh.material.dispose();
        map.dispose();
      });
      geometry.dispose();
      backing.material.dispose();
      readout.material.dispose();
      readoutTexture.dispose();
      backendBadge.material.dispose();
      backendTexture.dispose();
      hovered.clear();
    },
  };
}
