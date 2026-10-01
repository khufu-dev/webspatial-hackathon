import * as THREE from "three/webgpu";

const minScale = 0.3;
const maxScale = 3;

export function getShape(scene: THREE.Scene) {
  return scene.getObjectByName("demo-shape")!;
}

export function getShapes(scene: THREE.Scene) {
  return scene.children.filter((object) => object.userData.demoShape);
}

function pickShape(raycaster: THREE.Raycaster, shapes: THREE.Object3D[]) {
  shapes.forEach((shape) => shape.updateWorldMatrix(true, true));
  const hit = raycaster.intersectObjects(shapes, true)[0];
  if (!hit) return undefined;
  return shapes.find((shape) => {
    for (
      let object: THREE.Object3D | null = hit.object;
      object;
      object = object.parent
    )
      if (object === shape) return true;
    return false;
  });
}

// Rebase whenever a finger/grab is added or removed to avoid transform jumps.
class DragGesture<Key> {
  readonly points = new Map<Key, THREE.Vector3>();
  private origin = new THREE.Vector3();
  private position = new THREE.Vector3();
  private distance = 0;
  private scale = 1;

  constructor(private shape: THREE.Object3D) {}

  private center() {
    const center = new THREE.Vector3();
    for (const point of this.points.values()) center.add(point);
    return center.divideScalar(this.points.size || 1);
  }

  private separation() {
    const points = [...this.points.values()];
    return points.length === 2 ? points[0].distanceTo(points[1]) : 0;
  }

  rebase() {
    this.origin.copy(this.center());
    this.position.copy(this.shape.position);
    this.distance = this.separation();
    this.scale = this.shape.scale.x;
  }

  add(key: Key, point: THREE.Vector3) {
    if (this.points.size >= 2 || this.points.has(key)) return false;
    this.points.set(key, point);
    this.rebase();
    return true;
  }

  remove(key: Key) {
    if (!this.points.has(key)) return;
    this.points.delete(key);
    this.rebase();
  }

  update() {
    if (!this.points.size) return;
    this.shape.position.copy(this.position).add(this.center().sub(this.origin));
    if (this.points.size === 2 && this.distance > 0.0001) {
      this.shape.scale.setScalar(
        THREE.MathUtils.clamp(
          (this.scale * this.separation()) / this.distance,
          minScale,
          maxScale,
        ),
      );
    }
  }
}

export type InteractionView = {
  camera: THREE.PerspectiveCamera;
  // Normalized canvas bounds, with a top-left origin.
  bounds?: { x: number; y: number; width: number; height: number };
};

export function bindCanvasInteractions(
  canvas: HTMLCanvasElement,
  shapes: THREE.Object3D[],
  enabled: () => boolean,
  initialViews: InteractionView[] = [],
) {
  const states = new Map(
    shapes.map((shape) => [
      shape,
      {
        gesture: new DragGesture<number>(shape),
        plane: new THREE.Plane(),
        view: undefined as InteractionView | undefined,
      },
    ]),
  );
  const pointers = new Map<number, THREE.Object3D>();
  const raycaster = new THREE.Raycaster();
  let views = initialViews;

  const rayAt = (event: MouseEvent, view: InteractionView) => {
    const rect = canvas.getBoundingClientRect();
    const bounds = view.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    view.camera.updateMatrixWorld();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((x - bounds.x) / bounds.width) * 2 - 1,
        1 - ((y - bounds.y) / bounds.height) * 2,
      ),
      view.camera,
    );
    return { x, y };
  };
  const viewAt = (event: MouseEvent) =>
    views.find((view) => {
      const { x, y } = rayAt(event, view);
      const b = view.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
      return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
    });
  const down = (event: PointerEvent) => {
    if (!enabled() || event.button !== 0 || pointers.has(event.pointerId))
      return;
    const view = viewAt(event);
    if (!view) return;
    let shape = pickShape(raycaster, shapes);
    // A second finger on empty canvas may complete the only active pinch.
    if (!shape && event.pointerType === "touch" && pointers.size === 1)
      shape = pointers.values().next().value;
    if (!shape) return;
    const state = states.get(shape)!;
    if (!state.gesture.points.size) {
      state.view = view;
      state.plane.setFromNormalAndCoplanarPoint(
        view.camera.getWorldDirection(new THREE.Vector3()),
        shape.getWorldPosition(new THREE.Vector3()),
      );
    }
    rayAt(event, state.view!);
    const point = raycaster.ray.intersectPlane(
      state.plane,
      new THREE.Vector3(),
    );
    if (!point || !state.gesture.add(event.pointerId, point)) return;
    pointers.set(event.pointerId, shape);
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!enabled()) return reset();
    const shape = pointers.get(event.pointerId);
    if (!shape) return;
    const state = states.get(shape)!;
    const point = state.gesture.points.get(event.pointerId)!;
    rayAt(event, state.view!);
    if (raycaster.ray.intersectPlane(state.plane, point))
      state.gesture.update();
  };
  const up = (event: PointerEvent) => {
    const shape = pointers.get(event.pointerId);
    if (shape) {
      const state = states.get(shape)!;
      state.gesture.remove(event.pointerId);
      if (!state.gesture.points.size) state.view = undefined;
      pointers.delete(event.pointerId);
    }
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    if (!pointers.size) canvas.classList.remove("dragging");
  };
  const reset = () => {
    const ids = [...pointers.keys()];
    pointers.clear();
    for (const state of states.values()) {
      state.gesture.points.clear();
      state.gesture.rebase();
      state.view = undefined;
    }
    for (const id of ids)
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.classList.remove("dragging");
  };
  const wheel = (event: WheelEvent) => {
    if (!enabled() || !viewAt(event)) return;
    const shape = pickShape(raycaster, shapes);
    if (!shape) return;
    event.preventDefault();
    const pixels =
      event.deltaY *
      (event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? canvas.clientHeight
          : 1);
    shape.scale.setScalar(
      THREE.MathUtils.clamp(
        shape.scale.x * Math.exp(-pixels * 0.002),
        minScale,
        maxScale,
      ),
    );
    states.get(shape)!.gesture.rebase();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("blur", reset);
  return {
    setViews(next: InteractionView[]) {
      views = next;
    },
    reset,
  };
}

