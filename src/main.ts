import { Spatial } from "@webspatial/core-sdk";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router";

if (Spatial.prototype.runInSpatialWeb()) {
  document.documentElement.classList.add("isSpatial");
}

createRoot(document.getElementById("root")!).render(createElement(Router));
