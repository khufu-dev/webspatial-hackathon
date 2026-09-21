import { Spatial } from "@webspatial/core-sdk";
import { SpatialBoot } from "@webspatial/react-sdk";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export function mountPage(page: ReactNode) {
  if (Spatial.prototype.runInSpatialWeb()) {
    document.documentElement.classList.add("isSpatial");
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <SpatialBoot>{page}</SpatialBoot>
    </StrictMode>,
  );
}
