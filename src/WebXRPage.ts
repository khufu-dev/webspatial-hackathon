import * as THREE from "three/webgpu";
import { WebGLRenderer } from "three";
import { createScene, type DemoObject } from "./WebXRScenes";
import {
  bindCanvasInteractions,
  bindXRInteractions,
  getShape,
  getShapes,
  type InteractionView,
} from "./WebXRInteractions";
import "./WebXRPage.css";

const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
type RenderDemo = {
  renderer: WebGLRenderer | THREE.WebGPURenderer;
  scene: THREE.Scene;
};
type InlineDemo = {
  renderer: WebGLRenderer;
  scene: THREE.Scene;
  inlineSession: XRSession;
  stopFrames?: () => void;
  interaction: ReturnType<typeof bindCanvasInteractions>;
};
type ImmersiveControl = {
  mode: "immersive-vr" | "immersive-ar";
  button: HTMLButtonElement;
  status: HTMLParagraphElement;
  available: boolean;
};
const controls: ImmersiveControl[] = [
  {
    mode: "immersive-vr",
    button: element("vr-button"),
    status: element("vr-session-status"),
    available: false,
  },
  {
    mode: "immersive-ar",
    button: element("ar-button"),
    status: element("ar-session-status"),
    available: false,
  },
];
let activeSession: XRSession | undefined;
let activeControl: ImmersiveControl | undefined;
let requestingSession = false;
const stereoButton = element<HTMLButtonElement>("stereo-button");
let stereoReady = false;
const canvasInteractions: ReturnType<typeof bindCanvasInteractions>[] = [];

function updateControls() {
  stereoButton.disabled = !stereoReady || requestingSession || !!activeSession;
  for (const control of controls) {
    control.button.disabled =
      !control.available ||
      requestingSession ||
      (!!activeControl && activeControl !== control);
    control.button.textContent =
      activeControl === control
        ? control.mode === "immersive-ar"
          ? "Exit AR"
          : "Exit VR"
        : control.mode === "immersive-ar"
          ? "Open in AR"
          : "Enter VR";
  }
}

function sizeCanvas(
  renderer: WebGLRenderer | THREE.WebGPURenderer,
  container: HTMLElement,
  camera?: THREE.PerspectiveCamera,
) {
  const resize = () => {
    if (renderer.xr.isPresenting) return;
    const { clientWidth: width, clientHeight: height } = container;
    renderer.setSize(width, height, false);
    if (camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  };
  new ResizeObserver(resize).observe(container);
  resize();
  if (renderer instanceof WebGLRenderer) {
    renderer.xr.addEventListener("sessionend", () => {
      renderer.setAnimationLoop(null);
      resize();
    });
  } else {
    renderer.xr.addEventListener("sessionend", resize);
  }
}

async function createGPUDemo(
  object: DemoObject,
  immersive = false,
): Promise<RenderDemo> {
  if (!window.isSecureContext || !("gpu" in navigator)) {
    throw new Error(
      "WebGPU requires a supported browser and HTTPS or localhost.",
    );
  }
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Immersive rendering requires an XR-compatible adapter from initialization.
  renderer.xr.enabled = immersive;
  renderer.xr.setReferenceSpaceType("local");
  await renderer.init();
  if (!(renderer.backend instanceof THREE.WebGPUBackend)) {
    renderer.dispose();
    throw new Error("A WebGPU adapter is unavailable.");
  }
  const scene = createScene(renderer, object);
  renderer.xr.addEventListener("sessionend", () => {
    void renderer.setAnimationLoop(null);
  });
  return { renderer, scene };
}

async function startWebGPU(id: string, object: DemoObject) {
  const { renderer, scene } = await createGPUDemo(object);
  scene.background = new THREE.Color(0x181c24);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  const container = element<HTMLDivElement>(`${id}-scene`);
  container.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  sizeCanvas(renderer, container, camera);
  const interaction = bindCanvasInteractions(
    renderer.domElement,
    getShapes(scene),
    () => !activeSession,
    [{ camera }],
  );
  canvasInteractions.push(interaction);
  await renderer.compileAsync(scene, camera);
  await renderer.setAnimationLoop(() => {
    if (!activeSession) renderer.render(scene, camera);
  });
  element(`${id}-render-status`).textContent = "WebGPU is active.";
  return { renderer, scene };
}

function createWebGLDemo(object: DemoObject) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  const scene = createScene(renderer, object);
  renderer.xr.addEventListener("sessionend", () => {
    renderer.setAnimationLoop(null);
  });
  return { renderer, scene };
}

