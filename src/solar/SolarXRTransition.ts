import * as THREE from "three/webgpu";

export type XRView = {
  focus: THREE.Vector3;
  placement: THREE.Vector3;
  scale: number;
  overviewScale: number;
};

const DURATION = 1.4;
const ease = (progress: number, start = 0, end = 1) =>
  THREE.MathUtils.smoothstep(progress, start, end);
const mixScale = (from: number, to: number, amount: number) =>
  Math.exp(THREE.MathUtils.lerp(Math.log(from), Math.log(to), amount));

// Animate the model, leaving the XR camera and its tracked pose untouched.
export function createSolarXRTransition(system: THREE.Group) {
  const focus = new THREE.Vector3();
  const placement = new THREE.Vector3();
  const fromFocus = new THREE.Vector3();
  const fromPlacement = new THREE.Vector3();
  let scale = 1;
  let fromScale = 1;
  let elapsed = DURATION;
  let initialized = false;

  const apply = () => {
    system.scale.setScalar(scale);
    system.position.copy(focus).multiplyScalar(-scale).add(placement);
  };
  const reset = (view: XRView) => {
    focus.copy(view.focus);
    placement.copy(view.placement);
    scale = view.scale;
    elapsed = DURATION;
    initialized = true;
    apply();
  };

  return {
    reset,
    start() {
      if (!initialized) return;
      // Reselecting mid-flight starts at the currently displayed transform.
      fromFocus.copy(focus);
      fromPlacement.copy(placement);
      fromScale = scale;
      elapsed = 0;
    },
    update(view: XRView, seconds: number, reducedMotion: boolean) {
      elapsed = Math.min(DURATION, elapsed + Math.max(0, seconds));
      if (!initialized || reducedMotion || elapsed >= DURATION) {
        reset(view);
        return;
      }
      const progress = elapsed / DURATION;
      // Pull back before panning, then approach the live destination. Keeping
      // the pan at overview scale also handles the huge true-scale distances.
      const travelScale = Math.min(fromScale, view.scale, view.overviewScale);
      scale =
        progress < 0.3
          ? mixScale(fromScale, travelScale, ease(progress, 0, 0.3))
          : mixScale(travelScale, view.scale, ease(progress, 0.7, 1));
      focus.lerpVectors(fromFocus, view.focus, ease(progress, 0.3, 0.7));
      placement.lerpVectors(fromPlacement, view.placement, ease(progress));
      apply();
    },
  };
}
