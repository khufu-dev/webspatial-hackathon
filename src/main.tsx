import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Enable spatial window styling
const html = document.documentElement;
html.classList.add("is-spatial");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