function startWebGL(id: string, object: DemoObject) {
  const { renderer, scene } = createWebGLDemo(object);
  scene.background = new THREE.Color(0x181c24);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  const container = element<HTMLDivElement>(`${id}-scene`);
  container.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  sizeCanvas(renderer, container, camera);
  const interaction = bindCanvasInteractions(
    renderer.domElement,
    getShapes(scene),
    () => !activeSession,
    [{ camera }],
  );
  canvasInteractions.push(interaction);
  renderer.setAnimationLoop(() => {
    if (!activeSession) renderer.render(scene, camera);
  });
  element(`${id}-render-status`).textContent = "WebGL is active.";
  return { renderer, scene };
}

async function startInline(
  id: string,
  object: DemoObject,
): Promise<InlineDemo> {
  const xr = navigator.xr;
  if (!window.isSecureContext || !xr) {
    throw new Error(
      "WebXR requires a supported browser and HTTPS or localhost.",
    );
  }
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  const container = element<HTMLDivElement>(`${id}-scene`);
  const status = element<HTMLParagraphElement>(`${id}-inline-status`);
  container.appendChild(renderer.domElement);
  sizeCanvas(renderer, container);
  const scene = createScene(renderer, object);
  const interaction = bindCanvasInteractions(
    renderer.domElement,
    getShapes(scene),
    () => !activeSession,
  );
  canvasInteractions.push(interaction);
  renderer.xr.addEventListener("sessionstart", interaction.reset);
  scene.background = new THREE.Color(0x181c24);
  const session = await xr.requestSession("inline");
  const demo = { renderer, scene, inlineSession: session, interaction };
  await bindInline(demo, status);
  return demo;
}

async function bindInline(
  demo: InlineDemo,
  status: HTMLParagraphElement,
  stereo = false,
) {
  const { renderer, scene, inlineSession: session } = demo;
  try {
    const layer = new XRWebGLLayer(session, renderer.getContext());
    session.updateRenderState({
      baseLayer: layer,
      inlineVerticalFieldOfView: THREE.MathUtils.degToRad(50),
      depthNear: 0.01,
      depthFar: 100,
    });
    const referenceSpace = await session.requestReferenceSpace("viewer");
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;
    const inputCameras = new Map<XREye, THREE.PerspectiveCamera>();
    const stereoGranted =
      session.enabledFeatures?.includes("inline-stereo") === true;
    let stopped = false;
    demo.stopFrames = () => {
      stopped = true;
    };
    session.addEventListener("end", demo.stopFrames, { once: true });
    const renderFrame: XRFrameRequestCallback = (_time, frame) => {
      if (stopped) return;
      session.requestAnimationFrame(renderFrame);
      if (activeSession) return;
      const pose = frame.getViewerPose(referenceSpace);
      if (!pose) return;
      if (stereo) {
        const hasStereoViews =
          pose.views.some((view) => view.eye === "left") &&
          pose.views.some((view) => view.eye === "right");
        const text = stereoGranted
          ? hasStereoViews
            ? "Inline stereo is active (left and right eye views)."
            : "Stereo was granted; waiting for left and right eye views."
          : "Inline stereo is unavailable; showing mono inline WebXR.";
        if (status.textContent !== text) status.textContent = text;
      }
      renderer.setRenderTarget(null);
      renderer.setScissorTest(true);
      const pixelRatio = renderer.getPixelRatio();
      const interactionViews: InteractionView[] = [];
      // Use each browser-provided viewport; do not assume side-by-side packing.
      for (const view of pose.views) {
        const viewport = layer.getViewport(view);
        if (!viewport) continue;
        camera.matrix.fromArray(view.transform.matrix);
        camera.matrixWorldNeedsUpdate = true;
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        const x = viewport.x / pixelRatio;
        const y = viewport.y / pixelRatio;
        const width = viewport.width / pixelRatio;
        const height = viewport.height / pixelRatio;
        renderer.setViewport(x, y, width, height);
        renderer.setScissor(x, y, width, height);
        renderer.render(scene, camera);
        let inputCamera = inputCameras.get(view.eye);
        if (!inputCamera) {
          inputCamera = new THREE.PerspectiveCamera();
          inputCameras.set(view.eye, inputCamera);
        }
        inputCamera.copy(camera);
        interactionViews.push({
          camera: inputCamera,
          bounds: {
            x: viewport.x / layer.framebufferWidth,
            y: 1 - (viewport.y + viewport.height) / layer.framebufferHeight,
            width: viewport.width / layer.framebufferWidth,
            height: viewport.height / layer.framebufferHeight,
          },
        });
      }
      renderer.setScissorTest(false);
      demo.interaction.setViews(interactionViews);
    };
    session.requestAnimationFrame(renderFrame);
    status.textContent = stereo
      ? "Checking granted stereo views…"
      : "Inline WebXR is active.";
    return;
  } catch (error) {
    void session.end().catch(() => {});
    throw error;
  }
}

