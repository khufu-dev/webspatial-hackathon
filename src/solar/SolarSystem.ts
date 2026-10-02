import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  advanceTime,
  loadOrbitKernel,
  MAX_TIME,
  MIN_TIME,
  planets,
} from "./ephemeris";
import { createSolarScene, type SolarScene } from "./SolarScene";
import { bindSolarXR } from "./SolarXR";
import "./SolarSystem.css";

type SessionHost = {
  busy: () => boolean;
  availability: (available: boolean) => void;
  state: (session: XRSession | undefined, pending: boolean) => void;
};
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function startSolarSystem(host: SessionHost) {
  const section = element("solar-section");
  const viewport = element("solar-viewport");
  const canvasHost = element("solar-canvas");
  const status = element("solar-render-status");
  const sessionStatus = element("solar-session-status");
  const loading = element("solar-loading");
  const button = element<HTMLButtonElement>("solar-vr-button");
  const pauseButton = element<HTMLButtonElement>("solar-pause");
  const speedInput = element<HTMLSelectElement>("solar-speed");
  const dateInput = element<HTMLInputElement>("solar-date");
  const scaleInput = element<HTMLSelectElement>("solar-scale");
  const labelsInput = element<HTMLInputElement>("solar-labels");
  const planetNav = element("solar-planets");
  const labelLayer = element("solar-label-layer");
  const clock = element("solar-clock");
  const lens = element("solar-lens");
  const errors = new AbortController();
  let renderer: THREE.WebGPURenderer | undefined;
  let vrRenderer: THREE.WebGPURenderer | undefined;
  let solar: SolarScene | undefined;
  let disposed = false;
  let observer: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let orbitControls: OrbitControls | undefined;
  let session: XRSession | undefined;
  let previousFrame = 0;
  let visible = true;
  let selected = 5;
  let physical = false;
  let readyMessage = "";
  let expanded = false;
  let previousOverflow = "";
  let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let live = true;
  let rate = 1 / 86400;
  let time = Math.min(MAX_TIME, Math.max(MIN_TIME, Date.now()));
  const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 5000);
  const vrCamera = new THREE.PerspectiveCamera(55, 1, 0.005, 2000);
  const focusOffset = new THREE.Vector3();
  const target = new THREE.Vector3();
  const lastTarget = new THREE.Vector3();
  let transitioning = true;
  let lastStats = -Infinity;
  const labelElements: HTMLButtonElement[] = [];
  const listeners = { signal: errors.signal };
  const on = (id: string, event: string, callback: EventListener) =>
    element(id).addEventListener(event, callback, listeners);
  const pause = () => {
    paused = !paused;
    if (!paused) {
      live = false;
      status.textContent = readyMessage;
    }
    pauseButton.textContent = paused ? "▶ Play" : "Ⅱ Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
  };
  const updateStats = () => {
    const planet = planets[selected];
    const body = solar?.bodies[selected];
    element("solar-object-type").textContent =
      planet?.kind ?? "Our cosmic neighborhood";
    element("solar-object-name").textContent = planet?.name ?? "Solar System";
    element("solar-description").textContent =
      planet?.description ??
      "Eight worlds, one star. Trace their paths through space, then choose a planet to get closer.";
    element("solar-radius").textContent = planet
      ? `${planet.radius.toLocaleString("en-US")} km`
      : "8 planets";
    element("solar-radius-label").textContent = planet
      ? "Mean radius"
      : "Worlds to explore";
    element("solar-period").textContent = planet
      ? `${(planet.year / 365.256).toLocaleString("en-US", { maximumFractionDigits: 2 })} yr`
      : "4.6 billion yr";
    element("solar-period-label").textContent = planet
      ? "Orbital period"
      : "Age of our Sun";
    element("solar-distance").textContent = body
      ? `${body.distanceAU.toFixed(3)} AU`
      : "30.07 AU";
    element("solar-distance-label").textContent = planet
      ? "Distance to Sun"
      : "Neptune’s mean orbit";
    element("solar-day").textContent = planet
      ? `${Math.abs(planet.day * 24).toLocaleString("en-US", { maximumFractionDigits: 2 })} h`
      : "299,792 km/s";
    element("solar-day-label").textContent = planet
      ? `Sidereal day${planet.day < 0 ? " · retrograde" : ""}`
      : "Speed of light";
    planetNav
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((item) =>
        item.setAttribute(
          "aria-pressed",
          String(Number(item.dataset.planet) === selected),
        ),
      );
    labelElements.forEach((item, index) =>
      item.classList.toggle("selected", index === selected),
    );
    clock.textContent =
      new Date(time).toISOString().slice(0, 19).replace("T", " ") + " UTC";
    if (document.activeElement !== dateInput)
      dateInput.value = new Date(time).toISOString().slice(0, 10);
    lens.textContent = physical
      ? "True distances & radii"
      : "Distances compressed · planets enlarged";
    viewport.dataset.selectedPlanet = planet?.name ?? "overview";
    viewport.dataset.simulationTime = String(time);
  };
  const focus = (index: number) => {
    selected = index;
    if (!solar || !orbitControls) return;
    if (selected < 0) {
      const halfAngle = Math.atan(
        Math.tan((camera.fov * Math.PI) / 360) * Math.min(camera.aspect, 1),
      );
      focusOffset
        .set(0, 0.55, 0.84)
        .normalize()
        .multiplyScalar(((physical ? 315 : 20) / Math.sin(halfAngle)) * 1.05);
      orbitControls.minDistance = physical ? 0.01 : 0.2;
    } else {
      const body = solar.bodies[selected];
      // Approach from the sunlit side, retaining enough phase angle to show
      // the terminator. The camera tracks orbital translation during playback.
      focusOffset
        .copy(body.anchor.position)
        .normalize()
        .negate()
        .add(new THREE.Vector3(0.4, 0.6, 0.65))
        .normalize();
      focusOffset.multiplyScalar(body.radius * (selected === 5 ? 10 : 5.5));
      orbitControls.minDistance = body.radius * 1.35;
    }
    camera.near =
      physical && selected >= 0
        ? Math.max(solar.bodies[selected].radius / 50, 0.000001)
        : 0.001;
    camera.updateProjectionMatrix();
    transitioning = true;
    if (readyMessage) status.textContent = readyMessage;
    updateStats();
  };

  const setExpanded = (value: boolean) => {
    if (value === expanded) return;
    expanded = value;
    if (expanded) previousOverflow = document.body.style.overflow;
    document.body.style.overflow = expanded ? "hidden" : previousOverflow;
    element("solar-observatory").classList.toggle("is-expanded", expanded);
    element("solar-expand").textContent = expanded
      ? "↙ Exit full screen"
      : "⛶ Full screen";
    element("solar-expand").setAttribute("aria-pressed", String(expanded));
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    setExpanded(false);
    errors.abort();
    observer?.disconnect();
    visibilityObserver?.disconnect();
    orbitControls?.dispose();
    void session?.end().catch(() => {});
    void renderer?.setAnimationLoop(null);
    void vrRenderer?.setAnimationLoop(null);
    renderer?.dispose();
    vrRenderer?.dispose();
    solar?.dispose();
    renderer?.domElement.remove();
    labelLayer.replaceChildren();
    planetNav.replaceChildren();
  };

  try {
    if (!window.isSecureContext)
      throw new Error(
        "Open this page over HTTPS or localhost to use WebGPU and immersive VR.",
      );
    status.textContent = "Loading WebAssembly orbital engine…";
    const kernel = await loadOrbitKernel();
    solar = createSolarScene(kernel);
    renderer = new THREE.WebGPURenderer({
      antialias: true,
      powerPreference: "high-performance",
      forceWebGL: !("gpu" in navigator),
    });
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    await renderer.init();
    const webgpu = renderer.backend instanceof THREE.WebGPUBackend;
    element("solar-backend").textContent = webgpu ? "WebGPU" : "WebGL fallback";
    element("solar-wasm").textContent = "WASM active";
    viewport.dataset.backend = webgpu ? "webgpu" : "webgl";
    canvasHost.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive solar system. Drag to orbit, scroll or pinch to zoom. Use the planet buttons to choose a world.",
    );
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.075;
    orbitControls.enablePan = false;
    orbitControls.maxDistance = 4000;
    orbitControls.addEventListener("start", () => {
      transitioning = false;
    });
    const resize = () => {
      if (!renderer || session) return;
      const width = Math.max(1, canvasHost.clientWidth);
      const height = Math.max(1, canvasHost.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (selected < 0) focus(-1);
    };
    observer = new ResizeObserver(resize);
    observer.observe(canvasHost);
    resize();
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousFrame = 0;
    });
    visibilityObserver.observe(viewport);
    await solar.loadTextures((count, total) => {
      status.textContent = `Loading planetary surfaces · ${count} / ${total}`;
      element("solar-loading-text").textContent =
        `Preparing the observatory · ${count} / ${total}`;
    });
    if (disposed) return;
    solar.update(time);
    focus(selected);
    target.copy(solar.bodies[selected].anchor.position);
    lastTarget.copy(target);
    orbitControls.target.copy(target);
    camera.position.copy(target).add(focusOffset);
    orbitControls.update();
    transitioning = false;
    await renderer.compileAsync(solar.scene, camera);
    loading.hidden = true;
    section
      .querySelectorAll<
        HTMLButtonElement | HTMLInputElement | HTMLSelectElement
      >("[data-solar-control]")
      .forEach((input) => {
        input.disabled = false;
      });
    pauseButton.textContent = paused ? "▶ Play" : "Ⅱ Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
    readyMessage = `${webgpu ? "WebGPU" : "WebGL fallback"} rendering · WebAssembly orbits · Drag to orbit, scroll or pinch to zoom.`;
    status.textContent = readyMessage;

    for (let index = -1; index < planets.length; index++) {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.planet = String(index);
      item.textContent = index < 0 ? "◎ Overview" : planets[index].name;
      if (index >= 0)
        item.style.setProperty("--planet-color", planets[index].color);
      item.addEventListener("click", () => focus(index), listeners);
      planetNav.appendChild(item);
      if (index < 0) continue;
      const label = document.createElement("button");
      label.type = "button";
      label.textContent = planets[index].name;
      label.tabIndex = -1; // Equivalent keyboard navigation is in planetNav.
      label.setAttribute("aria-label", `Focus ${planets[index].name}`);
      label.addEventListener("click", () => focus(index), listeners);
      labelLayer.appendChild(label);
      labelElements.push(label);
    }
    on("solar-pause", "click", pause);
    on("solar-speed", "change", () => {
      rate = Number(speedInput.value);
      live = false;
      previousFrame = 0;
    });
    on("solar-date", "change", () => {
      const next = dateInput.valueAsNumber;
      if (!Number.isFinite(next) || next < MIN_TIME || next > MAX_TIME) {
        dateInput.setCustomValidity(
          "Choose a date between 1800-01-01 and 2050-01-01.",
        );
        dateInput.reportValidity();
        return;
      }
      dateInput.setCustomValidity("");
      time = next;
      live = false;
      solar!.update(time);
      focus(selected);
    });
    on("solar-now", "click", () => {
      time = Math.min(MAX_TIME, Math.max(MIN_TIME, Date.now()));
      live = true;
      paused = false;
      rate = 1 / 86400;
      speedInput.value = String(rate);
      pauseButton.textContent = "Ⅱ Pause";
      pauseButton.setAttribute("aria-pressed", "false");
      dateInput.setCustomValidity("");
      solar!.update(time);
      focus(selected);
    });
    on("solar-scale", "change", () => {
      physical = scaleInput.value === "physical";
      solar!.setScale(physical, time);
      focus(selected);
    });
    on("solar-labels", "change", () => {
      labelLayer.hidden = !labelsInput.checked;
    });
    on("solar-reset", "click", () => focus(selected));
    on("solar-expand", "click", async () => {
      setExpanded(!expanded);
      try {
        if (!expanded && document.fullscreenElement)
          await document.exitFullscreen();
        else if (expanded)
          await element("solar-observatory").requestFullscreen?.();
      } catch {
        // Embedded browsers may reject or never resolve native fullscreen.
        // The viewport-filling CSS view remains usable in either case.
      }
    });
    document.addEventListener(
      "fullscreenchange",
      () => {
        setExpanded(!!document.fullscreenElement);
      },
      listeners,
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && !document.fullscreenElement)
          setExpanded(false);
      },
      listeners,
    );
    // A click selects a body; moving the pointer belongs to OrbitControls.
    const down = new THREE.Vector2();
    let dragged = false;
    const raycaster = new THREE.Raycaster();
    renderer.domElement.addEventListener(
      "pointerdown",
      (event) => {
        down.set(event.clientX, event.clientY);
        dragged = false;
      },
      listeners,
    );
    renderer.domElement.addEventListener(
      "pointermove",
      (event) => {
        if (
          down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5
        )
          dragged = true;
      },
      listeners,
    );
    renderer.domElement.addEventListener(
      "pointerup",
      (event) => {
        if (dragged || event.button !== 0 || session || host.busy()) return;
        const bounds = renderer!.domElement.getBoundingClientRect();
        raycaster.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            1 - ((event.clientY - bounds.top) / bounds.height) * 2,
          ),
          camera,
        );
        const hit = raycaster.intersectObjects(solar!.pickable, false)[0];
        if (hit) focus(hit.object.userData.planetIndex);
      },
      listeners,
    );
    const projection = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let xrInteraction: ReturnType<typeof bindSolarXR> | undefined;
    const animate = (now: number, frame?: XRFrame) => {
      if (disposed || !solar || !renderer || !orbitControls) return;
      const seconds = previousFrame
        ? Math.min((now - previousFrame) / 1000, 0.1)
        : 0;
      previousFrame = now;
      if (!session && (!visible || document.hidden || host.busy())) return;
      if (session && session.visibilityState !== "visible") return;
      if (!paused) {
        time = live
          ? Math.min(MAX_TIME, Math.max(MIN_TIME, Date.now()))
          : advanceTime(time, seconds, rate);
        if (
          (time === MAX_TIME && (live || rate > 0)) ||
          (time === MIN_TIME && (live || rate < 0))
        ) {
          paused = true;
          pauseButton.textContent = "▶ Play";
          pauseButton.setAttribute("aria-pressed", "true");
          status.textContent =
            "Reached the 1800–2050 model boundary. Choose another date or reverse time.";
        }
      }
      solar.update(time);
      if (selected < 0) target.set(0, 0, 0);
      else target.copy(solar.bodies[selected].anchor.position);
      if (session) {
        const scale =
          selected < 0
            ? physical
              ? 0.007
              : 0.12
            : 0.23 / solar.bodies[selected].radius;
        solar.system.scale.setScalar(scale);
        solar.system.position
          .copy(target)
          .multiplyScalar(-scale)
          .add(
            new THREE.Vector3(
              0,
              selected < 0 ? -0.25 : 0.03,
              selected < 0 ? -3 : -1.8,
            ),
          );
        solar.update(time);
        const speedLabel =
          rate === 1 / 86400
            ? "Real time"
            : rate === 1 / 24
              ? "1 hour/s"
              : `${rate} days/s`;
        if (frame)
          xrInteraction?.update(
            frame,
            `${selected < 0 ? "Solar System" : planets[selected].name} · ${new Date(time).toISOString().slice(0, 10)} · ${paused ? "Paused" : live ? "Live" : speedLabel}`,
          );
        (vrRenderer ?? renderer).render(solar.scene, vrCamera);
      } else {
        if (transitioning) {
          const amount = window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? 1
            : 1 - Math.exp(-seconds * 5);
          orbitControls.target.lerp(target, amount);
          camera.position.lerp(target.clone().add(focusOffset), amount);
          if (
            camera.position.distanceTo(target.clone().add(focusOffset)) <
            Math.max(0.00001, focusOffset.length() * 0.002)
          )
            transitioning = false;
        } else {
          camera.position.add(target.clone().sub(lastTarget));
          orbitControls.target.copy(target);
        }
        lastTarget.copy(target);
        orbitControls.update();
        camera.getWorldDirection(direction);
        const occupied: { x: number; y: number }[] = [];
        const width = canvasHost.clientWidth;
        const height = canvasHost.clientHeight;
        const labelOrder = labelElements
          .map((_, index) => index)
          .sort((a, b) => (a === selected ? -1 : b === selected ? 1 : b - a));
        labelOrder.forEach((index) => {
          const label = labelElements[index];
          const body = solar!.bodies[index];
          projection.copy(body.anchor.position);
          const front =
            projection.clone().sub(camera.position).dot(direction) > 0;
          projection.y += body.radius * 1.3;
          projection.project(camera);
          const x = (projection.x * 0.5 + 0.5) * width;
          const y = (-projection.y * 0.5 + 0.5) * height;
          const shown =
            labelsInput.checked &&
            front &&
            projection.z >= -1 &&
            projection.z <= 1 &&
            Math.abs(projection.x) < 0.93 &&
            Math.abs(projection.y) < 0.87 &&
            !occupied.some(
              (point) =>
                Math.abs(point.x - x) < 72 && Math.abs(point.y - y) < 24,
            );
          label.hidden = !shown;
          if (shown) {
            occupied.push({ x, y });
            label.style.left = `${(projection.x * 0.5 + 0.5) * 100}%`;
            label.style.top = `${(-projection.y * 0.5 + 0.5) * 100}%`;
          }
        });
        renderer.render(solar.scene, camera);
      }
      if (now - lastStats > 200) {
        lastStats = now;
        updateStats();
      }
    };
    await renderer.setAnimationLoop(animate);
    updateStats();

    const xr = navigator.xr;
    const supported =
      !!xr && (await xr.isSessionSupported("immersive-vr").catch(() => false));
    if (disposed) return;
    const nativeGPU = webgpu && "XRGPUBinding" in globalThis;
    host.availability(supported);
    sessionStatus.textContent = supported
      ? nativeGPU
        ? "Ready for immersive VR with WebGPU. Point and select planets or the floating controls."
        : "Ready for immersive VR with WebGL compatibility rendering. The on-page view keeps its current renderer."
      : "Immersive VR needs a supported headset and browser. Explore with the on-page controls here.";
    button.addEventListener(
      "click",
      async () => {
        if (!xr || disposed) return;
        if (session) {
          try {
            await session.end();
          } catch (error) {
            sessionStatus.textContent = message(error);
          }
          return;
        }
        if (host.busy()) return;
        host.state(undefined, true);
        let candidate: XRSession | undefined;
        try {
          // Preserve the initiating click's activation. Native WebGPU XR
          // requires the "webgpu" feature; mere GPU availability is insufficient.
          candidate = await xr.requestSession("immersive-vr", {
            requiredFeatures: nativeGPU ? ["local", "webgpu"] : ["local"],
            optionalFeatures: ["local-floor", "hand-tracking"],
          });
          session = candidate;
          host.state(session, true);
          const currentSession = session;
          let ended = false;
          currentSession.addEventListener(
            "end",
            () => {
              ended = true;
              session = undefined;
              xrInteraction = undefined;
              host.state(undefined, false);
              solar!.system.position.set(0, 0, 0);
              solar!.system.scale.setScalar(1);
              orbitControls!.enabled = true;
              previousFrame = 0;
              labelLayer.hidden = !labelsInput.checked;
              void vrRenderer?.setAnimationLoop(null);
              // XRManager restores the renderer's animation context on end.
              // Resume on a microtask after that restoration has completed.
              queueMicrotask(() => {
                if (disposed) return;
                resize();
                void renderer!.setAnimationLoop(animate);
                focus(selected);
              });
              sessionStatus.textContent =
                "VR session ended. The on-page view has resumed.";
            },
            { once: true },
          );
          if (!nativeGPU && webgpu && !vrRenderer) {
            vrRenderer = new THREE.WebGPURenderer({
              antialias: true,
              forceWebGL: true,
            });
            vrRenderer.xr.enabled = true;
            vrRenderer.xr.setReferenceSpaceType("local");
            vrRenderer.toneMapping = renderer!.toneMapping;
            vrRenderer.toneMappingExposure = renderer!.toneMappingExposure;
            await vrRenderer.init();
          }
          if (ended || disposed) return;
          const immersiveRenderer = vrRenderer ?? renderer!;
          orbitControls!.enabled = false;
          labelLayer.hidden = true;
          focus(-1);
          xrInteraction = bindSolarXR(
            currentSession,
            immersiveRenderer,
            solar!,
            {
              select: focus,
              overview: () => focus(-1),
              pause,
              next: () => focus((selected + 1) % planets.length),
              exit: () => {
                void currentSession.end().catch((error) => {
                  sessionStatus.textContent = message(error);
                });
              },
            },
          );
          await renderer!.setAnimationLoop(null);
          if (ended || disposed) return;
          await immersiveRenderer.setAnimationLoop(animate);
          if (ended || disposed) {
            await immersiveRenderer.setAnimationLoop(null);
            if (!disposed) await renderer!.setAnimationLoop(animate);
            return;
          }
          await immersiveRenderer.xr.setSession(currentSession);
          if (ended) return;
          sessionStatus.textContent = `Immersive VR is active · ${nativeGPU ? "WebGPU" : "WebGL compatibility"} · Point and select to explore.`;
          host.state(currentSession, false);
        } catch (error) {
          await candidate?.end().catch(() => {});
          if (!session) host.state(undefined, false);
          sessionStatus.textContent = `Could not enter VR: ${message(error)}. ${nativeGPU ? "This browser may not support the WebGPU XR session feature." : "You can retry Enter solar VR."}`;
        }
      },
      listeners,
    );
    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) dispose();
      },
      listeners,
    );
    if (import.meta.hot) import.meta.hot.dispose(dispose);
  } catch (error) {
    dispose();
    host.availability(false);
    loading.hidden = false;
    element("solar-loading-text").textContent =
      "The observatory could not start.";
    status.textContent = message(error);
    sessionStatus.textContent = "Reload this page to retry.";
    element("solar-backend").textContent = "Unavailable";
    throw error;
  }
}
