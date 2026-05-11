const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = {
  _adminKey() { return localStorage.getItem('adminKey') || ''; },

  async _request(path, opts = {}) {
    const cacheKey = `api_cache_${path}`;
    if (opts.useCache) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < 60000) return data;
      }
    }
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (opts.admin) headers['x-admin-key'] = this._adminKey();
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (opts.useCache) {
      sessionStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
    }
    return data;
  },

  // Products
  getProducts(page, limit, admin = true, collectionId = '', search = '') {
    let url = `/products?admin=${admin}`;
    if (page) url += `&page=${page}`;
    if (limit) url += `&limit=${limit}`;
    if (collectionId) url += `&collectionId=${collectionId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this._request(url, { useCache: !admin });
  },
  searchProducts(query) { return this._request(`/products?admin=false&search=${encodeURIComponent(query)}`); },
  getProduct(id) { return this._request(`/products/${id}`); },
  getProductByHandle(handle) { return this._request(`/products/handle/${handle}`); },
  createProduct(d) { return this._request('/products', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateProduct(id, d) { return this._request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteProduct(id) { return this._request(`/products/${id}`, { method: 'DELETE', admin: true }); },
  deleteProductsBatch(productIds) { return this._request('/products/delete/batch', { method: 'POST', body: JSON.stringify({ productIds }), admin: true }); },
  deactivateProductsBatch(productIds) { return this._request('/products/deactivate/batch', { method: 'POST', body: JSON.stringify({ productIds }), admin: true }); },
  reorderProducts(order) { return this._request('/products/reorder/batch', { method: 'PUT', body: JSON.stringify({ order }), admin: true }); },

  // Collections
  getCollections() { return this._request('/collections', { useCache: true }); },
  getCollection(id) { return this._request(`/collections/${id}`); },
  createCollection(d) { return this._request('/collections', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateCollection(id, d) { return this._request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteCollection(id) { return this._request(`/collections/${id}`, { method: 'DELETE', admin: true }); },
  deleteCollectionsBatch(collectionIds) { return this._request('/collections/delete/batch', { method: 'POST', body: JSON.stringify({ collectionIds }), admin: true }); },

  // Orders
  createOrder(d) { return this._request('/orders', { method: 'POST', body: JSON.stringify(d) }); },
  getOrders(archived = false) { return this._request(`/orders?archived=${archived}`, { admin: true }); },
  getOrder(id) { return this._request(`/orders/${id}`, { admin: true }); },
  getPublicOrder(id) { return this._request(`/orders/public/${id}`); },
  updateOrder(id, d) { return this._request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteOrder(id) { return this._request(`/orders/${id}`, { method: 'DELETE', admin: true }); },
  archiveOrders(orderIds) { return this._request('/orders/archive/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },
  unarchiveOrders(orderIds) { return this._request('/orders/unarchive/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },
  cancelOrder(id) { return this._request(`/orders/${id}/cancel`, { method: 'POST', admin: true }); },
  cancelOrdersBatch(orderIds) { return this._request('/orders/cancel/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },
  deleteOrdersBatch(orderIds) { return this._request('/orders/delete/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },

  // Customers
  getCustomers() { return this._request('/customers', { admin: true }); },
  getCustomer(phone) { return this._request(`/customers/${phone}`, { admin: true }); },

  // Shipping
  getShipping() { return this._request('/shipping', { useCache: true }); },
  getShippingList() { return this._request('/shipping/list', { admin: true }); },
  updateShipping(id, d) { return this._request(`/shipping/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },

  // Webhooks
  getWebhooks() { return this._request('/webhooks', { admin: true }); },
  createWebhook(d) { return this._request('/webhooks', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateWebhook(id, d) { return this._request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteWebhook(id) { return this._request(`/webhooks/${id}`, { method: 'DELETE', admin: true }); },

  // Settings
  getSetting(key) { return this._request(`/settings/${key}`, { useCache: true }); },
  updateSetting(key, value) { return this._request(`/settings/${key}`, { method: 'POST', body: JSON.stringify({ value }), admin: true }); },

  // Auth
  async checkAdmin() {
    try { await this._request('/orders', { admin: true }); return true; }
    catch { return false; }
  },

  // File Upload
  uploadFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload`, true);
      xhr.setRequestHeader('x-admin-key', this._adminKey());
      if (onProgress && xhr.upload) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText).error)); } catch { reject(new Error('Upload failed')); }
        }
      };
      xhr.onerror = () => reject(new Error('Network Error'));
      const formData = new FormData();
      formData.append('image', file);
      xhr.send(formData);
    });
  }
};

export default api;
export function formatPrice(p) { return `${Number(p || 0).toLocaleString('ar-EG')} ج.م`; }
