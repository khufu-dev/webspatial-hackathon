import { Link } from "react-router-dom";
import Model3D from "./Model3D";
import { Product } from "../data/products";
import "./ProductCart.css";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <Model3D className="product-3D" {...product} src={product.model} />
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
