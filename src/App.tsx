import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import MainPage from "./MainPage";
import ProductPage from "./ProductPage";

function App() {
  return (
    <BrowserRouter basename={__XR_ENV_BASE__}>
      <Routes>
        {/* Add a root route to prevent blank screen */}
        <Route path="/" element={<MainPage />} />
        {/* <Route path="/second-page" element={<SecondPage />} /> */}
        <Route path="/product/:id" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
