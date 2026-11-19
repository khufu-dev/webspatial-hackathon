import { useState } from "react";
import { ProductCard } from "./components/ProductCard";
import { products } from "./data/products";
import { mountPage } from "./mountPage";

const COUNT_OPTIONS = [1, 5, 10, 20];

export default function MainPage() {
  const [count, setCount] = useState<number>(COUNT_OPTIONS[2]);

  return (
    <>
      <header>
        <h1 enable-xr>WebSpatial Store</h1>
      </header>
      <main>
        {products.slice(0, count).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </main>
      <nav>
        <label>
          Page count:{" "}
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
            <option value={products.length}>All</option>
          </select>
        </label>
      </nav>
      <footer>
        Built with{" "}
        <a
          href="https://webspatial.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          WebSpatial
        </a>{" "}
        + React
        <p>
          <a href="./webxr.html">WebXR demo</a>
        </p>
      </footer>
    </>
  );
}

mountPage(<MainPage />);
