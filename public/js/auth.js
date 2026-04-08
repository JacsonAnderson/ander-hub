// js/auth.js - Módulo de autenticación
const Auth = {
  currentUser: null,
  isAdmin: false,
  isReseller: false,

  init() {
    const savedUser = localStorage.getItem('ander_user');
    if (savedUser && API.token) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.isAdmin = this.currentUser.role === 'admin';
        this.isReseller = this.currentUser.role === 'reseller';
        this.updateUI();
        if (this.isReseller) this._openResellerPanel();
      } catch { this.logout(); }
    }
    window.addEventListener('auth:expired', () => this.logout());
  },

  async login() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    if (!user || !pass) { errEl.style.display = 'block'; return; }
    try {
      const data = await API.auth.login(user, pass);
      API.setToken(data.token);
      this.currentUser = data.user;
      this.isAdmin = data.user.role === 'admin';
      this.isReseller = data.user.role === 'reseller';
      localStorage.setItem('ander_user', JSON.stringify(data.user));
      Utils.closeModal('modal-login');
      this.updateUI();
      Utils.toast(`Bem-vindo, ${data.user.name}!`, 'success');
      if (this.isAdmin) {
        Admin.loadDashboard();
      } else if (this.isReseller) {
        this._openResellerPanel();
      }
    } catch (err) {
      errEl.style.display = 'block';
    }
  },

  logout() {
    API.setToken(null);
    this.currentUser = null;
    this.isAdmin = false;
    this.isReseller = false;
    localStorage.removeItem('ander_user');
    localStorage.removeItem('ander_token');
    // Close panels
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.remove('show');
    this._closeResellerPanel();
    this.updateUI();
    Utils.toast('Sessão encerrada.', 'success');
  },

  _openResellerPanel() {
    const panel = document.getElementById('reseller-panel');
    if (!panel) return;
    panel.classList.add('show');
    // Set name in panel
    const nameEl = document.getElementById('reseller-topbar-name');
    const userEl = document.getElementById('reseller-panel-username');
    if (nameEl) nameEl.textContent = this.currentUser?.name || '';
    if (userEl) userEl.textContent = this.currentUser?.name || '';
    // Init IPTVM for reseller
    IPTVM.init();
  },

  _closeResellerPanel() {
    const panel = document.getElementById('reseller-panel');
    if (panel) panel.classList.remove('show');
  },

  updateUI() {
    const loggedIn = !!this.currentUser;
    const btnLogin = document.getElementById('btn-login-sidebar');
    const userInfo = document.getElementById('user-info-sidebar');
    const btnOrders = document.getElementById('btn-my-orders');
    const btnAdmin = document.getElementById('btn-admin-panel');

    if (btnLogin) btnLogin.style.display = loggedIn ? 'none' : 'flex';
    if (userInfo) userInfo.classList.toggle('show', loggedIn);
    if (btnOrders) btnOrders.classList.toggle('show', loggedIn && !this.isAdmin && !this.isReseller);
    if (btnAdmin) btnAdmin.classList.toggle('show', this.isAdmin);

    if (loggedIn) {
      const avatar = document.getElementById('user-avatar-text');
      const nameEl = document.getElementById('user-display-name');
      const roleEl = document.getElementById('user-display-role');
      if (avatar) avatar.textContent = this.currentUser.name[0].toUpperCase();
      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (roleEl) roleEl.textContent = this.isAdmin ? 'Administrador' : this.isReseller ? 'Revendedor' : 'Cliente';
    }
  },

  async showMyOrders() {
    if (!this.currentUser) return;
    try {
      const payments = await API.payments.myOrders();
      const list = document.getElementById('my-orders-list');
      if (!list) return;
      list.innerHTML = payments.length ? payments.map(p => {
        // Galería de media del trabajo
        let mediaHtml = '';
        if (p.media && p.media.length > 0) {
          mediaHtml = `
            <div style="margin-top:12px;">
              <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">
                <i class="fas fa-camera"></i> Fotos/Videos del trabajo (${p.media.length})
              </div>
              <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;">
                ${p.media.map(m => {
                  if (m.media_type === 'video') {
                    return `<video src="${m.url}" style="width:140px;height:100px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--border2);" controls muted preload="metadata"></video>`;
                  }
                  return `<img src="${m.url}" alt="${m.caption || ''}" style="width:140px;height:100px;object-fit:cover;border-radius:8px;flex-shrink:0;cursor:pointer;border:1px solid var(--border2);transition:transform 0.2s;" onclick="Render.openLightbox('${m.url}')" loading="lazy" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`;
                }).join('')}
              </div>
            </div>`;
        }
        return `
        <div class="order-card">
          <div class="order-card-header">
            <div class="order-id">Ref. #${p.id}</div>
            <span class="badge badge-${p.status === 'Pagado' ? 'green' : p.status === 'Cancelado' ? 'red' : 'orange'}">${p.status}</span>
          </div>
          <div class="order-info"><strong>Servicio:</strong> ${p.product_name ? '📦 ' + p.product_name : (p.service_name || p.concept || '—')}</div>
          <div class="order-info"><strong>Monto:</strong> ₲ ${Utils.formatGs(p.sale_price)}</div>
          <div class="order-info"><strong>Fecha:</strong> ${p.payment_date}</div>
          ${p.delivery_status ? `<div class="order-info" style="margin-top:6px;"><strong>Entrega:</strong> <span class="badge badge-${p.delivery_status === 'Entregado' ? 'green' : 'orange'}"><i class="fas fa-truck"></i> ${p.delivery_status}</span></div>` : ''}
          ${p.notes ? `<div class="order-info" style="margin-top:8px;padding:8px;background:var(--surface);border-radius:6px;font-size:12px;color:var(--text2);"><strong>Nota del técnico:</strong> ${p.notes}</div>` : ''}
          ${mediaHtml}
        </div>`;
      }).join('') : '<p style="color:var(--text2);text-align:center;padding:20px;">No hay registros de pedidos aún.</p>';
      Utils.openModal('modal-my-orders');
    } catch (err) {
      Utils.toast('Error al cargar pedidos', 'error');
    }
  },

  async changePassword() {
    const cur = document.getElementById('cfg-current-pass').value;
    const nw = document.getElementById('cfg-new-pass').value;
    const cnf = document.getElementById('cfg-confirm-pass').value;
    if (!cur || !nw) { Utils.toast('Completa todos los campos', 'error'); return; }
    if (nw !== cnf) { Utils.toast('Las contraseñas nuevas no coinciden', 'error'); return; }
    if (nw.length < 6) { Utils.toast('Mínimo 6 caracteres', 'error'); return; }
    try {
      await API.auth.changePassword(cur, nw);
      ['cfg-current-pass', 'cfg-new-pass', 'cfg-confirm-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      Utils.toast('¡Contraseña actualizada!', 'success');
    } catch (err) {
      Utils.toast(err.message || 'Error al cambiar contraseña', 'error');
    }
  }
};
