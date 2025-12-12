import { useCart } from "../context/CartContext.tsx";
import { Product } from "../types/index.ts";

interface ProductCardProps {
  product: Product;
}

export function AddToCart({ product }: ProductCardProps) {
  const addToCart = useCart();
  return (
    <button
      onClick={() => addToCart.addToCart(product)}
      className="add-to-cart-btn"
    >
      Add to Cart
    </button>
  );
}
