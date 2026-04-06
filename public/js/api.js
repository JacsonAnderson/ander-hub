// js/api.js - Módulo de comunicación con el backend
const API = {
  baseUrl: '/api',
  token: localStorage.getItem('ander_token') || null,

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('ander_token', token);
    else localStorage.removeItem('ander_token');
  },

  getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  async request(method, path, body = null) {
    try {
      const opts = { method, headers: this.getHeaders() };
      if (body && method !== 'GET') opts.body = JSON.stringify(body);
      const res = await fetch(this.baseUrl + path, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          this.setToken(null);
          window.dispatchEvent(new Event('auth:expired'));
        }
        throw new Error(data.error || 'Error del servidor');
      }
      return data;
    } catch (err) {
      console.error(`API ${method} ${path}:`, err);
      throw err;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ===== AUTH =====
  auth: {
    login(username, password) { return API.post('/auth/login', { username, password }); },
    me() { return API.get('/auth/me'); },
    changePassword(currentPassword, newPassword) { return API.put('/auth/password', { currentPassword, newPassword }); },
  },

  // ===== PRODUCTS =====
  products: {
    list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return API.get('/products' + (q ? '?' + q : ''));
    },
    recent() { return API.get('/products/recent'); },
    categories() { return API.get('/products/categories'); },
    get(id) { return API.get(`/products/${id}`); },
    create(data) { return API.post('/products', data); },
    update(id, data) { return API.put(`/products/${id}`, data); },
    delete(id) { return API.del(`/products/${id}`); },
    // Imágenes
    images(id) { return API.get(`/products/${id}/images`); },
    addImageUrl(id, image_url, caption) { return API.post(`/products/${id}/images/url`, { image_url, caption }); },
    async uploadImage(id, file, caption) {
      const form = new FormData();
      form.append('image', file);
      if (caption) form.append('caption', caption);
      const headers = {};
      if (API.token) headers['Authorization'] = `Bearer ${API.token}`;
      const res = await fetch(`${API.baseUrl}/products/${id}/images/upload`, { method: 'POST', headers, body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al subir');
      return res.json();
    },
    setCover(productId, imageId) { return API.put(`/products/${productId}/images/${imageId}/cover`); },
    deleteImage(productId, imageId) { return API.del(`/products/${productId}/images/${imageId}`); },
  },

  // ===== SERVICES =====
  services: {
    list() { return API.get('/services'); },
    get(id) { return API.get(`/services/${id}`); },
    create(data) { return API.post('/services', data); },
    update(id, data) { return API.put(`/services/${id}`, data); },
    delete(id) { return API.del(`/services/${id}`); },
  },

  // ===== IPTV =====
  iptv: {
    list() { return API.get('/iptv'); },
    get(id) { return API.get(`/iptv/${id}`); },
    create(data) { return API.post('/iptv', data); },
    update(id, data) { return API.put(`/iptv/${id}`, data); },
    delete(id) { return API.del(`/iptv/${id}`); },
  },

  // ===== TOOLS =====
  tools: {
    list(limit) { return API.get('/tools' + (limit ? `?limit=${limit}` : '')); },
    get(id) { return API.get(`/tools/${id}`); },
    download(id) { return API.post(`/tools/${id}/download`); },
    create(data) { return API.post('/tools', data); },
    update(id, data) { return API.put(`/tools/${id}`, data); },
    delete(id) { return API.del(`/tools/${id}`); },
  },

  // ===== PROJECTS =====
  projects: {
    list(limit) { return API.get('/projects' + (limit ? `?limit=${limit}` : '')); },
    get(id) { return API.get(`/projects/${id}`); },
    create(data) { return API.post('/projects', data); },
    update(id, data) { return API.put(`/projects/${id}`, data); },
    delete(id) { return API.del(`/projects/${id}`); },
  },

  // ===== VIDEOS =====
  videos: {
    list(limit) { return API.get('/videos' + (limit ? `?limit=${limit}` : '')); },
    get(id) { return API.get(`/videos/${id}`); },
    create(data) { return API.post('/videos', data); },
    update(id, data) { return API.put(`/videos/${id}`, data); },
    delete(id) { return API.del(`/videos/${id}`); },
  },

  // ===== SOCIAL =====
  social: {
    list() { return API.get('/social'); },
    create(data) { return API.post('/social', data); },
    update(id, data) { return API.put(`/social/${id}`, data); },
    delete(id) { return API.del(`/social/${id}`); },
  },

  // ===== CLIENTS =====
  clients: {
    list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return API.get('/clients' + (q ? '?' + q : ''));
    },
    get(id) { return API.get(`/clients/${id}`); },
    create(data) { return API.post('/clients', data); },
    update(id, data) { return API.put(`/clients/${id}`, data); },
    delete(id) { return API.del(`/clients/${id}`); },
    documents(id) { return API.get(`/clients/${id}/documents`); },
    addDocument(id, data) { return API.post(`/clients/${id}/documents`, data); },
    deleteDocument(clientId, docId) { return API.del(`/clients/${clientId}/documents/${docId}`); },
  },

  // ===== PAYMENTS =====
  payments: {
    list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return API.get('/payments' + (q ? '?' + q : ''));
    },
    helpers() { return API.get('/payments/helpers'); },
    myOrders() { return API.get('/payments/my-orders'); },
    byClient(clientId) { return API.get(`/payments/by-client/${clientId}`); },
    dashboard(year) { return API.get(`/payments/dashboard${year ? '?year=' + year : ''}`); },
    get(id) { return API.get(`/payments/${id}`); },
    create(data) { return API.post('/payments', data); },
    update(id, data) { return API.put(`/payments/${id}`, data); },
    delete(id) { return API.del(`/payments/${id}`); },
    // Media
    media(id) { return API.get(`/payments/${id}/media`); },
    addMediaUrl(id, media_url, media_type, caption) { return API.post(`/payments/${id}/media/url`, { media_url, media_type, caption }); },
    async uploadMedia(id, file, caption) {
      const form = new FormData();
      form.append('media', file);
      if (caption) form.append('caption', caption);
      const headers = {};
      if (API.token) headers['Authorization'] = `Bearer ${API.token}`;
      const res = await fetch(`${API.baseUrl}/payments/${id}/media/upload`, { method: 'POST', headers, body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al subir');
      return res.json();
    },
    deleteMedia(paymentId, mediaId) { return API.del(`/payments/${paymentId}/media/${mediaId}`); },
  },

  // ===== CONFIG =====
  config: {
    get() { return API.get('/config'); },
    update(data) { return API.put('/config', data); },
  },
};
