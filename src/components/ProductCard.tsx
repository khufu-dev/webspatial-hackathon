import { Product } from "../types";
import { Link } from "react-router-dom";
import { AddToCart } from "./AddToCart";

interface ProductCardProps {
  product: Product;
}

function gotoPage(product: string) {
  window.open(`${__XR_ENV_BASE__}product/` + product, "product/" + product);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <Link to={"product/" + product.id} className="add-to-cart-btn">
        Go to product
      </Link>
      {
        //  <button onClick={() => gotoPage(product.id)} className="add-to-cart-btn">
        //  Go to product
        //</button>
      }
      <div style={{ marginTop: "1.5rem" }}>
        <AddToCart product={product.id} />
      </div>
    </div>
  );
}
