import type { Product } from "../data/products";
import Model3D from "./Model3D";
import "./ProductCard.css";

export type ProductCardProps = { product: Product };
export function ProductCard({ product }: ProductCardProps) {
  const href = `/product.html?id=${encodeURIComponent(product.id)}`;
  return (
    <div className="product-card">
      <a href={href}>
        <Model3D
          className="product-3D"
          src={product.model}
          poster={product.image}
          alt={product.name}
          loading="lazy"
        />
      </a>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <div className="product-card-footer">
        <a href={href}>Go to product</a>
      </div>
    </div>
  );
}
