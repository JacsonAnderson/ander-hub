// public/js/iptv-mgmt.js
// IPTV Management System — Admin & Reseller frontend module

const IPTVM = {
  _currentSection: 'iptvm-dashboard',
  _subs: [],
  _editingSubId: null,
  _editingAccountId: null,
  _viewingSubId: null,

  // ── Init ──────────────────────────────────────────────────

  init() {
    // Render reseller panel (admin panel sections added via HTML)
    this.showSection('iptvm-dashboard');
    this.loadDashboard();
  },

  // ── Navigation ────────────────────────────────────────────

  showSection(id) {
    const inAdmin = id.startsWith('admin-iptvm');

    if (inAdmin) {
      // In admin panel: toggle .admin-section elements
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('show'));
      document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(id + '-section')?.classList.add('show');
    } else {
      // In reseller panel: toggle .iptvm-section elements
      document.querySelectorAll('.iptvm-section').forEach(s => s.classList.remove('show'));
      document.querySelectorAll('.iptvm-nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(id)?.classList.add('show');
    }

    document.querySelectorAll(`[data-iptvm-section="${id}"]`).forEach(n => n.classList.add('active'));

    const titles = {
      'iptvm-dashboard': 'Dashboard IPTV',
      'iptvm-subscriptions': 'Mis Suscripciones',
      'admin-iptvm-dashboard': 'Dashboard IPTV',
      'admin-iptvm-subscriptions': 'Suscripciones IPTV',
      'admin-iptvm-accounts': 'Cuentas de Proveedor',
      'admin-iptvm-resellers': 'Revendedores',
    };
    const titleEl = inAdmin
      ? document.getElementById('admin-topbar-title')
      : document.getElementById('iptvm-topbar-title');
    if (titleEl && titles[id]) titleEl.textContent = titles[id];

    this._currentSection = id;
    this.closeSidebar();

    // Load data for section
    if (id.includes('dashboard')) this.loadDashboard();
    else if (id.includes('subscriptions')) this.loadSubscriptions();
    else if (id.includes('accounts')) this.loadAccounts();
    else if (id.includes('resellers')) this.loadResellers();
  },

  openSidebar() {
    document.getElementById('iptvm-sidebar-overlay')?.classList.add('show');
    document.querySelector('#reseller-panel .iptvm-sidebar')?.classList.add('open');
  },

  closeSidebar() {
    document.getElementById('iptvm-sidebar-overlay')?.classList.remove('show');
    document.querySelector('#reseller-panel .iptvm-sidebar')?.classList.remove('open');
  },

  // ── Dashboard ─────────────────────────────────────────────

  async loadDashboard() {
    const containerId = this._inAdminPanel() ? 'admin-iptvm-dashboard' : 'iptvm-dashboard';
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      const data = await API.iptvm.dashboard();
      const isAdm = Auth.isAdmin;

      // Stats
      const statsHtml = `
        <div class="iptvm-stats-grid">
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Total Suscripciones</div>
            <div class="iptvm-stat-value blue">${data.total}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Activas</div>
            <div class="iptvm-stat-value green">${data.active}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Vencidas</div>
            <div class="iptvm-stat-value red">${data.overdue}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Vencen en 5 días</div>
            <div class="iptvm-stat-value yellow">${data.dueSoon}</div>
          </div>
        </div>`;

      // Alert banner
      let alertHtml = '';
      if (data.overdue > 0) {
        alertHtml = `<div class="iptvm-alert">
          <i class="fas fa-exclamation-triangle"></i>
          <div class="iptvm-alert-text"><strong>${data.overdue} suscripción(es) vencida(s)</strong> — contacte a los clientes.</div>
        </div>`;
      }

      // Provider distribution
      const total = data.total || 1;
      const lumixPct = Math.round((data.byProvider.lumix / total) * 100);
      const stlivePct = Math.round((data.byProvider.stlive / total) * 100);

      const providerHtml = `
        <div class="provider-bars">
          <div class="provider-bar-row">
            <div class="provider-bar-label">
              <span><span class="iptvm-badge lumix">Lumix TV</span></span>
              <span>${data.byProvider.lumix} (${lumixPct}%)</span>
            </div>
            <div class="provider-bar-track"><div class="provider-bar-fill lumix" style="width:${lumixPct}%"></div></div>
          </div>
          <div class="provider-bar-row">
            <div class="provider-bar-label">
              <span><span class="iptvm-badge stlive">STlive</span></span>
              <span>${data.byProvider.stlive} (${stlivePct}%)</span>
            </div>
            <div class="provider-bar-track"><div class="provider-bar-fill stlive" style="width:${stlivePct}%"></div></div>
          </div>
        </div>`;

      // Recent and overdue tables
      const recentHtml = data.recent.length > 0
        ? `<table class="iptvm-table">
            <thead><tr><th>Cliente</th><th>Provedor</th><th>Status</th></tr></thead>
            <tbody>${data.recent.map(s => `
              <tr onclick="IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                <td><div class="iptvm-client-cell"><span class="iptvm-client-name">${s.client_name}</span><span class="iptvm-client-phone">${s.client_phone || ''}</span></div></td>
                <td><span class="iptvm-badge ${s.provider}">${s.provider === 'lumix' ? 'Lumix TV' : 'STlive'}</span></td>
                <td>${this._payStatusBadge(s.payment_status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
        : `<div class="iptvm-empty"><i class="fas fa-satellite-dish"></i><p>Sin suscripciones ainda</p></div>`;

      const overdueHtml = data.overdueList.length > 0
        ? `<table class="iptvm-table">
            <thead><tr><th>Cliente</th><th>Vencimiento</th><th>Valor</th></tr></thead>
            <tbody>${data.overdueList.map(s => `
              <tr onclick="IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                <td><div class="iptvm-client-cell"><span class="iptvm-client-name">${s.client_name}</span><span class="iptvm-client-phone">${s.client_phone || ''}</span></div></td>
                <td style="color:var(--red)">${this._fmtDate(s.next_payment)}</td>
                <td style="color:var(--accent3);font-weight:700;">${this._fmtPrice(s.price)}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
        : `<div class="iptvm-empty"><i class="fas fa-check-circle"></i><p>Sin pagos vencidos!</p></div>`;

      el.innerHTML = `
        ${alertHtml}
        ${statsHtml}
        <div class="iptvm-two-col">
          <div class="iptvm-panel-card">
            <h4><i class="fas fa-chart-pie"></i> Por Proveedor</h4>
            ${providerHtml}
            <div class="iptvm-revenue" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border2)">
              <div class="iptvm-revenue-value">${this._fmtPrice(data.monthlyRevenue)}</div>
              <div class="iptvm-revenue-label">Ingresos mensuales estimados</div>
            </div>
          </div>
          <div class="iptvm-panel-card">
            <h4><i class="fas fa-exclamation-circle"></i> Vencidas</h4>
            ${overdueHtml}
          </div>
        </div>
        <div class="iptvm-panel-card">
          <h4><i class="fas fa-clock"></i> Suscripciones Recentes</h4>
          ${recentHtml}
        </div>`;
    } catch (err) {
      console.error('IPTVM dashboard error:', err);
    }
  },

  // ── Subscriptions ─────────────────────────────────────────

  async loadSubscriptions(filters = {}) {
    const containerId = this._inAdminPanel() ? 'admin-iptvm-subs-list' : 'iptvm-subs-list';
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>`;

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.search) params.set('search', filters.search);

      this._subs = await API.iptvm.subscriptions(params.toString());

      if (this._subs.length === 0) {
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-satellite-dish"></i><p>Sin suscripciones encontrada</p></div>`;
        return;
      }

      const isAdm = Auth.isAdmin;
      el.innerHTML = `
        <div class="iptvm-table-wrap">
          <table class="iptvm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Provedor</th>
                ${isAdm ? '<th class="hide-mobile">Porta</th>' : ''}
                ${isAdm ? '<th class="hide-mobile">Revendedor</th>' : ''}
                <th>Próx. Pgto</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${this._subs.map(s => `
                <tr>
                  <td onclick="IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                    <div class="iptvm-client-cell">
                      <span class="iptvm-client-name">${s.client_name}</span>
                      <span class="iptvm-client-phone">${s.client_phone || ''}</span>
                    </div>
                  </td>
                  <td><span class="iptvm-badge ${s.provider}">${s.provider === 'lumix' ? 'Lumix TV' : 'STlive'}</span></td>
                  ${isAdm ? `<td class="hide-mobile">${s.port ? `<span class="port-dot">${s.port}</span>` : '—'}</td>` : ''}
                  ${isAdm ? `<td class="hide-mobile" style="font-size:12px;color:var(--text3)">${s.reseller_name || '—'}</td>` : ''}
                  <td style="font-size:12px;">${this._fmtDate(s.next_payment)}</td>
                  <td style="color:var(--accent3);font-weight:700;">${this._fmtPrice(s.price)}</td>
                  <td>${this._payStatusBadge(s.payment_status)}</td>
                  <td>
                    <div class="iptvm-row-actions">
                      <button class="btn-edit" title="Ver detalles" onclick="IPTVM.openSubDetail('${s.id}')"><i class="fas fa-eye"></i></button>
                      <button class="btn-pay" style="padding:5px 8px;font-size:11px;" title="Registrar pago" onclick="IPTVM.openPayModal('${s.id}')"><i class="fas fa-dollar-sign"></i></button>
                      ${isAdm ? `<button class="btn-del" title="Excluir" onclick="IPTVM.deleteSub('${s.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar suscripciones</p></div>`;
      console.error(err);
    }
  },

  applyFilters() {
    const prefix = this._inAdminPanel() ? 'admin-iptvm' : 'iptvm';
    const status = document.getElementById(`${prefix}-filter-status`)?.value || '';
    const provider = document.getElementById(`${prefix}-filter-provider`)?.value || '';
    const search = document.getElementById(`${prefix}-filter-search`)?.value || '';
    this.loadSubscriptions({ status, provider, search });
  },

  // ── Sub Form (create / edit) ───────────────────────────────

  _cachedAccounts: [],
  _cachedResellers: [],

  async openSubForm(id = null) {
    this._editingSubId = id;
    const sub = id ? this._subs.find(s => s.id === id) : null;
    const isAdm = Auth.isAdmin;

    Utils.openModal('modal-iptvm-sub-form');
    const title = document.getElementById('modal-iptvm-sub-title');
    if (title) title.textContent = id ? 'Editar Suscripción' : 'Nueva Suscripción';

    const body = document.getElementById('modal-iptvm-sub-body');
    if (!body) return;
    body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>`;

    // Load accounts (and resellers for admin)
    try {
      if (isAdm) {
        const [accs, users] = await Promise.all([API.iptvm.accounts(), API.auth.listUsers()]);
        this._cachedAccounts = accs;
        this._cachedResellers = users.filter(u => u.role === 'reseller');
      }
    } catch (e) { console.error('Error al cargar datos do form', e); }

    const portOptions = [1,2,3,4].map(n => `<option value="${n}" ${sub?.port == n ? 'selected' : ''}>Porta ${n}</option>`).join('');

    // Account selector (admin) — grouped by provider
    let accountSelectorHtml = '';
    if (isAdm) {
      const lumixAccs = this._cachedAccounts.filter(a => a.provider === 'lumix');
      const stliveAccs = this._cachedAccounts.filter(a => a.provider === 'stlive');
      accountSelectorHtml = `
        <div class="iptvm-form-section-title">Cuenta del Proveedor</div>
        <div class="form-row">
          <div class="form-group" style="grid-column:1/-1">
            <label>Seleccionar Cuenta *</label>
            <select id="isub-account-id" onchange="IPTVM._onAccountChange(this.value)">
              <option value="">— Seleccione una cuenta —</option>
              ${lumixAccs.length ? `<optgroup label="Lumix TV">
                ${lumixAccs.map(a => `<option value="${a.id}" ${sub?.account_id === a.id ? 'selected' : ''}>${a.account_user} (${a.max_ports || 4} portas)</option>`).join('')}
              </optgroup>` : ''}
              ${stliveAccs.length ? `<optgroup label="STlive">
                ${stliveAccs.map(a => `<option value="${a.id}" ${sub?.account_id === a.id ? 'selected' : ''}>${a.account_user}</option>`).join('')}
              </optgroup>` : ''}
            </select>
          </div>
        </div>
        <div class="form-row" id="isub-port-group" style="${sub?.provider !== 'lumix' ? 'display:none' : ''}">
          <div class="form-group">
            <label>Puerto (Lumix) *</label>
            <select id="isub-port"><option value="">— Seleccione el puerto —</option>${portOptions}</select>
          </div>
          <div class="form-group" id="isub-port-status"></div>
        </div>`;
    }

    // Reseller selector (admin only, create mode)
    let resellerSelectorHtml = '';
    if (isAdm) {
      resellerSelectorHtml = `
        <div class="iptvm-form-section-title">Revendedor</div>
        <div class="form-row">
          <div class="form-group" style="grid-column:1/-1">
            <label>Asignar a</label>
            <select id="isub-reseller-id">
              <option value="">— Mi cuenta (admin) —</option>
              ${this._cachedResellers.map(r => `<option value="${r.id}" ${sub?.reseller_id === r.id ? 'selected' : ''}>${r.name} (@${r.username})</option>`).join('')}
            </select>
          </div>
        </div>`;
    }

    body.innerHTML = `<form class="iptvm-form" id="iptvm-sub-form" onsubmit="return false">
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Cliente *</label>
          <input type="text" id="isub-name" value="${sub?.client_name || ''}" placeholder="Nome completo" required>
        </div>
        <div class="form-group">
          <label>Teléfono / WhatsApp</label>
          <input type="text" id="isub-phone" value="${sub?.client_phone || ''}" placeholder="+595 9...">
        </div>
      </div>
      ${accountSelectorHtml}
      <div class="iptvm-form-section-title">Dispositivo y Pago</div>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Dispositivo</label>
          <input type="text" id="isub-device" value="${sub?.device_name || ''}" placeholder="TV Samsung, Celular...">
        </div>
        <div class="form-group">
          <label>Monto Mensual (₲)</label>
          <input type="number" id="isub-price" value="${sub?.price || ''}" placeholder="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Próximo Vencimiento</label>
          <input type="date" id="isub-next-payment" value="${sub?.next_payment ? sub.next_payment.substring(0,10) : ''}">
        </div>
        ${isAdm && id ? `<div class="form-group">
          <label>Status</label>
          <select id="isub-status">
            <option value="active" ${sub?.status === 'active' ? 'selected' : ''}>Ativo</option>
            <option value="inactive" ${sub?.status === 'inactive' ? 'selected' : ''}>Inativo</option>
          </select>
        </div>` : '<div class="form-group"></div>'}
      </div>
      ${resellerSelectorHtml}
      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="isub-notes" placeholder="Notas internas...">${sub?.notes || ''}</textarea>
      </div>
    </form>`;

    // Trigger account change to show port info if editing
    if (sub?.account_id) this._onAccountChange(sub.account_id, sub.port);
  },

  async _onAccountChange(accountId, selectedPort = null) {
    const portGroup = document.getElementById('isub-port-group');
    const portStatus = document.getElementById('isub-port-status');
    if (!portGroup) return;

    if (!accountId) { portGroup.style.display = 'none'; return; }

    const acc = this._cachedAccounts.find(a => a.id === accountId);
    if (!acc) return;

    if (acc.provider === 'lumix') {
      portGroup.style.display = '';
      // Check which ports are already occupied
      if (portStatus) {
        try {
          const data = await API.iptvm.accountSubscribers(accountId);
          if (data.ports) {
            const portSel = document.getElementById('isub-port');
            if (portSel) {
              portSel.innerHTML = '<option value="">— Seleccione el puerto —</option>' +
                data.ports.map(p => {
                  const occupied = p.sub && p.sub.id !== this._editingSubId;
                  return `<option value="${p.port}" ${occupied ? 'disabled' : ''} ${selectedPort == p.port ? 'selected' : ''}>
                    Porta ${p.port} ${occupied ? `— ${p.sub.client_name} (ocupada)` : '— Libre'}
                  </option>`;
                }).join('');
            }
            portStatus.innerHTML = `<div style="font-size:11px;color:var(--text3);padding-top:20px;">
              ${data.ports.filter(p => p.sub).length}/${data.ports.length} puertos ocupados
            </div>`;
          }
        } catch (e) { /* ignore */ }
      }
    } else {
      portGroup.style.display = 'none';
    }
  },

  async saveSub() {
    const isAdm = Auth.isAdmin;
    const accountId = document.getElementById('isub-account-id')?.value;
    const acc = accountId ? this._cachedAccounts.find(a => a.id === accountId) : null;

    const data = {
      client_name: document.getElementById('isub-name')?.value?.trim(),
      client_phone: document.getElementById('isub-phone')?.value?.trim(),
      device_name: document.getElementById('isub-device')?.value?.trim(),
      price: document.getElementById('isub-price')?.value,
      next_payment: document.getElementById('isub-next-payment')?.value,
      notes: document.getElementById('isub-notes')?.value?.trim(),
    };

    if (isAdm) {
      if (accountId) {
        data.account_id = accountId;
        data.provider = acc?.provider || '';
        if (acc?.provider === 'lumix') {
          data.port = document.getElementById('isub-port')?.value || null;
        }
      }
      const statusEl = document.getElementById('isub-status');
      if (statusEl) data.status = statusEl.value;
      const rId = document.getElementById('isub-reseller-id')?.value?.trim();
      if (rId) data.reseller_id = rId;
    } else {
      // Reseller: provider is inherited from context (no account selector)
      data.provider = 'stlive'; // default, resellers don't pick provider
    }

    if (!data.client_name) {
      Utils.toast('Nome do cliente é obrigatório', 'error'); return;
    }
    if (isAdm && !this._editingSubId && !accountId) {
      Utils.toast('Seleccione una cuenta de proveedor', 'error'); return;
    }

    try {
      if (this._editingSubId) {
        await API.iptvm.updateSubscription(this._editingSubId, data);
        Utils.toast('¡Suscripción actualizada!', 'success');
        Utils.closeModal('modal-iptvm-sub-form');
      } else {
        const result = await API.iptvm.createSubscription(data);
        Utils.closeModal('modal-iptvm-sub-form');
        if (result.generated_credentials) {
          this._showCredentials(result.client_name || data.client_name, result.generated_credentials);
        } else {
          Utils.toast('¡Suscripción creada!', 'success');
        }
      }
      this.loadSubscriptions();
      this.loadDashboard();
    } catch (err) {
      Utils.toast(err.message || 'Error al guardar suscripción', 'error');
      console.error(err);
    }
  },

  _showCredentials(clientName, creds) {
    Utils.openModal('modal-iptvm-credentials');
    const body = document.getElementById('modal-iptvm-credentials-body');
    if (!body) return;
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(0,230,118,0.15);border:2px solid rgba(0,230,118,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
          <i class="fas fa-check" style="color:var(--accent3);font-size:22px;"></i>
        </div>
        <div style="font-size:16px;font-weight:800;">${clientName}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px;">Cliente registrado con acceso al sistema</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius2);padding:20px;margin-bottom:16px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--text3);margin-bottom:14px;">Credenciales de Acceso</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Usuario</div>
            <div style="font-family:monospace;font-size:15px;font-weight:700;color:var(--accent);background:rgba(0,176,255,0.08);padding:8px 12px;border-radius:8px;border:1px solid rgba(0,176,255,0.2);">${creds.username}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Contraseña</div>
            <div style="font-family:monospace;font-size:15px;font-weight:700;color:var(--accent3);background:rgba(0,230,118,0.08);padding:8px 12px;border-radius:8px;border:1px solid rgba(0,230,118,0.2);">${creds.password_plain}</div>
          </div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3);text-align:center;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px;">
        <i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>
        Anote estas credenciales — la contraseña no podrá ser recuperada después.
      </div>`;
  },

  async deleteSub(id) {
    if (!confirm('¿Eliminar esta suscripción? Esta acción no puede deshacerse.')) return;
    try {
      await API.iptvm.deleteSubscription(id);
      Utils.toast('Suscripción eliminada', 'success');
      this.loadSubscriptions();
      this.loadDashboard();
    } catch (err) {
      Utils.toast('Error al eliminar', 'error');
    }
  },

  // ── Sub Detail ────────────────────────────────────────────

  async openSubDetail(id) {
    this._viewingSubId = id;
    Utils.openModal('modal-iptvm-sub-detail');
    const body = document.getElementById('modal-iptvm-sub-detail-body');
    if (!body) return;
    body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>`;

    try {
      const sub = await API.iptvm.getSubscription(id);
      const isAdm = Auth.isAdmin;
      const history = sub.payment_history || [];

      const historyHtml = history.length > 0
        ? history.map(h => `
          <div class="pay-history-item">
            <div class="pay-history-dot ${h.type}"></div>
            <div class="pay-history-info">
              <div class="pay-history-type">${h.type === 'registration' ? 'Registro' : 'Pago'}</div>
              <div class="pay-history-date">${this._fmtDatetime(h.paid_at)}${h.next_payment ? ` — Próx.: ${this._fmtDate(h.next_payment)}` : ''}</div>
              ${h.notes ? `<div class="pay-history-notes">${h.notes}</div>` : ''}
            </div>
            <div class="pay-history-amount">${this._fmtPrice(h.amount)}</div>
          </div>`).join('')
        : `<div class="iptvm-empty" style="padding:20px"><i class="fas fa-history"></i><p>Sin historial</p></div>`;

      body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:18px;font-weight:800;">${sub.client_name}</div>
            <div style="font-size:13px;color:var(--text3);">${sub.client_phone || ''}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="iptvm-badge ${sub.provider}">${sub.provider === 'lumix' ? 'Lumix TV' : 'STlive'}</span>
            ${this._payStatusBadge(sub.payment_status)}
            <button class="btn-pay" onclick="IPTVM.openPayModal('${id}')"><i class="fas fa-dollar-sign"></i> Registrar Pgto</button>
            ${isAdm ? `<button class="btn-edit" onclick="Utils.closeModal('modal-iptvm-sub-detail');IPTVM.openSubForm('${id}')"><i class="fas fa-edit"></i></button>` : ''}
          </div>
        </div>

        <div class="sub-detail-grid">
          <div class="sub-detail-card">
            <div class="sub-detail-card-title">Información de la Suscripción</div>
            <div class="sub-detail-row"><span class="sub-detail-label">Dispositivo</span><span class="sub-detail-value">${sub.device_name || '—'}</span></div>
            ${sub.port ? `<div class="sub-detail-row"><span class="sub-detail-label">Porta</span><span class="sub-detail-value"><span class="port-dot">${sub.port}</span></span></div>` : ''}
            <div class="sub-detail-row"><span class="sub-detail-label">Valor</span><span class="sub-detail-value" style="color:var(--accent3)">${this._fmtPrice(sub.price)}</span></div>
            <div class="sub-detail-row"><span class="sub-detail-label">Próx. Vencimiento</span><span class="sub-detail-value">${this._fmtDate(sub.next_payment)}</span></div>
            <div class="sub-detail-row"><span class="sub-detail-label">Registrado</span><span class="sub-detail-value">${this._fmtDate(sub.registered_at)}</span></div>
            ${isAdm ? `<div class="sub-detail-row"><span class="sub-detail-label">Revendedor</span><span class="sub-detail-value">${sub.reseller_name || '—'}</span></div>` : ''}
            ${sub.notes ? `<div class="sub-detail-row"><span class="sub-detail-label">Obs.</span><span class="sub-detail-value">${sub.notes}</span></div>` : ''}
          </div>
          ${isAdm ? `
          <div class="sub-detail-card">
            <div class="sub-detail-card-title">Datos de la Cuenta (Confidencial)</div>
            <div class="sub-detail-row">
              <span class="sub-detail-label">Usuário</span>
              <span class="sub-detail-value"><span class="sub-sensitive"><span class="val">${sub.account_user || '—'}</span></span></span>
            </div>
            <div class="sub-detail-row">
              <span class="sub-detail-label">Senha</span>
              <span class="sub-detail-value">
                <span class="sub-sensitive">
                  <span class="val" id="pass-val-${id}">••••••••</span>
                  <button class="btn-show-pass" onclick="IPTVM._togglePass('${id}','${(sub.account_pass||'').replace(/'/g,'\\\'')}')" title="Mostrar/ocultar">
                    <i class="fas fa-eye" id="pass-icon-${id}"></i>
                  </button>
                </span>
              </span>
            </div>
          </div>` : '<div></div>'}
        </div>

        <div class="iptvm-panel-card">
          <h4><i class="fas fa-history"></i> Historial de Pagos</h4>
          <div class="pay-history">${historyHtml}</div>
        </div>`;
    } catch (err) {
      body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar detalhes</p></div>`;
      console.error(err);
    }
  },

  _passVisible: {},
  _togglePass(id, pass) {
    const val = document.getElementById(`pass-val-${id}`);
    const icon = document.getElementById(`pass-icon-${id}`);
    if (!val) return;
    this._passVisible[id] = !this._passVisible[id];
    val.textContent = this._passVisible[id] ? (pass || '—') : '••••••••';
    if (icon) { icon.className = this._passVisible[id] ? 'fas fa-eye-slash' : 'fas fa-eye'; }
  },

  // ── Payment Modal ─────────────────────────────────────────

  openPayModal(id) {
    const sub = this._subs.find(s => s.id === id) || { id };
    Utils.openModal('modal-iptvm-pay');
    const body = document.getElementById('modal-iptvm-pay-body');
    if (!body) return;

    // Default next payment = 1 month from today
    const nextDefault = new Date();
    nextDefault.setMonth(nextDefault.getMonth() + 1);
    const nextStr = nextDefault.toISOString().substring(0, 10);

    body.innerHTML = `
      <form class="iptvm-form" id="iptvm-pay-form" data-id="${id}" onsubmit="return false">
        <div class="form-row">
          <div class="form-group">
            <label>Valor Pago (₲)</label>
            <input type="number" id="ipay-amount" value="${sub.price || ''}" placeholder="0">
          </div>
          <div class="form-group">
            <label>Próximo Vencimiento *</label>
            <input type="date" id="ipay-next" value="${nextStr}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Observaciones</label>
          <input type="text" id="ipay-notes" placeholder="Pago vía transferencia, etc.">
        </div>
      </form>`;
  },

  async confirmPay() {
    const form = document.getElementById('iptvm-pay-form');
    if (!form) return;
    const id = form.dataset.id;
    const data = {
      amount: document.getElementById('ipay-amount')?.value,
      next_payment: document.getElementById('ipay-next')?.value,
      notes: document.getElementById('ipay-notes')?.value?.trim(),
    };
    if (!data.next_payment) { Utils.toast('Fecha obligatoria', 'error'); return; }

    try {
      await API.iptvm.registerPayment(id, data);
      Utils.toast('¡Pago registrado!', 'success');
      Utils.closeModal('modal-iptvm-pay');
      this.loadSubscriptions();
      this.loadDashboard();
      // If detail modal is open, refresh it
      if (this._viewingSubId === id) this.openSubDetail(id);
    } catch (err) {
      Utils.toast('Error al registrar pago', 'error');
      console.error(err);
    }
  },

  // ── Accounts ──────────────────────────────────────────────

  async loadAccounts() {
    const containerId = this._inAdminPanel() ? 'admin-iptvm-accounts-list' : 'iptvm-accounts-list';
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      const accounts = await API.iptvm.accounts();

      if (accounts.length === 0) {
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-server"></i><p>Sin cuentas registradas</p></div>`;
        return;
      }

      el.innerHTML = accounts.map(a => `
        <div class="account-card" onclick="IPTVM.openAccountDetail('${a.id}')" style="cursor:pointer;" title="Clique para ver assinantes">
          <div class="account-provider-badge ${a.provider}">${a.provider === 'lumix' ? 'LMX' : 'STL'}</div>
          <div class="account-info">
            <div class="account-user">${a.account_user}</div>
            <div class="account-pass">${a.account_pass || '••••••••'}</div>
            <div class="account-meta">${a.provider === 'lumix' ? `${a.max_ports || 4} portas` : '1 tela'} · Custo: ${this._fmtPrice(a.cost_price)}</div>
          </div>
          <div class="account-actions" onclick="event.stopPropagation()">
            <button class="btn-edit" onclick="IPTVM.openAccountForm('${a.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-del" onclick="IPTVM.deleteAccount('${a.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('');
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar contas</p></div>`;
    }
  },

  async openAccountDetail(id) {
    Utils.openModal('modal-iptvm-account-detail');
    const body = document.getElementById('modal-iptvm-account-detail-body');
    if (!body) return;
    body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>`;

    try {
      const data = await API.iptvm.accountSubscribers(id);
      const { account, ports, subs, total } = data;
      const isLumix = account.provider === 'lumix';

      let slotsHtml = '';
      if (isLumix && ports) {
        slotsHtml = `
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px;">
            ${ports.map(p => `
              <div style="background:var(--surface);border:1px solid ${p.sub ? 'rgba(0,230,118,0.3)' : 'var(--border2)'};border-radius:var(--radius2);padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <span class="port-dot">${p.port}</span>
                  <span style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;">Porta ${p.port}</span>
                  <span style="margin-left:auto">${p.sub ? '<span class="iptvm-badge active">Ocupado</span>' : '<span class="iptvm-badge inactive">Libre</span>'}</span>
                </div>
                ${p.sub ? `
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${p.sub.client_name}</div>
                  <div style="font-size:11px;color:var(--text3);margin-top:2px;">${p.sub.client_phone || ''}</div>
                  <div style="font-size:11px;color:var(--text3);margin-top:4px;">${p.sub.device_name || ''}</div>
                  <div style="display:flex;justify-content:space-between;margin-top:8px;align-items:center;">
                    <span style="font-size:12px;color:var(--accent3);font-weight:700;">${this._fmtPrice(p.sub.price)}</span>
                    ${this._payStatusBadge(p.sub.payment_status)}
                  </div>
                  <button style="margin-top:10px;width:100%;padding:6px;background:rgba(0,176,255,0.1);border:1px solid rgba(0,176,255,0.2);color:var(--accent);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;" onclick="IPTVM.openSubDetail('${p.sub.id}')">
                    <i class="fas fa-eye"></i> Ver detalles
                  </button>
                ` : `<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px 0;opacity:0.5;">Sin clientes</div>`}
              </div>`).join('')}
          </div>`;
      } else if (subs) {
        // STlive — list format
        slotsHtml = subs.length > 0 ? `
          <div class="iptvm-table-wrap" style="margin-bottom:20px;">
            <table class="iptvm-table">
              <thead><tr><th>Cliente</th><th>Dispositivo</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                ${subs.map(s => `
                  <tr onclick="IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                    <td><div class="iptvm-client-cell"><span class="iptvm-client-name">${s.client_name}</span><span class="iptvm-client-phone">${s.client_phone || ''}</span></div></td>
                    <td style="font-size:12px">${s.device_name || '—'}</td>
                    <td style="color:var(--accent3);font-weight:700">${this._fmtPrice(s.price)}</td>
                    <td>${this._payStatusBadge(s.payment_status)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="iptvm-empty"><i class="fas fa-user-slash"></i><p>Sin clientes nesta conta</p></div>`;
      }

      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          <div class="account-provider-badge ${account.provider}" style="width:56px;height:56px;font-size:13px;">
            ${account.provider === 'lumix' ? 'LMX' : 'STL'}
          </div>
          <div>
            <div style="font-size:17px;font-weight:800;">${account.account_user}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">${isLumix ? `Lumix TV · ${account.max_ports || 4} portas` : 'STlive · 1 tela'}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px;">Custo: ${this._fmtPrice(account.cost_price)} · ${total} cliente(s) activo(s)</div>
          </div>
          <button class="btn-edit" style="margin-left:auto" onclick="IPTVM.openAccountForm('${account.id}')"><i class="fas fa-edit"></i></button>
        </div>
        ${slotsHtml}`;
    } catch (err) {
      body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar datos da conta</p></div>`;
      console.error(err);
    }
  },

  _accounts: [],
  openAccountForm(id = null) {
    this._editingAccountId = id;
    Utils.openModal('modal-iptvm-account-form');
    const title = document.getElementById('modal-iptvm-account-title');
    const body = document.getElementById('modal-iptvm-account-body');
    if (!body) return;

    // Find account data if editing
    API.iptvm.accounts().then(accounts => {
      this._accounts = accounts;
      const a = id ? accounts.find(acc => acc.id === id) : null;
      if (title) title.textContent = id ? 'Editar Cuenta' : 'Nova Cuenta de Proveedor';

      body.innerHTML = `<form class="iptvm-form" id="iptvm-account-form" onsubmit="return false">
        <div class="form-row">
          <div class="form-group">
            <label>Proveedor *</label>
            <select id="iacc-provider" onchange="IPTVM._toggleMaxPorts(this.value)">
              <option value="lumix" ${a?.provider === 'lumix' ? 'selected' : ''}>Lumix TV</option>
              <option value="stlive" ${a?.provider === 'stlive' ? 'selected' : ''}>STlive</option>
            </select>
          </div>
          <div class="form-group" id="iacc-maxports-group">
            <label>Máx. Puertos (Lumix)</label>
            <input type="number" id="iacc-maxports" value="${a?.max_ports || 4}" min="1" max="8">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Usuario *</label>
            <input type="text" id="iacc-user" value="${a?.account_user || ''}" placeholder="login@provedor.com">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="text" id="iacc-pass" value="${a?.account_pass || ''}" placeholder="senha">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Costo de Compra (₲)</label>
            <input type="number" id="iacc-cost" value="${a?.cost_price || ''}" placeholder="0">
          </div>
          <div class="form-group"></div>
        </div>
        <div class="form-group">
          <label>Notas</label>
          <textarea id="iacc-notes">${a?.notes || ''}</textarea>
        </div>
      </form>`;
      this._toggleMaxPorts(a?.provider || 'lumix');
    });
  },

  _toggleMaxPorts(provider) {
    const group = document.getElementById('iacc-maxports-group');
    if (group) group.style.display = provider === 'lumix' ? '' : 'none';
  },

  async saveAccount() {
    const provider = document.getElementById('iacc-provider')?.value;
    const data = {
      provider,
      account_user: document.getElementById('iacc-user')?.value?.trim(),
      account_pass: document.getElementById('iacc-pass')?.value?.trim(),
      max_ports: provider === 'lumix' ? parseInt(document.getElementById('iacc-maxports')?.value) || 4 : 1,
      cost_price: document.getElementById('iacc-cost')?.value,
      notes: document.getElementById('iacc-notes')?.value?.trim(),
    };

    if (!data.provider || !data.account_user) {
      Utils.toast('Proveedor y usuario son obligatorios', 'error'); return;
    }

    try {
      if (this._editingAccountId) {
        await API.iptvm.updateAccount(this._editingAccountId, data);
        Utils.toast('¡Cuenta actualizada!', 'success');
      } else {
        await API.iptvm.createAccount(data);
        Utils.toast('¡Cuenta creada!', 'success');
      }
      Utils.closeModal('modal-iptvm-account-form');
      this.loadAccounts();
    } catch (err) {
      Utils.toast('Error al guardar conta', 'error');
      console.error(err);
    }
  },

  async deleteAccount(id) {
    if (!confirm('¿Eliminar esta cuenta de proveedor?')) return;
    try {
      await API.iptvm.deleteAccount(id);
      Utils.toast('Cuenta eliminada', 'success');
      this.loadAccounts();
    } catch (err) {
      Utils.toast('Error al eliminar', 'error');
    }
  },

  // ── Resellers ─────────────────────────────────────────────

  _resellers: [],
  _editingResellerId: null,

  async loadResellers() {
    const containerId = this._inAdminPanel() ? 'admin-iptvm-resellers-list' : 'iptvm-resellers-list';
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      this._resellers = await API.auth.listUsers();
      const resellers = this._resellers.filter(u => u.role === 'reseller');

      if (resellers.length === 0) {
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-users"></i><p>Sin revendedores registrados.</p></div>`;
        return;
      }

      el.innerHTML = `
        <div class="iptvm-table-wrap">
          <table class="iptvm-table">
            <thead><tr><th>Nome</th><th>Usuário</th><th>Telefone</th><th>Status</th><th>Registrado</th><th></th></tr></thead>
            <tbody>
              ${resellers.map(r => `
                <tr style="cursor:pointer;" onclick="IPTVM.openResellerDetail('${r.id}','${(r.name||'').replace(/'/g,"\\'")}')">
                  <td style="font-weight:700">${r.name || '—'}</td>
                  <td style="font-size:12px;color:var(--text3);font-family:monospace">${r.username || '—'}</td>
                  <td style="font-size:12px;color:var(--text3)">${r.phone || '—'}</td>
                  <td><span class="iptvm-badge ${r.active !== false ? 'active' : 'inactive'}">${r.active !== false ? 'Ativo' : 'Inativo'}</span></td>
                  <td style="font-size:12px;color:var(--text3)">${this._fmtDate(r.created_at)}</td>
                  <td onclick="event.stopPropagation()">
                    <div class="iptvm-row-actions">
                      <button class="btn-edit" title="Editar" onclick="IPTVM.openResellerForm('${r.id}')"><i class="fas fa-edit"></i></button>
                      <button class="btn-del" title="Excluir" onclick="IPTVM.deleteReseller('${r.id}','${(r.name||'').replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar revendedores</p></div>`;
    }
  },

  openResellerForm(id = null) {
    this._editingResellerId = id;
    const r = id ? this._resellers.find(u => u.id === id) : null;
    Utils.openModal('modal-iptvm-reseller-form');
    const title = document.getElementById('modal-iptvm-reseller-title');
    const body = document.getElementById('modal-iptvm-reseller-body');
    if (title) title.textContent = id ? 'Editar Revendedor' : 'Nuevo Revendedor';
    if (!body) return;

    body.innerHTML = `<form class="iptvm-form" id="iptvm-reseller-form" onsubmit="return false">
      <div class="form-row">
        <div class="form-group">
          <label>Nombre Completo *</label>
          <input type="text" id="ireseller-name" value="${r?.name || ''}" placeholder="Nome do revendedor">
        </div>
        <div class="form-group">
          <label>Usuario (login) *</label>
          <input type="text" id="ireseller-username" value="${r?.username || ''}" placeholder="usuario123" ${id ? 'readonly style="opacity:0.6"' : ''}>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>${id ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
          <input type="password" id="ireseller-password" placeholder="mínimo 6 caracteres">
        </div>
        <div class="form-group">
          <label>Teléfono / WhatsApp</label>
          <input type="text" id="ireseller-phone" value="${r?.phone || ''}" placeholder="+595 9...">
        </div>
      </div>
      ${id ? `<div class="form-group">
        <label>Status</label>
        <select id="ireseller-active">
          <option value="true" ${r?.active !== false ? 'selected' : ''}>Ativo</option>
          <option value="false" ${r?.active === false ? 'selected' : ''}>Inativo</option>
        </select>
      </div>` : ''}
    </form>`;
  },

  async saveReseller() {
    const id = this._editingResellerId;
    const name = document.getElementById('ireseller-name')?.value?.trim();
    const username = document.getElementById('ireseller-username')?.value?.trim();
    const password = document.getElementById('ireseller-password')?.value;
    const phone = document.getElementById('ireseller-phone')?.value?.trim();

    if (!name) { Utils.toast('El nombre es obligatorio', 'error'); return; }
    if (!id && (!username || !password)) { Utils.toast('Usuario y contraseña son obligatorios', 'error'); return; }
    if (password && password.length < 6) { Utils.toast('La contraseña debe tener mínimo 6 caracteres', 'error'); return; }

    try {
      if (id) {
        const updates = { name, phone };
        if (password) updates.password = password;
        const activeEl = document.getElementById('ireseller-active');
        if (activeEl) updates.active = activeEl.value === 'true';
        await API.auth.updateUser(id, updates);
        Utils.toast('¡Revendedor actualizado!', 'success');
      } else {
        await API.auth.createUser({ username, name, password, phone, role: 'reseller' });
        Utils.toast('¡Revendedor creado! Ya puede iniciar sesión.', 'success');
      }
      Utils.closeModal('modal-iptvm-reseller-form');
      this.loadResellers();
    } catch (err) {
      Utils.toast(err.message || 'Error al guardar', 'error');
      console.error(err);
    }
  },

  async openResellerDetail(id, name) {
    Utils.openModal('modal-iptvm-reseller-detail');
    const body = document.getElementById('modal-iptvm-reseller-detail-body');
    const titleEl = document.getElementById('modal-iptvm-reseller-detail-title');
    if (titleEl) titleEl.textContent = name || 'Revendedor';
    if (!body) return;
    body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>`;

    try {
      const data = await API.iptvm.resellerSubscriptions(id);
      const { subs, stats } = data;

      const subsHtml = subs.length > 0 ? `
        <div class="iptvm-table-wrap">
          <table class="iptvm-table">
            <thead><tr><th>Cliente</th><th>Provedor</th><th>Dispositivo</th><th>Vencimiento</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              ${subs.map(s => `
                <tr onclick="Utils.closeModal('modal-iptvm-reseller-detail');IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                  <td><div class="iptvm-client-cell"><span class="iptvm-client-name">${s.client_name}</span><span class="iptvm-client-phone">${s.client_phone || ''}</span></div></td>
                  <td><span class="iptvm-badge ${s.provider}">${s.provider === 'lumix' ? 'Lumix TV' : 'STlive'}</span></td>
                  <td style="font-size:12px">${s.device_name || '—'}</td>
                  <td style="font-size:12px">${this._fmtDate(s.next_payment)}</td>
                  <td style="color:var(--accent3);font-weight:700">${this._fmtPrice(s.price)}</td>
                  <td>${this._payStatusBadge(s.payment_status)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` :
        `<div class="iptvm-empty"><i class="fas fa-satellite-dish"></i><p>Sin suscripciones cadastrada ainda</p></div>`;

      body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
          <div class="iptvm-stat"><div class="iptvm-stat-label">Total</div><div class="iptvm-stat-value blue">${stats.total}</div></div>
          <div class="iptvm-stat"><div class="iptvm-stat-label">Activas</div><div class="iptvm-stat-value green">${stats.active}</div></div>
          <div class="iptvm-stat"><div class="iptvm-stat-label">Vencidas</div><div class="iptvm-stat-value red">${stats.overdue}</div></div>
          <div class="iptvm-stat"><div class="iptvm-stat-label">Receita/mês</div><div class="iptvm-stat-value" style="font-size:16px;color:var(--accent3)">${this._fmtPrice(stats.monthlyRevenue)}</div></div>
        </div>
        <h4 style="font-size:13px;font-weight:800;margin-bottom:12px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;">
          <i class="fas fa-list" style="color:var(--accent3)"></i> Suscripciones
        </h4>
        ${subsHtml}`;
    } catch (err) {
      body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar datos</p></div>`;
      console.error(err);
    }
  },

  async deleteReseller(id, name) {
    if (!confirm(`¿Eliminar al revendedor "${name}"? Esta acción no puede deshacerse.`)) return;
    try {
      await API.auth.deleteUser(id);
      Utils.toast('Revendedor eliminado', 'success');
      this.loadResellers();
    } catch (err) {
      Utils.toast('Error al eliminar', 'error');
    }
  },

  // ── Helpers ───────────────────────────────────────────────

  _inAdminPanel() {
    return this._currentSection.startsWith('admin-iptvm');
  },

  _payStatusBadge(status) {
    const map = {
      paid: ['paid', 'Pago'],
      overdue: ['overdue', 'Vencido'],
      due_soon: ['due_soon', 'Vence em breve'],
      pending: ['pending', 'Pendente'],
    };
    const [cls, label] = map[status] || ['pending', status || 'Pendente'];
    return `<span class="iptvm-badge ${cls}">${label}</span>`;
  },

  _fmtDate(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return str; }
  },

  _fmtDatetime(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return str; }
  },

  _fmtPrice(val) {
    if (!val && val !== 0) return '—';
    return '₲ ' + Number(val).toLocaleString('pt-BR');
  },
};