export function bindXRInteractions(
  session: XRSession,
  shapes: THREE.Object3D[],
  getReferenceSpace: () => XRReferenceSpace | null,
) {
  const states = new Map(
    shapes.map((shape) => [
      shape,
      {
        gesture: new DragGesture<XRInputSource>(shape),
        plane: new THREE.Plane(),
      },
    ]),
  );
  const sources = new Map<XRInputSource, THREE.Object3D>();
  const raycaster = new THREE.Raycaster();
  const gripSources = new Set<XRInputSource>();
  const setRay = (
    frame: XRFrame,
    source: XRInputSource,
    space: XRReferenceSpace,
  ) => {
    const pose = frame.getPose(source.targetRaySpace, space);
    if (!pose) return false;
    const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
    raycaster.ray.origin.setFromMatrixPosition(matrix);
    raycaster.ray.direction.set(0, 0, -1).transformDirection(matrix);
    return true;
  };
  const pointAt = (
    frame: XRFrame,
    source: XRInputSource,
    space: XRReferenceSpace,
  ) => {
    if (gripSources.has(source) && source.gripSpace) {
      const pose = frame.getPose(source.gripSpace, space);
      return pose
        ? new THREE.Vector3().setFromMatrixPosition(
            new THREE.Matrix4().fromArray(pose.transform.matrix),
          )
        : null;
    }
    if (!setRay(frame, source, space)) return null;
    const shape = sources.get(source);
    if (!shape) return null;
    return raycaster.ray.intersectPlane(
      states.get(shape)!.plane,
      new THREE.Vector3(),
    );
  };
  const start = (event: XRInputSourceEvent) => {
    const space = getReferenceSpace();
    const source = event.inputSource;
    if (!space || session.visibilityState !== "visible" || sources.has(source))
      return;
    if (!setRay(event.frame, source, space)) return;
    const shape = pickShape(raycaster, shapes);
    if (!shape) return;
    const { gesture, plane } = states.get(shape)!;
    if (gesture.points.size >= 2) return;
    if (!gesture.points.size) {
      plane.setFromNormalAndCoplanarPoint(
        raycaster.ray.direction,
        shape.getWorldPosition(new THREE.Vector3()),
      );
    }
    // Select with the pointing/gaze ray; move with the hand/controller grip.
    if (source.gripSpace && event.frame.getPose(source.gripSpace, space))
      gripSources.add(source);
    sources.set(source, shape);
    const point = pointAt(event.frame, source, space);
    if (point) gesture.add(source, point);
    else {
      sources.delete(source);
      gripSources.delete(source);
    }
  };
  const remove = (source: XRInputSource) => {
    const shape = sources.get(source);
    if (shape) states.get(shape)!.gesture.remove(source);
    sources.delete(source);
    gripSources.delete(source);
  };
  const end = (event: XRInputSourceEvent) => remove(event.inputSource);
  const changed = (event: XRInputSourcesChangeEvent) =>
    event.removed.forEach(remove);
  const reset = () => {
    sources.clear();
    gripSources.clear();
    for (const { gesture } of states.values()) {
      gesture.points.clear();
      gesture.rebase();
    }
  };
  const visibility = () => {
    if (session.visibilityState !== "visible") reset();
  };
  const dispose = () => {
    reset();
    session.removeEventListener("selectstart", start);
    session.removeEventListener("selectend", end);
    session.removeEventListener("inputsourceschange", changed);
    session.removeEventListener("visibilitychange", visibility);
  };
  session.addEventListener("selectstart", start);
  session.addEventListener("selectend", end);
  session.addEventListener("inputsourceschange", changed);
  session.addEventListener("visibilitychange", visibility);
  session.addEventListener("end", dispose, { once: true });
  return {
    update(frame: XRFrame) {
      const space = getReferenceSpace();
      if (!space || session.visibilityState !== "visible") return;
      for (const [source, shape] of [...sources]) {
        const { gesture } = states.get(shape)!;
        const point = pointAt(frame, source, space);
        if (!point) {
          remove(source);
          continue;
        }
        gesture.points.get(source)!.copy(point);
      }
      for (const { gesture } of states.values()) gesture.update();
    },
  };
}
