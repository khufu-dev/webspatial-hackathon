import { initScene } from '@webspatial/react-sdk';

declare const __XR_ENV_BASE__: string | undefined;

export function buildXrUrl(route: string): string {
  const XR_BASE = (typeof __XR_ENV_BASE__ !== 'undefined' && __XR_ENV_BASE__) || '/';
  const base = XR_BASE.endsWith('/') ? XR_BASE.slice(0, -1) : XR_BASE;
  const path = route.startsWith('/') ? route.slice(1) : route;
  return `${base}/${path}`;
}

export function openScene(name: string, route: string, size?: { width: number; height: number }) {
  initScene(name, prev => ({ ...prev, ...(size ? { defaultSize: size } : {}) }));
  window.open(buildXrUrl(route), name);
}
