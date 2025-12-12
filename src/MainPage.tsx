import { Cart } from "./components/Cart";
import { ProductList } from "./components/ProductList";
import { CartProvider } from "./context/CartContext";
import "./MainPage.css"

export default function MainPage() {
  return (
    <CartProvider>
      <div className="app">
        <header className="header">
          <h1>WebSpatial Store</h1>
          <p className="subtitle">Shop in immersive spatial reality</p>
        </header>

        <main className="main">
          <section className="products-section">
            <h2>Products</h2>
            <ProductList />
          </section>

          <aside className="cart-section">
            <Cart />
          </aside>
        </main>
        <footer>
          <p>
            Built with{" "}
            <a href="https://webspatial.dev" target="_blank" rel="noopener noreferrer">
              WebSpatial
            </a> + React
          </p>
        </footer>
      </div>
    </CartProvider>
  );
}
