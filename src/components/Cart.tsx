import { useCart } from '../context/CartContext';
import "./Cart.css"

export function Cart() {
  const { items, removeFromCart, clearCart, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="cart">
        <h2>Cart</h2>
        <p className="cart-empty">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="cart">
      <h2>Cart</h2>
      <ul className="cart-items">
        {items.map(item => (
          <li key={item.product.id} className="cart-item">
            <span className="cart-item-name">
              {item.product.name} x {item.quantity}
            </span>
            <span className="cart-item-price">
              ${(item.product.price * item.quantity).toFixed(2)}
            </span>
            <button
              onClick={() => removeFromCart(item.product.id)}
              className="cart-item-remove"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <strong>Total: ${total.toFixed(2)}</strong>
      </div>
      <button onClick={clearCart} className="clear-cart-btn">
        Clear Cart
      </button>
    </div>
  );
}
