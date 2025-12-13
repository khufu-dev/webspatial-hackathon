import { ProductList } from "./components/ProductList";
import { CartProvider } from "./context/CartContext";
import "./App.css";

declare const __XR_ENV_BASE__: string | undefined;

export default function MainPage() {
  return (
    <CartProvider>
      <div className="app">
        <header className="header">
          <h1>WebSpatial Store</h1>
          <p className="subtitle" style={{ color: "#CCCCCC" }}>
            Shop in immersive spatial reality
          </p>
        </header>

        <main className="main">
          <section className="products-section">
            <h2 style={{ color: "white" }}>Products</h2>
            <ProductList />
          </section>
        </main>

        <div className="card" style={{ marginTop: "0px" }}>
          <p>
            <button
              onClick={() => {
                window.open(`${__XR_ENV_BASE__}second-page`, "secondScene");
              }}
            >
              Open Second Page with a Button
            </button>
          </p>
        </div>

        <footer className="footer">
          <p>
            Built with{" "}
            <a
              href="https://webspatial.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              WebSpatial
            </a>{" "}
            + React
          </p>
        </footer>
      </div>
    </CartProvider>
  );
}
