import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { MainPage } from "./MainPage";
import SecondPage from "./SecondPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Add a root route to prevent blank screen */}
        <Route path="/" element={<MainPage />} />

        <Route path="/main" element={<MainPage />} />
        <Route path="/second-page" element={<SecondPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
