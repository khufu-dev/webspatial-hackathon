import { Link } from "react-router";
import Model3D from "./Model3D";
import { Product } from "../data/products";
import "./ProductCard.css";

export type ProductCardProps = { product: Product; }
export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`}>
        <Model3D
          className="product-3D"
          src={product.model}
          poster={product.image}
          alt={product.name}
        />
      </Link>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <div className="product-card-footer">
        <Link to={`/product/${product.id}`}>
          Go to product
        </Link>
      </div>
    </div>
  );
}
