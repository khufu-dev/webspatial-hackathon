import { Product } from "../types";
import { useCart } from "../context/CartContext";

interface ProductCardProps {
  product: Product;
}

function gotoPage(product: string) {
  window.open(`${__XR_ENV_BASE__}product/` + product, "product/" + product);
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <button onClick={() => gotoPage(product.id)} className="add-to-cart-btn">
        Go to product
      </button>
      <button onClick={() => addToCart(product)} className="add-to-cart-btn">
        Add to Cart
      </button>
    </div>
  );
}
