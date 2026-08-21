import { StrictMode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import MainPage from "./MainPage";
import ProductPage from "./ProductPage";
import { SpatialBoot } from "@webspatial/react-sdk";

export default function Router() {
  return (
    <StrictMode>
      <SpatialBoot>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
          </Routes>
        </BrowserRouter>
      </SpatialBoot>
    </StrictMode>
  );
}
