import { products } from './data/products';
import { ProductCard } from './components/ProductCard';
import "./MainPage.css";

export default function MainPage() {
  return (
    <div className="mainPage">
      <h1 className='heading' enable-xr>WebSpatial Store</h1>
      <main>
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </main>
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
      </footer>
    </div>
  );
}
