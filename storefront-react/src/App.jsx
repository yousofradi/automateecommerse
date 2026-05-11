import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';

import Home from './pages/storefront/Home';
import Products from './pages/storefront/Products';
import ProductDetail from './pages/storefront/ProductDetail';
import Collection from './pages/storefront/Collection';
import Cart from './pages/storefront/Cart';
import Checkout from './pages/storefront/Checkout';
import OrderSuccess from './pages/storefront/OrderSuccess';

function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:idOrHandle" element={<ProductDetail />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </SettingsProvider>
  );
}

export default App;
