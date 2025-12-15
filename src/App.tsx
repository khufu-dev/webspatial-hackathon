import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainPage from "./MainPage";
import ProductPage from "./ProductPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  );
}
