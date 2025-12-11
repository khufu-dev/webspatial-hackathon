# WebSpatial XR App

A **WebSpatial** application for **Apple Vision Pro** and other XR devices, built with **React**, **TypeScript**, and **Vite**.

##  Getting Started

### **Install dependencies**

```bash
npm install
```

### **Start development server**

```bash
npm run dev
```

Runs on a local HTTPS server at:
**[https://localhost:5173/webspatial/avp/](https://localhost:5173/webspatial/avp/)**

### **Build for production**

```bash
npm run build
```

### **Preview production build**

```bash
npm run preview
```

### Run on Apple Vision Pro simulator

```bash
npm run dev
npm run avp
```

### **Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

---

## 📂 Project Structure

```
├── src/
│   ├── main.tsx                # App entry point with spatial setup
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Component styles
│   ├── index.css               # Global styles
│   └── utils/
│       └── xr.ts               # XR scene utilities
├── public/
│   └── manifest.webmanifest    # PWA + XR configuration
├── index.html
├── vite.config.ts
├── tsconfig.json
└── vercel.json
```


---

## Resources

* **WebSpatial Documentation**
* **Vite**
* **React**

---

## 📄 License

MIT

---
