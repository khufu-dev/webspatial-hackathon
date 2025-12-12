import { Link, useParams } from "react-router-dom";
import { products } from "./data/products";
import "./App.css";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="app">
        <h1>Product Not Found</h1>
        <p>The product you’re looking for doesn’t exist.</p>
        <Link to="/">Back to Store</Link>
      </div>
    );
  }

  //const modelUrl = (product as any).modelUrl as string | undefined;

  return (
    <div className="app">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          style={{ width: "100%", height: "auto" }}
        />

        <h1 className="product-name" style={{ marginTop: "1rem" }}>
          {product.name}
        </h1>
        <p className="product-price">
          ${product.price.toFixed(2)}
        </p>

        <h2 style={{ marginTop: "1rem" }}>Description</h2>
        <p className="product-description">{product.description}</p>

        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/">Back to Store</Link>
        </div>
      </div>
    </div>
  );
}
