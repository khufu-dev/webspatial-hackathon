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