async function configureImmersive(
  control: ImmersiveControl,
  getDemo: () => Promise<RenderDemo>,
  onSessionEnd?: (demo: RenderDemo) => void,
) {
  const xr = navigator.xr;
  if (
    !window.isSecureContext ||
    !xr ||
    !(await xr.isSessionSupported(control.mode))
  ) {
    control.status.textContent = `${control.mode === "immersive-ar" ? "AR" : "VR"} is unavailable in this browser or device.`;
    return;
  }
  control.available = true;
  control.status.textContent = "Ready to start an immersive session.";
  updateControls();
  control.button.addEventListener("click", async () => {
    requestingSession = true;
    updateControls();
    let session: XRSession | undefined;
    try {
      if (activeSession) {
        await activeSession.end();
      } else {
        // Request before other asynchronous work to preserve user activation.
        session = await xr.requestSession(control.mode, {
          requiredFeatures: ["local"],
        });
        activeSession = session;
        canvasInteractions.forEach((interaction) => interaction.reset());
        activeControl = control;
        session.addEventListener(
          "end",
          () => {
            activeSession = undefined;
            activeControl = undefined;
            control.status.textContent =
              "Session ended. The on-page view has resumed.";
            updateControls();
          },
          { once: true },
        );
        const { renderer, scene } = await getDemo();
        if (onSessionEnd) {
          session.addEventListener(
            "end",
            () => onSessionEnd({ renderer, scene }),
            { once: true },
          );
        }
        const interaction = bindXRInteractions(session, getShapes(scene), () =>
          renderer.xr.getReferenceSpace(),
        );
        const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
        await renderer.setAnimationLoop((_time, frame) => {
          if (renderer.xr.isPresenting) {
            if (frame) interaction.update(frame);
            renderer.render(scene, camera);
          }
        });
        await renderer.xr.setSession(session);
        control.status.textContent = "Immersive session is active.";
      }
    } catch (error) {
      if (session) await session.end().catch(() => {});
      control.status.textContent = `Could not change session: ${message(error)}`;
    } finally {
      requestingSession = false;
      updateControls();
    }
  });
}

async function initializeVR() {
  const demo = await startInline("vr", "cube");
  await configureImmersive(controls[0], async () => demo);
}

async function initializeAR() {
  const pageDemo = startWebGL("ar", "pyramid");
  let demo: RenderDemo | undefined;
  const copyTransform = (from: THREE.Scene, to: THREE.Scene) => {
    const source = getShape(from);
    const target = getShape(to);
    target.position.copy(source.position);
    target.quaternion.copy(source.quaternion);
    target.scale.copy(source.scale);
  };
  await configureImmersive(
    controls[1],
    async () => {
      demo ??= createWebGLDemo("pyramid");
      copyTransform(pageDemo.scene, demo.scene);
      return demo;
    },
    (immersiveDemo) => copyTransform(immersiveDemo.scene, pageDemo.scene),
  );
}

async function initializeStereo() {
  const demo = await startInline("stereo", "cylinder");
  const status = element<HTMLParagraphElement>("stereo-inline-status");
  status.textContent =
    "Mono inline is active. Select Start inline stereo to request stereo views.";
  stereoReady = true;
  updateControls();
  stereoButton.addEventListener("click", async () => {
    requestingSession = true;
    updateControls();
    let session: XRSession | undefined;
    try {
      session = await navigator.xr!.requestSession("inline", {
        optionalFeatures: ["inline-stereo"],
      });
      const replacement = { ...demo, inlineSession: session };
      await bindInline(replacement, status, true);
      demo.stopFrames?.();
      void demo.inlineSession.end().catch(() => {});
      Object.assign(demo, replacement);
    } catch (error) {
      if (session) void session.end().catch(() => {});
      status.textContent = `Could not start inline stereo: ${message(error)}. The previous inline view is still active.`;
    } finally {
      requestingSession = false;
      updateControls();
    }
  });
}

// Initialize sections independently so unavailable modes do not block the others.
void Promise.all([
  startWebGPU("gpu", "sphere").catch((error) => {
    element("gpu-render-status").textContent =
      `WebGPU unavailable: ${message(error)}`;
  }),
  initializeVR().catch((error) => {
    element("vr-inline-status").textContent =
      `Could not start inline WebXR: ${message(error)}`;
    element("vr-session-status").textContent = "VR unavailable.";
  }),
  initializeAR().catch((error) => {
    element("ar-render-status").textContent =
      `Could not start WebGL: ${message(error)}`;
    element("ar-session-status").textContent = "AR unavailable.";
  }),
  initializeStereo().catch((error) => {
    element("stereo-inline-status").textContent =
      `Inline stereo unavailable: ${message(error)}`;
  }),
]);
