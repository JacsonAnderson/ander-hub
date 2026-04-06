// js/admin.js - Módulo del panel administrativo
const Admin = {
  currentSection: 'dash',
  formType: null,
  formEditId: null,

  // ===== FORMS CONFIG =====
  FORMS: {
    product: {
      title: 'Producto',
      fields: [
        { label: 'Nombre del Producto', id: 'name', type: 'text' },
        { label: 'Categoría', id: 'category', type: 'text' },
        { label: 'Descripción Corta', id: 'description', type: 'textarea' },
        { label: 'Descripción Larga (detalle)', id: 'long_description', type: 'textarea' },
        { label: 'Especificaciones (una por línea, formato Clave: Valor)', id: 'specsStr', type: 'textarea' },
        { label: 'Emoji/Ícono', id: 'emoji', type: 'text', placeholder: '💻' },
        { label: 'Precio de Costo (₲)', id: 'cost_price', type: 'number' },
        { label: 'Precio de Venta (₲)', id: 'sale_price', type: 'number' },
        { label: 'Link de Compra', id: 'purchase_link', type: 'text' }
      ]
    },
    service: {
      title: 'Servicio',
      fields: [
        { label: 'Nombre del Servicio', id: 'name', type: 'text' },
        { label: 'Ícono FontAwesome (ej: fa-camera)', id: 'icon', type: 'text' },
        { label: 'Descripción', id: 'description', type: 'textarea' },
        { label: 'Características (separadas por coma)', id: 'featuresStr', type: 'text' }
      ]
    },
    iptv: {
      title: 'Plan IPTV',
      fields: [
        { label: 'Nombre del Plan', id: 'name', type: 'text' },
        { label: 'Precio (₲)', id: 'price', type: 'text' },
        { label: 'Canales', id: 'channels', type: 'text' },
        { label: 'VOD (películas/series)', id: 'vod', type: 'text' },
        { label: 'Conexiones simultáneas', id: 'connections', type: 'text' },
        { label: '¿Plan destacado?', id: 'featured', type: 'select', options: ['false', 'true'] }
      ]
    },
    tool: {
      title: 'Herramienta',
      fields: [
        { label: 'Nombre', id: 'name', type: 'text' },
        { label: 'Ícono FontAwesome', id: 'icon', type: 'text' },
        { label: 'Descripción', id: 'description', type: 'textarea' },
        { label: 'Tipo de archivo', id: 'file_type', type: 'text' },
        { label: 'Tamaño', id: 'file_size', type: 'text' },
        { label: 'Link Google Drive', id: 'download_link', type: 'text' }
      ]
    },
    project: {
      title: 'Proyecto',
      fields: [
        { label: 'Nombre del Proyecto', id: 'name', type: 'text' },
        { label: 'Etiqueta (ej: Sistema Web)', id: 'tag', type: 'text' },
        { label: 'Color de acento (ej: #00c8ff)', id: 'color', type: 'text' },
        { label: 'Descripción', id: 'description', type: 'textarea' },
        { label: 'Tecnologías (separadas por coma)', id: 'techStr', type: 'text' },
        { label: 'Link Demo', id: 'demo_link', type: 'text' },
        { label: 'Link GitHub', id: 'code_link', type: 'text' }
      ]
    },
    video: {
      title: 'Video',
      fields: [
        { label: 'Título del Video', id: 'name', type: 'text' },
        { label: 'Categoría', id: 'category', type: 'text' },
        { label: 'Descripción', id: 'description', type: 'textarea' },
        { label: 'Link YouTube/Vimeo', id: 'video_link', type: 'text' }
      ]
    },
    client: {
      title: 'Cliente',
      fields: [
        { label: 'Nombre Completo', id: 'name', type: 'text' },
        { label: 'Usuario (para login)', id: 'username', type: 'text' },
        { label: 'Contraseña', id: 'password', type: 'password' },
        { label: 'Teléfono/WhatsApp', id: 'phone', type: 'text' },
        { label: 'Email', id: 'email', type: 'email' },
        { label: 'Ciudad', id: 'city', type: 'text' },
        { label: 'Tipo', id: 'type', type: 'select', options: ['Cliente', 'VIP', 'Empresa'] },
        { label: 'Notas', id: 'notes', type: 'textarea' }
      ]
    },
    payment: {
      title: 'Pago / Trabajo',
      fields: [
        { label: 'Fecha', id: 'payment_date', type: 'date' },
        { label: 'Cliente', id: 'client_id', type: 'dynamic_select', source: 'clients' },
        { label: 'Servicio', id: 'service_id', type: 'dynamic_select', source: 'services' },
        { label: 'Producto (si es venta)', id: 'product_id', type: 'dynamic_select', source: 'products' },
        { label: 'Concepto personalizado', id: 'concept', type: 'text', placeholder: 'Solo si no selecciona servicio/producto' },
        { label: 'Precio de Costo (₲)', id: 'cost_price', type: 'number' },
        { label: 'Precio de Venta (₲)', id: 'sale_price', type: 'number' },
        { label: 'Estado de pago', id: 'status', type: 'select', options: ['Pagado', 'Pendiente', 'Cancelado'] },
        { label: 'Estado de entrega', id: 'delivery_status', type: 'select', options: ['', 'Pedido realizado', 'En camino', 'En aduana', 'Listo para retirar', 'Entregado'] },
        { label: 'Notas', id: 'notes', type: 'textarea' }
      ]
    },
    document: {
      title: 'Documento',
      fields: [
        { label: 'Nombre del Documento', id: 'name', type: 'text' },
        { label: 'Descripción', id: 'description', type: 'textarea' },
        { label: 'Link Google Drive', id: 'drive_link', type: 'text' },
        { label: 'Tipo', id: 'doc_type', type: 'select', options: ['general', 'factura', 'contrato', 'manual', 'otro'] }
      ]
    }
  },

  // ===== PANEL CONTROL =====
  open() {
    if (!Auth.isAdmin) { Utils.toast('Acceso denegado.', 'error'); return; }
    document.getElementById('admin-panel')?.classList.add('show');
    document.body.style.overflow = 'hidden';
    this.loadDashboard();
    this.loadAllLists();
  },

  close() {
    document.getElementById('admin-panel')?.classList.remove('show');
    document.body.style.overflow = '';
  },

  showSection(name, el) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('show'));
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(name + '-section')?.classList.add('show');
    if (el) el.classList.add('active');
    this.currentSection = name;
    const titles = {
      dash: 'Dashboard', clientes: 'Clientes', pagos: 'Pagos & Ganancias',
      'admin-productos': 'Productos', 'admin-servicios': 'Servicios', 'admin-iptv': 'IPTV',
      'admin-tools': 'Herramientas', 'admin-proyectos': 'Proyectos', 'admin-videos': 'Videos',
      config: 'Configuración'
    };
    const topbar = document.getElementById('admin-topbar-title');
    if (topbar) topbar.textContent = titles[name] || name;
  },

  // ===== DASHBOARD =====
  async loadDashboard() {
    try {
      const data = await API.payments.dashboard();
      // Stats cards
      document.getElementById('dash-total-gs').textContent = '₲ ' + Utils.formatGs(data.totals.total_profit);
      document.getElementById('dash-clients-count').textContent = data.counts.clients;
      document.getElementById('dash-services-count').textContent = data.totals.total_transactions;
      document.getElementById('dash-products-count').textContent = data.counts.products;
      // Earnings display
      const earningsEl = document.getElementById('total-earnings-display');
      const earningsUsd = document.getElementById('total-earnings-usd');
      if (earningsEl) earningsEl.textContent = '₲ ' + Utils.formatGs(data.totals.total_profit);
      if (earningsUsd) earningsUsd.textContent = '≈ USD ' + (data.totals.total_profit / 7500).toFixed(2);
      // Bar chart
      this.renderBarChart(data.monthlyData);
      // Recent payments table
      this.renderRecentPayments(data.recentPayments);
      // Date
      const dateEl = document.getElementById('admin-date-display');
      if (dateEl) dateEl.textContent = Utils.getSpanishDate();
    } catch (err) { console.error('Dashboard error:', err); }
  },

  renderBarChart(monthlyData) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const max = Math.max(...monthlyData.map(m => m.profit), 1);
    const el = document.getElementById('bar-chart');
    if (!el) return;
    el.innerHTML = months.map((m, i) => {
      const profit = monthlyData[i]?.profit || 0;
      const h = Math.round((profit / max) * 90);
      return `<div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${Math.max(h, 2)}px;" title="₲ ${Utils.formatGs(profit)}"></div>
        <div class="chart-bar-label">${m}</div>
      </div>`;
    }).join('');
  },

  renderRecentPayments(payments) {
    const tbody = document.getElementById('dash-payments-tbody');
    if (!tbody) return;
    tbody.innerHTML = payments.length ? payments.map(p => `<tr>
      <td>${p.client_name || '—'}</td>
      <td>${p.concept}</td>
      <td style="color:var(--accent3);font-weight:700;">₲ ${Utils.formatGs(p.sale_price)}</td>
      <td><span class="badge badge-${p.status === 'Pagado' ? 'green' : 'orange'}">${p.status}</span></td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);">Sin registros</td></tr>';
  },

  // ===== LOAD ALL ADMIN LISTS =====
  async loadAllLists() {
    await Promise.all([
      this.loadAdminList('products', 'admin-products-list', p => p.emoji + ' ' + p.name, p => p.category),
      this.loadAdminList('services', 'admin-services-list', s => s.name, s => (s.description || '').substring(0, 50) + '...'),
      this.loadAdminList('iptv', 'admin-iptv-list', p => p.name, p => `₲ ${p.price}/${p.period}`),
      this.loadAdminList('tools', 'admin-tools-list', t => t.name, t => `${t.file_type} · ${t.file_size}`),
      this.loadAdminList('projects', 'admin-projects-list', p => p.name, p => p.tag),
      this.loadAdminList('videos', 'admin-videos-list', v => v.name, v => v.category),
      this.loadClients(),
      this.loadPayments()
    ]);
  },

  async loadAdminList(type, elementId, nameFunc, metaFunc) {
    try {
      let items;
      switch (type) {
        case 'products': items = (await API.products.list()).data; break;
        case 'services': items = await API.services.list(); break;
        case 'iptv': items = await API.iptv.list(); break;
        case 'tools': items = await API.tools.list(); break;
        case 'projects': items = await API.projects.list(); break;
        case 'videos': items = await API.videos.list(); break;
        default: items = [];
      }
      const el = document.getElementById(elementId);
      if (!el) return;
      const singularType = type.replace(/s$/, '').replace('iptv', 'iptv');
      const apiType = type;
      el.innerHTML = items.length ? items.map(item => `<div class="admin-item-card">
        <div class="admin-item-card-icon"><i class="fas ${item.icon || 'fa-cube'}"></i></div>
        <div class="admin-item-card-info">
          <div class="admin-item-card-name">${nameFunc(item)}</div>
          <div class="admin-item-card-meta">${metaFunc(item)}</div>
        </div>
        <div class="admin-item-card-actions">
          <button class="btn-edit" onclick="Admin.openForm('${singularType}', ${item.id})"><i class="fas fa-edit"></i></button>
          <button class="btn-del" onclick="Admin.deleteItem('${apiType}', ${item.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('') : '<p style="color:var(--text3);padding:12px;">Sin elementos.</p>';
    } catch (err) { console.error(`Error loading ${type}:`, err); }
  },

  // ===== CLIENTS =====
  async loadClients() {
    try {
      const clients = await API.clients.list();
      const tbody = document.getElementById('clients-tbody');
      if (!tbody) return;
      tbody.innerHTML = clients.length ? clients.map(c => `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.city || '—'}</td>
        <td><span class="badge badge-blue">${c.type || 'Cliente'}</span></td>
        <td style="font-size:12px;color:var(--text3);">${Utils.formatDate(c.created_at)}</td>
        <td style="white-space:nowrap;">
          <button class="btn-edit" onclick="Admin.showClientHistory(${c.id})" title="Ver historial" style="margin-right:4px;background:rgba(0,255,153,0.1);color:var(--accent3);"><i class="fas fa-history"></i></button>
          <button class="btn-edit" onclick="Admin.openForm('client', ${c.id})" style="margin-right:4px;"><i class="fas fa-edit"></i></button>
          <button class="btn-del" onclick="Admin.deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text3);">Sin clientes</td></tr>';
    } catch (err) { console.error('Error loading clients:', err); }
  },

  async deleteClient(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await API.clients.delete(id);
      Utils.toast('Cliente eliminado', 'warning');
      this.loadClients();
      this.loadDashboard();
    } catch (err) { Utils.toast('Error al eliminar', 'error'); }
  },

  filterClients() {
    const q = document.getElementById('client-search')?.value.toLowerCase() || '';
    document.querySelectorAll('#clients-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  // ===== PAYMENTS =====
  async loadPayments() {
    try {
      const payments = await API.payments.list();
      const tbody = document.getElementById('payments-tbody');
      if (!tbody) return;
      tbody.innerHTML = payments.length ? payments.map(p => {
        const profit = (p.sale_price || 0) - (p.cost_price || 0);
        const mediaBadge = p.media_count > 0 ? `<span class="badge badge-blue" style="margin-left:4px;" title="${p.media_count} archivos"><i class="fas fa-camera"></i> ${p.media_count}</span>` : '';
        const deliveryBadge = p.delivery_status ? `<span class="badge badge-${p.delivery_status === 'Entregado' ? 'green' : 'orange'}" style="margin-left:4px;"><i class="fas fa-truck"></i> ${p.delivery_status}</span>` : '';
        const conceptText = p.product_name ? `📦 ${p.product_name}` : (p.service_name || p.concept || '—');
        return `<tr>
          <td>${p.payment_date || '—'}</td>
          <td>${p.client_name || '—'}</td>
          <td>${conceptText}${mediaBadge}${deliveryBadge}</td>
          <td style="color:var(--text2);">₲ ${Utils.formatGs(p.cost_price)}</td>
          <td style="color:var(--accent3);font-weight:700;">₲ ${Utils.formatGs(p.sale_price)}</td>
          <td style="color:var(--accent3);font-weight:700;">₲ ${Utils.formatGs(profit)}</td>
          <td><span class="badge badge-${p.status === 'Pagado' ? 'green' : p.status === 'Cancelado' ? 'red' : 'orange'}">${p.status}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-edit" onclick="Admin.openForm('payment', ${p.id})" style="margin-right:4px;" title="Editar / Agregar fotos"><i class="fas fa-edit"></i></button>
            <button class="btn-del" onclick="Admin.deletePayment(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
      }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text3);">Sin pagos</td></tr>';
    } catch (err) { console.error('Error loading payments:', err); }
  },

  async deletePayment(id) {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      await API.payments.delete(id);
      Utils.toast('Pago eliminado', 'warning');
      this.loadPayments();
      this.loadDashboard();
    } catch (err) { Utils.toast('Error al eliminar', 'error'); }
  },

  // ===== DELETE GENERIC ITEM =====
  async deleteItem(type, id) {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      await API[type].delete(id);
      Utils.toast('Elemento eliminado', 'warning');
      this.loadAllLists();
      this.loadDashboard();
      Render.all(); // Refresh public view
    } catch (err) { Utils.toast('Error al eliminar', 'error'); }
  },

  // ===== ADMIN FORM =====
  async openForm(type, editId = null) {
    const form = this.FORMS[type];
    if (!form) return;
    this.formType = type;
    this.formEditId = editId;
    document.getElementById('admin-form-title').textContent = (editId ? 'Editar ' : 'Agregar ') + form.title;
    // Re-mostrar botón Guardar (puede estar oculto por showClientHistory)
    document.querySelector('#modal-admin-form .btn-submit')?.setAttribute('style', '');

    let existing = null;
    if (editId) {
      try {
        const apiMap = { product: 'products', service: 'services', iptv: 'iptv', tool: 'tools', project: 'projects', video: 'videos', client: 'clients', payment: 'payments' };
        existing = await API[apiMap[type]].get(editId);
        if (type === 'service') existing.featuresStr = (existing.features || []).join(', ');
        if (type === 'project') existing.techStr = (existing.technologies || []).join(', ');
        if (type === 'product') existing.specsStr = (existing.specifications || []).join('\n');
        if (type === 'iptv') existing.featured = String(!!existing.featured);
      } catch { existing = null; }
    }

    // Load helpers for dynamic selects (payment form)
    let helpers = null;
    if (type === 'payment') {
      try { helpers = await API.payments.helpers(); } catch { helpers = { clients: [], services: [] }; }
    }

    document.getElementById('admin-form-body').innerHTML = form.fields.map(f => {
      const val = existing ? (existing[f.id] || '') : (f.type === 'date' ? Utils.todayISO() : '');
      if (f.type === 'textarea') return `<div class="form-group"><label class="form-label">${f.label}</label><textarea id="af-${f.id}" placeholder="${f.placeholder || f.label}">${val}</textarea></div>`;
      if (f.type === 'select') return `<div class="form-group"><label class="form-label">${f.label}</label><select id="af-${f.id}">${f.options.map(o => `<option value="${o}" ${String(val) == o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
      if (f.type === 'dynamic_select' && helpers) {
        const items = helpers[f.source] || [];
        let optionsHtml = '';
        let placeholder = 'elemento';
        if (f.source === 'clients') {
          placeholder = 'cliente';
          optionsHtml = items.map(c => `<option value="${c.id}" ${val == c.id ? 'selected' : ''}>${c.name} ${c.phone ? '(' + c.phone + ')' : ''} ${c.city ? '- ' + c.city : ''}</option>`).join('');
        } else if (f.source === 'products') {
          placeholder = 'producto';
          optionsHtml = items.map(p => `<option value="${p.id}" ${val == p.id ? 'selected' : ''}>${p.emoji || '📦'} ${p.name} [${p.category || ''}]</option>`).join('');
        } else {
          placeholder = 'servicio';
          optionsHtml = items.map(s => `<option value="${s.id}" ${val == s.id ? 'selected' : ''}>${s.name}</option>`).join('');
        }
        return `<div class="form-group"><label class="form-label">${f.label}</label><select id="af-${f.id}"><option value="">— Seleccionar ${placeholder} —</option>${optionsHtml}</select></div>`;
      }
      if (f.type === 'dynamic_select') {
        return `<div class="form-group"><label class="form-label">${f.label}</label><select id="af-${f.id}" disabled><option>Cargando...</option></select></div>`;
      }
      return `<div class="form-group"><label class="form-label">${f.label}</label><input type="${f.type}" id="af-${f.id}" value="${val}" placeholder="${f.placeholder || f.label}"></div>`;
    }).join('');

    Utils.openModal('modal-admin-form');

    // Si es producto en edición, mostrar gestor de imágenes
    if (type === 'product' && editId) {
      this.loadProductImages(editId);
    }
    // Si es pago en edición, mostrar gestor de media
    if (type === 'payment' && editId) {
      this.loadPaymentMedia(editId);
    }
  },

  // ===== IMAGE MANAGER (productos) =====
  async loadProductImages(productId) {
    try {
      const images = await API.products.images(productId);
      const container = document.getElementById('admin-form-body');
      if (!container) return;
      container.insertAdjacentHTML('beforeend', `
        <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border2);">
          <h4 style="font-family:var(--font-head); font-size:14px; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-images" style="color:var(--accent);"></i> Galería de Imágenes
          </h4>
          <div class="admin-img-grid" id="admin-prod-images">
            ${images.length ? images.map(img => `
              <div class="admin-img-item">
                ${img.is_cover ? '<div class="img-cover-badge">PORTADA</div>' : ''}
                <img src="${img.url}" alt="" loading="lazy">
                <div class="img-actions">
                  ${!img.is_cover ? `<button class="btn-edit" style="width:24px;height:24px;font-size:10px;" onclick="Admin.setImageCover(${productId}, ${img.id})" title="Marcar como portada"><i class="fas fa-star"></i></button>` : ''}
                  <button class="btn-del" style="width:24px;height:24px;font-size:10px;" onclick="Admin.deleteProductImage(${productId}, ${img.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            `).join('') : '<p style="color:var(--text3); font-size:12px;">Sin imágenes aún.</p>'}
          </div>
          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
              <input type="text" id="img-url-input" placeholder="Pegar URL de imagen..." style="font-size:12px;">
            </div>
            <button class="btn-add" style="font-size:12px; padding:8px 14px;" onclick="Admin.addProductImageUrl(${productId})">
              <i class="fas fa-link"></i> Agregar URL
            </button>
            <label class="btn-add" style="font-size:12px; padding:8px 14px; cursor:pointer;">
              <i class="fas fa-upload"></i> Subir Archivo
              <input type="file" accept="image/*" style="display:none;" onchange="Admin.uploadProductImage(${productId}, this.files[0])">
            </label>
          </div>
        </div>
      `);
    } catch (err) { console.error('Error loading images:', err); }
  },

  async addProductImageUrl(productId) {
    const input = document.getElementById('img-url-input');
    if (!input || !input.value.trim()) { Utils.toast('Ingresa una URL', 'error'); return; }
    try {
      await API.products.addImageUrl(productId, input.value.trim());
      input.value = '';
      Utils.toast('Imagen agregada', 'success');
      // Recargar imágenes
      document.querySelector('.admin-img-grid')?.parentElement?.parentElement?.remove();
      this.loadProductImages(productId);
      Render.all();
    } catch (err) { Utils.toast('Error al agregar imagen', 'error'); }
  },

  async uploadProductImage(productId, file) {
    if (!file) return;
    try {
      Utils.toast('Subiendo imagen...', 'success');
      await API.products.uploadImage(productId, file);
      Utils.toast('Imagen subida', 'success');
      document.querySelector('.admin-img-grid')?.parentElement?.parentElement?.remove();
      this.loadProductImages(productId);
      Render.all();
    } catch (err) { Utils.toast('Error al subir imagen', 'error'); }
  },

  async setImageCover(productId, imageId) {
    try {
      await API.products.setCover(productId, imageId);
      Utils.toast('Portada actualizada', 'success');
      document.querySelector('.admin-img-grid')?.parentElement?.parentElement?.remove();
      this.loadProductImages(productId);
      Render.all();
    } catch (err) { Utils.toast('Error', 'error'); }
  },

  async deleteProductImage(productId, imageId) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await API.products.deleteImage(productId, imageId);
      Utils.toast('Imagen eliminada', 'warning');
      document.querySelector('.admin-img-grid')?.parentElement?.parentElement?.remove();
      this.loadProductImages(productId);
      Render.all();
    } catch (err) { Utils.toast('Error al eliminar', 'error'); }
  },

  // ===== PAYMENT MEDIA MANAGER =====
  async loadPaymentMedia(paymentId) {
    try {
      const media = await API.payments.media(paymentId);
      const container = document.getElementById('admin-form-body');
      if (!container) return;
      container.insertAdjacentHTML('beforeend', `
        <div id="payment-media-section" style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border2);">
          <h4 style="font-family:var(--font-head); font-size:14px; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-photo-video" style="color:var(--accent);"></i> Fotos y Videos del Trabajo
          </h4>
          <div class="admin-img-grid" id="admin-pay-media">
            ${media.length ? media.map(m => `
              <div class="admin-img-item">
                <div class="img-cover-badge" style="background:${m.media_type === 'video' ? 'var(--red)' : 'var(--accent)'};">${m.media_type === 'video' ? '🎬 VIDEO' : '📷 FOTO'}</div>
                ${m.media_type === 'video'
                  ? `<video src="${m.url}" style="width:100%;height:100%;object-fit:cover;" muted></video>`
                  : `<img src="${m.url}" alt="" loading="lazy">`}
                <div class="img-actions">
                  <button class="btn-del" style="width:24px;height:24px;font-size:10px;" onclick="Admin.deletePaymentMedia(${paymentId}, ${m.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            `).join('') : '<p style="color:var(--text3); font-size:12px;">Sin fotos/videos aún.</p>'}
          </div>
          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px;">
              <input type="text" id="pay-media-url-input" placeholder="Pegar URL de imagen o video..." style="font-size:12px;">
            </div>
            <select id="pay-media-type-select" style="width:auto; min-width:100px; font-size:12px;">
              <option value="image">Imagen</option>
              <option value="video">Video</option>
            </select>
            <button class="btn-add" style="font-size:12px; padding:8px 14px;" onclick="Admin.addPaymentMediaUrl(${paymentId})">
              <i class="fas fa-link"></i> Agregar URL
            </button>
            <label class="btn-add" style="font-size:12px; padding:8px 14px; cursor:pointer;">
              <i class="fas fa-upload"></i> Subir Archivo
              <input type="file" accept="image/*,video/*" style="display:none;" onchange="Admin.uploadPaymentMedia(${paymentId}, this.files[0])">
            </label>
          </div>
          <p style="font-size:11px; color:var(--text3); margin-top:8px;"><i class="fas fa-info-circle"></i> El cliente podrá ver estas fotos/videos en su panel "Mis Pedidos".</p>
        </div>
      `);
    } catch (err) { console.error('Error loading payment media:', err); }
  },

  async addPaymentMediaUrl(paymentId) {
    const urlInput = document.getElementById('pay-media-url-input');
    const typeSelect = document.getElementById('pay-media-type-select');
    if (!urlInput || !urlInput.value.trim()) { Utils.toast('Ingresa una URL', 'error'); return; }
    try {
      await API.payments.addMediaUrl(paymentId, urlInput.value.trim(), typeSelect?.value || 'image');
      urlInput.value = '';
      Utils.toast('Media agregada', 'success');
      document.getElementById('payment-media-section')?.remove();
      this.loadPaymentMedia(paymentId);
    } catch (err) { Utils.toast('Error al agregar', 'error'); }
  },

  async uploadPaymentMedia(paymentId, file) {
    if (!file) return;
    try {
      Utils.toast('Subiendo archivo...', 'success');
      await API.payments.uploadMedia(paymentId, file);
      Utils.toast('Archivo subido', 'success');
      document.getElementById('payment-media-section')?.remove();
      this.loadPaymentMedia(paymentId);
    } catch (err) { Utils.toast('Error al subir', 'error'); }
  },

  async deletePaymentMedia(paymentId, mediaId) {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      await API.payments.deleteMedia(paymentId, mediaId);
      Utils.toast('Media eliminada', 'warning');
      document.getElementById('payment-media-section')?.remove();
      this.loadPaymentMedia(paymentId);
    } catch (err) { Utils.toast('Error al eliminar', 'error'); }
  },

  // ===== CLIENT HISTORY (ver trabajos de un cliente) =====
  async showClientHistory(clientId) {
    try {
      const payments = await API.payments.byClient(clientId);
      const client = await API.clients.get(clientId);
      const body = document.getElementById('admin-form-body');
      const titleEl = document.getElementById('admin-form-title');
      if (!body || !titleEl) return;
      this.formType = null;
      this.formEditId = null;
      titleEl.innerHTML = `<i class="fas fa-history" style="color:var(--accent);margin-right:8px;"></i>Historial de ${client.name}`;

      body.innerHTML = payments.length ? payments.map(p => {
        const profit = (p.sale_price || 0) - (p.cost_price || 0);
        const mediaHtml = p.media && p.media.length ? `
          <div style="display:flex; gap:6px; margin-top:10px; overflow-x:auto; padding-bottom:4px;">
            ${p.media.map(m => m.media_type === 'video'
              ? `<video src="${m.url}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" controls muted></video>`
              : `<img src="${m.url}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer;" onclick="Render.openLightbox('${m.url}')" loading="lazy">`
            ).join('')}
          </div>` : '';
        return `<div class="order-card">
          <div class="order-card-header">
            <div class="order-id">#${p.id} · ${p.payment_date || '—'}</div>
            <span class="badge badge-${p.status === 'Pagado' ? 'green' : p.status === 'Cancelado' ? 'red' : 'orange'}">${p.status}</span>
          </div>
          <div class="order-info"><strong>Servicio:</strong> ${p.service_name || p.concept || '—'}</div>
          <div class="order-info"><strong>Venta:</strong> ₲ ${Utils.formatGs(p.sale_price)} · <strong>Ganancia:</strong> <span style="color:var(--accent3);">₲ ${Utils.formatGs(profit)}</span></div>
          ${p.notes ? `<div class="order-info" style="margin-top:6px;padding:8px;background:var(--bg2);border-radius:6px;font-size:12px;color:var(--text2);"><strong>Nota:</strong> ${p.notes}</div>` : ''}
          ${mediaHtml}
        </div>`;
      }).join('') : '<p style="color:var(--text3);text-align:center;padding:30px;">Sin registros para este cliente.</p>';

      // Ocultar botón Guardar
      document.querySelector('#modal-admin-form .btn-submit')?.setAttribute('style', 'display:none');
      Utils.openModal('modal-admin-form');
    } catch (err) {
      Utils.toast('Error al cargar historial', 'error');
    }
  },

  async saveForm() {
    const type = this.formType;
    const form = this.FORMS[type];
    if (!form) return;
    const data = {};
    form.fields.forEach(f => {
      const el = document.getElementById('af-' + f.id);
      data[f.id] = el ? el.value : '';
    });
    // Post-process
    if (type === 'service') { data.features = data.featuresStr?.split(',').map(s => s.trim()).filter(Boolean); delete data.featuresStr; }
    if (type === 'project') { data.technologies = data.techStr?.split(',').map(s => s.trim()).filter(Boolean); delete data.techStr; }
    if (type === 'product') { data.specifications = data.specsStr?.split('\n').map(s => s.trim()).filter(Boolean); delete data.specsStr; }
    if (type === 'iptv') data.featured = data.featured === 'true';
    if (data.cost_price) data.cost_price = Number(data.cost_price);
    if (data.sale_price) data.sale_price = Number(data.sale_price);
    // Convertir IDs vacíos a null para dynamic_select
    if (type === 'payment') {
      data.client_id = data.client_id ? parseInt(data.client_id) : null;
      data.service_id = data.service_id ? parseInt(data.service_id) : null;
      data.product_id = data.product_id ? parseInt(data.product_id) : null;
    }

    const apiMap = { product: 'products', service: 'services', iptv: 'iptv', tool: 'tools', project: 'projects', video: 'videos', client: 'clients', payment: 'payments' };
    const apiKey = apiMap[type];

    try {
      let result;
      if (this.formEditId) {
        result = await API[apiKey].update(this.formEditId, data);
      } else {
        result = await API[apiKey].create(data);
      }
      Utils.closeModal('modal-admin-form');
      Utils.toast((this.formEditId ? 'Actualizado' : 'Agregado') + ' correctamente!', 'success');

      // Si es pago nuevo, ofrecer agregar media
      if (type === 'payment' && !this.formEditId && result && result.id) {
        if (confirm('¿Deseas agregar fotos o videos del trabajo?')) {
          this.formEditId = result.id;
          this.formType = 'payment';
          this.openForm('payment', result.id);
          return;
        }
      }

      this.loadAllLists();
      this.loadDashboard();
      Render.all();
    } catch (err) {
      Utils.toast(err.message || 'Error al guardar', 'error');
    }
  },

  // ===== CONFIG =====
  async loadConfig() {
    const cfg = Utils.siteConfig;
    const el1 = document.getElementById('cfg-phone');
    const el2 = document.getElementById('cfg-clients-stat');
    const el3 = document.getElementById('cfg-exp');
    if (el1) el1.value = cfg.phone || '';
    if (el2) el2.value = cfg.clients_stat || 120;
    if (el3) el3.value = cfg.experience_years || 5;
  },

  async saveConfig() {
    try {
      const phone = document.getElementById('cfg-phone')?.value;
      const clients_stat = document.getElementById('cfg-clients-stat')?.value;
      const experience_years = document.getElementById('cfg-exp')?.value;
      await API.config.update({ phone, clients_stat, experience_years });
      Utils.siteConfig = { ...Utils.siteConfig, phone, clients_stat, experience_years };
      Render.heroStats();
      Utils.toast('Configuración guardada.', 'success');
    } catch (err) { Utils.toast('Error al guardar configuración', 'error'); }
  }
};
