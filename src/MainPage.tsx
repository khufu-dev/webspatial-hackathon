import { products } from './data/products';
import { ProductCard } from './components/ProductCard';
import "./MainPage.css";

export default function MainPage() {
  return (
    <div className="mainPage">
      <header className="header">
        <h1>WebSpatial Store</h1>
        <p className="subtitle">
          Shop in immersive spatial reality
        </p>
      </header>

      <main className="main">
        <section className="products-section">
          <h2>Products</h2>
          <div className="product-list">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

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
  );
}
