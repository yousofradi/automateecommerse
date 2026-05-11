import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

function loadCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  catch { return []; }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const addToCart = (item) => {
    setCart(prev => {
      const key = `${item.productId}-${JSON.stringify(item.selectedOptions || [])}`;
      const existing = prev.find(i => `${i.productId}-${JSON.stringify(i.selectedOptions || [])}` === key);
      if (existing) {
        return prev.map(i => `${i.productId}-${JSON.stringify(i.selectedOptions || [])}` === key
          ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i);
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeFromCart = (index) => setCart(prev => prev.filter((_, i) => i !== index));
  const updateQuantity = (index, qty) => {
    if (qty < 1) return removeFromCart(index);
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
