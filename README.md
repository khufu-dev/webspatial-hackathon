# WebSpatial Hackathon

[WebSpatial Production](https://webspatial-hackathon.vercel.app)

A WebSpatial Hackathon application for visionOS and Pico OS 6, built with React, TypeScript, and Vite. This was built for the December 2025 Hackathon.

## Getting Started

```bash
# Install dependencies
npm install
# Start development server
npm run dev
```

### Run on Apple Vision Pro simulator

Run development server and the Vision Pro simulator

```bash
npm run dev
npm run avp
```

### Run on Pico OS 6 emulator

1. Run development server `npm run dev`
2. Open [Pico OS 6 emulator](https://developer.picoxr.com/document/spatial-toolkit/install-spatial-plugin/#9e29c5f8). Install Android Studio and Spatial Plugin to obtain Pico OS 6 emulator.
3. Inside the emulator navigate to http://10.0.2.2:5173 in the Browser
4. Click **Open as an app** in the URL bar

## Production

```bash
# Build for production
npm run build
# Preview production build
npm run preview
```

### **Deploy to Vercel**

Every commit on main is automatically deployed via [Vercel](https://vercel.com/khufu-devs-projects/webspatial-hackathon) to https://webspatial-hackathon.vercel.app.

## Solar observatory

Open `/webxr.html#solar-section` for section 5. Select the Sun or a planet using
the textured thumbnails, drag to orbit, scroll/pinch to zoom, and use the time
controls to pause, reverse, accelerate, or jump to a date. Playback starts at
**1 week / sec** (paused when reduced motion is preferred). **Now** restores
the current UTC time at real-time speed. The observatory fits the window height;
**Full screen** expands it to fill the screen.
**Explore** compresses distances and enlarges bodies; **True scale** uses
physical distances and radii. Use planet buttons to find bodies at true scale.

The scene uses Three.js WebGPU, a double-precision WebAssembly Kepler solver,
local Solar System Scope texture maps, and ESO/S. Brunier's Milky Way panorama.
Earth includes clouds, a sun-dependent night map, and an atmosphere; Saturn's
rings include the Cassini Division and an analytic planet shadow.

**Enter solar VR** requests `immersive-vr` with `local` reference space.
Browsers exposing `XRGPUBinding` use the required `webgpu` session feature;
other headsets use Three.js's WebGL backend for the same scene. Point and
select the Sun or planets directly, or open the floating **Planets** menu for
textured destination buttons. **Time speed** offers the same rates as the page,
including reverse, real time, and **1 week / sec**. Options highlight the current
selection and close when chosen; selecting a menu button again dismisses it.
Changing speed preserves the pause state. Overview, Pause / play, and Exit VR
remain available, and changes carry back to the page.
A badge below the VR controls shows the active **WebGPU** or **WebGL** renderer.
Switching between destinations animates a pullback, pan, and approach over
1.4 seconds, including while playback is paused. Head tracking stays independent;
reduced-motion preferences make destination changes immediate.
Immersive sessions are coordinated with sections 2–4. HTTPS or
localhost and a compatible headset/browser are required.

JPL's approximate 1800–2050 elements include eccentricity, inclination and
secular rates. Earth uses the Earth–Moon barycenter. UTC approximates TDB;
moons, perturbations, exact pole directions and rotational phase are outside
this educational model. Source credits and display-scale details are on the
page and in [the texture manifest notes](public/solar/README.md).

```bash
npm run build:wasm  # Rebuild src/solar/orbits.wasm from its readable WAT source
npm run test:solar  # Orbits, VR menus/transitions, time, assets (Node 22.6+)
npm run build      # Rebuilds WASM, checks TypeScript, builds all pages
```

Texture assets and the 349-byte WASM binary are checked in, so development
requires neither a C/Rust toolchain nor runtime access to texture hosts.
