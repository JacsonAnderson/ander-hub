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
      'iptvm-subscriptions': 'Minhas Assinaturas',
      'admin-iptvm-dashboard': 'Dashboard IPTV',
      'admin-iptvm-subscriptions': 'Assinaturas IPTV',
      'admin-iptvm-accounts': 'Contas de Provedor',
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
            <div class="iptvm-stat-label">Total Assinaturas</div>
            <div class="iptvm-stat-value blue">${data.total}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Ativas</div>
            <div class="iptvm-stat-value green">${data.active}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Vencidas</div>
            <div class="iptvm-stat-value red">${data.overdue}</div>
          </div>
          <div class="iptvm-stat">
            <div class="iptvm-stat-label">Vencem em 5 dias</div>
            <div class="iptvm-stat-value yellow">${data.dueSoon}</div>
          </div>
        </div>`;

      // Alert banner
      let alertHtml = '';
      if (data.overdue > 0) {
        alertHtml = `<div class="iptvm-alert">
          <i class="fas fa-exclamation-triangle"></i>
          <div class="iptvm-alert-text"><strong>${data.overdue} assinatura(s) vencida(s)</strong> — entre em contato com os clientes.</div>
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
        : `<div class="iptvm-empty"><i class="fas fa-satellite-dish"></i><p>Nenhuma assinatura ainda</p></div>`;

      const overdueHtml = data.overdueList.length > 0
        ? `<table class="iptvm-table">
            <thead><tr><th>Cliente</th><th>Vencimento</th><th>Valor</th></tr></thead>
            <tbody>${data.overdueList.map(s => `
              <tr onclick="IPTVM.openSubDetail('${s.id}')" style="cursor:pointer;">
                <td><div class="iptvm-client-cell"><span class="iptvm-client-name">${s.client_name}</span><span class="iptvm-client-phone">${s.client_phone || ''}</span></div></td>
                <td style="color:var(--red)">${this._fmtDate(s.next_payment)}</td>
                <td style="color:var(--accent3);font-weight:700;">${this._fmtPrice(s.price)}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
        : `<div class="iptvm-empty"><i class="fas fa-check-circle"></i><p>Nenhum pagamento vencido!</p></div>`;

      el.innerHTML = `
        ${alertHtml}
        ${statsHtml}
        <div class="iptvm-two-col">
          <div class="iptvm-panel-card">
            <h4><i class="fas fa-chart-pie"></i> Por Provedor</h4>
            ${providerHtml}
            <div class="iptvm-revenue" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border2)">
              <div class="iptvm-revenue-value">${this._fmtPrice(data.monthlyRevenue)}</div>
              <div class="iptvm-revenue-label">Receita mensal estimada</div>
            </div>
          </div>
          <div class="iptvm-panel-card">
            <h4><i class="fas fa-exclamation-circle"></i> Vencidas</h4>
            ${overdueHtml}
          </div>
        </div>
        <div class="iptvm-panel-card">
          <h4><i class="fas fa-clock"></i> Assinaturas Recentes</h4>
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

    el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Carregando...</p></div>`;

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.search) params.set('search', filters.search);

      this._subs = await API.iptvm.subscriptions(params.toString());

      if (this._subs.length === 0) {
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-satellite-dish"></i><p>Nenhuma assinatura encontrada</p></div>`;
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
                      <button class="btn-edit" title="Ver detalhes" onclick="IPTVM.openSubDetail('${s.id}')"><i class="fas fa-eye"></i></button>
                      <button class="btn-pay" style="padding:5px 8px;font-size:11px;" title="Registrar pagamento" onclick="IPTVM.openPayModal('${s.id}')"><i class="fas fa-dollar-sign"></i></button>
                      ${isAdm ? `<button class="btn-del" title="Excluir" onclick="IPTVM.deleteSub('${s.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar assinaturas</p></div>`;
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

  openSubForm(id = null) {
    this._editingSubId = id;
    const sub = id ? this._subs.find(s => s.id === id) : null;
    const isAdm = Auth.isAdmin;

    const providerOptions = `
      <option value="lumix" ${sub?.provider === 'lumix' ? 'selected' : ''}>Lumix TV (1 crédito = 4 portas)</option>
      <option value="stlive" ${sub?.provider === 'stlive' ? 'selected' : ''}>STlive (1 crédito = 1 tela)</option>`;

    const portOptions = [1,2,3,4].map(n => `<option value="${n}" ${sub?.port == n ? 'selected' : ''}>Porta ${n}</option>`).join('');

    Utils.openModal('modal-iptvm-sub-form');
    const title = document.getElementById('modal-iptvm-sub-title');
    if (title) title.textContent = id ? 'Editar Assinatura' : 'Nova Assinatura';

    const body = document.getElementById('modal-iptvm-sub-body');
    if (!body) return;

    body.innerHTML = `<form class="iptvm-form" id="iptvm-sub-form" onsubmit="return false">
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Cliente *</label>
          <input type="text" id="isub-name" value="${sub?.client_name || ''}" placeholder="Nome completo" required>
        </div>
        <div class="form-group">
          <label>Telefone / WhatsApp</label>
          <input type="text" id="isub-phone" value="${sub?.client_phone || ''}" placeholder="+595 9...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Provedor *</label>
          <select id="isub-provider" onchange="IPTVM._togglePortField(this.value)">${providerOptions}</select>
        </div>
        <div class="form-group" id="isub-port-group" style="${(sub?.provider !== 'lumix' && !sub) ? 'display:none' : ''}">
          <label>Porta (Lumix)</label>
          <select id="isub-port"><option value="">— Nenhuma —</option>${portOptions}</select>
        </div>
      </div>
      ${isAdm ? `
      <div class="iptvm-form-section-title">Dados da Conta (Admin)</div>
      <div class="form-row">
        <div class="form-group">
          <label>Usuário da Conta</label>
          <input type="text" id="isub-acc-user" value="${sub?.account_user || ''}" placeholder="login@provedor.com">
        </div>
        <div class="form-group">
          <label>Senha da Conta</label>
          <input type="text" id="isub-acc-pass" value="${sub?.account_pass || ''}" placeholder="senha">
        </div>
      </div>` : ''}
      <div class="iptvm-form-section-title">Dispositivo e Pagamento</div>
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Dispositivo</label>
          <input type="text" id="isub-device" value="${sub?.device_name || ''}" placeholder="TV Samsung, Celular...">
        </div>
        <div class="form-group">
          <label>Valor Mensal (₲)</label>
          <input type="number" id="isub-price" value="${sub?.price || ''}" placeholder="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Próximo Vencimento</label>
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
      ${isAdm && !id ? `
      <div class="iptvm-form-section-title">Revendedor</div>
      <div class="form-row">
        <div class="form-group">
          <label>ID do Revendedor</label>
          <input type="text" id="isub-reseller-id" placeholder="Deixe vazio para você mesmo">
        </div>
        <div class="form-group">
          <label>Nome do Revendedor</label>
          <input type="text" id="isub-reseller-name" placeholder="Nome">
        </div>
      </div>` : ''}
      <div class="form-group">
        <label>Observações</label>
        <textarea id="isub-notes" placeholder="Notas internas...">${sub?.notes || ''}</textarea>
      </div>
    </form>`;

    // Set initial port field visibility
    this._togglePortField(sub?.provider || 'lumix');
  },

  _togglePortField(provider) {
    const group = document.getElementById('isub-port-group');
    if (group) group.style.display = provider === 'lumix' ? '' : 'none';
  },

  async saveSub() {
    const isAdm = Auth.isAdmin;
    const provider = document.getElementById('isub-provider')?.value;
    const data = {
      client_name: document.getElementById('isub-name')?.value?.trim(),
      client_phone: document.getElementById('isub-phone')?.value?.trim(),
      provider,
      port: provider === 'lumix' ? (document.getElementById('isub-port')?.value || null) : null,
      device_name: document.getElementById('isub-device')?.value?.trim(),
      price: document.getElementById('isub-price')?.value,
      next_payment: document.getElementById('isub-next-payment')?.value,
      notes: document.getElementById('isub-notes')?.value?.trim(),
    };

    if (isAdm) {
      data.account_user = document.getElementById('isub-acc-user')?.value?.trim();
      data.account_pass = document.getElementById('isub-acc-pass')?.value?.trim();
      const statusEl = document.getElementById('isub-status');
      if (statusEl) data.status = statusEl.value;
      const rId = document.getElementById('isub-reseller-id')?.value?.trim();
      const rName = document.getElementById('isub-reseller-name')?.value?.trim();
      if (rId) data.reseller_id = rId;
      if (rName) data.reseller_name = rName;
    }

    if (!data.client_name || !data.provider) {
      Utils.toast('Nome e provedor são obrigatórios', 'error'); return;
    }

    try {
      if (this._editingSubId) {
        await API.iptvm.updateSubscription(this._editingSubId, data);
        Utils.toast('Assinatura atualizada!', 'success');
      } else {
        await API.iptvm.createSubscription(data);
        Utils.toast('Assinatura criada!', 'success');
      }
      Utils.closeModal('modal-iptvm-sub-form');
      this.loadSubscriptions();
      this.loadDashboard();
    } catch (err) {
      Utils.toast('Erro ao salvar assinatura', 'error');
      console.error(err);
    }
  },

  async deleteSub(id) {
    if (!confirm('Excluir esta assinatura? Esta ação não pode ser desfeita.')) return;
    try {
      await API.iptvm.deleteSubscription(id);
      Utils.toast('Assinatura removida', 'success');
      this.loadSubscriptions();
      this.loadDashboard();
    } catch (err) {
      Utils.toast('Erro ao excluir', 'error');
    }
  },

  // ── Sub Detail ────────────────────────────────────────────

  async openSubDetail(id) {
    this._viewingSubId = id;
    Utils.openModal('modal-iptvm-sub-detail');
    const body = document.getElementById('modal-iptvm-sub-detail-body');
    if (!body) return;
    body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-spinner fa-spin"></i><p>Carregando...</p></div>`;

    try {
      const sub = await API.iptvm.getSubscription(id);
      const isAdm = Auth.isAdmin;
      const history = sub.payment_history || [];

      const historyHtml = history.length > 0
        ? history.map(h => `
          <div class="pay-history-item">
            <div class="pay-history-dot ${h.type}"></div>
            <div class="pay-history-info">
              <div class="pay-history-type">${h.type === 'registration' ? 'Cadastro' : 'Pagamento'}</div>
              <div class="pay-history-date">${this._fmtDatetime(h.paid_at)}${h.next_payment ? ` — Próx.: ${this._fmtDate(h.next_payment)}` : ''}</div>
              ${h.notes ? `<div class="pay-history-notes">${h.notes}</div>` : ''}
            </div>
            <div class="pay-history-amount">${this._fmtPrice(h.amount)}</div>
          </div>`).join('')
        : `<div class="iptvm-empty" style="padding:20px"><i class="fas fa-history"></i><p>Sem histórico</p></div>`;

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
            <div class="sub-detail-card-title">Informações da Assinatura</div>
            <div class="sub-detail-row"><span class="sub-detail-label">Dispositivo</span><span class="sub-detail-value">${sub.device_name || '—'}</span></div>
            ${sub.port ? `<div class="sub-detail-row"><span class="sub-detail-label">Porta</span><span class="sub-detail-value"><span class="port-dot">${sub.port}</span></span></div>` : ''}
            <div class="sub-detail-row"><span class="sub-detail-label">Valor</span><span class="sub-detail-value" style="color:var(--accent3)">${this._fmtPrice(sub.price)}</span></div>
            <div class="sub-detail-row"><span class="sub-detail-label">Próx. Vencimento</span><span class="sub-detail-value">${this._fmtDate(sub.next_payment)}</span></div>
            <div class="sub-detail-row"><span class="sub-detail-label">Cadastrado em</span><span class="sub-detail-value">${this._fmtDate(sub.registered_at)}</span></div>
            ${isAdm ? `<div class="sub-detail-row"><span class="sub-detail-label">Revendedor</span><span class="sub-detail-value">${sub.reseller_name || '—'}</span></div>` : ''}
            ${sub.notes ? `<div class="sub-detail-row"><span class="sub-detail-label">Obs.</span><span class="sub-detail-value">${sub.notes}</span></div>` : ''}
          </div>
          ${isAdm ? `
          <div class="sub-detail-card">
            <div class="sub-detail-card-title">Dados da Conta (Confidencial)</div>
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
          <h4><i class="fas fa-history"></i> Histórico de Pagamentos</h4>
          <div class="pay-history">${historyHtml}</div>
        </div>`;
    } catch (err) {
      body.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar detalhes</p></div>`;
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
            <label>Próximo Vencimento *</label>
            <input type="date" id="ipay-next" value="${nextStr}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Observações</label>
          <input type="text" id="ipay-notes" placeholder="Pago via Pix, etc.">
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
    if (!data.next_payment) { Utils.toast('Data obrigatória', 'error'); return; }

    try {
      await API.iptvm.registerPayment(id, data);
      Utils.toast('Pagamento registrado!', 'success');
      Utils.closeModal('modal-iptvm-pay');
      this.loadSubscriptions();
      this.loadDashboard();
      // If detail modal is open, refresh it
      if (this._viewingSubId === id) this.openSubDetail(id);
    } catch (err) {
      Utils.toast('Erro ao registrar pagamento', 'error');
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
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-server"></i><p>Nenhuma conta cadastrada</p></div>`;
        return;
      }

      el.innerHTML = accounts.map(a => `
        <div class="account-card">
          <div class="account-provider-badge ${a.provider}">${a.provider === 'lumix' ? 'LMX' : 'STL'}</div>
          <div class="account-info">
            <div class="account-user">${a.account_user}</div>
            <div class="account-pass">${a.account_pass || '••••••••'}</div>
            <div class="account-meta">${a.provider === 'lumix' ? `${a.max_ports} portas` : '1 tela'} · Custo: ${this._fmtPrice(a.cost_price)}</div>
          </div>
          <div class="account-actions">
            <button class="btn-edit" onclick="IPTVM.openAccountForm('${a.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-del" onclick="IPTVM.deleteAccount('${a.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('');
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar contas</p></div>`;
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
      if (title) title.textContent = id ? 'Editar Conta' : 'Nova Conta de Provedor';

      body.innerHTML = `<form class="iptvm-form" id="iptvm-account-form" onsubmit="return false">
        <div class="form-row">
          <div class="form-group">
            <label>Provedor *</label>
            <select id="iacc-provider" onchange="IPTVM._toggleMaxPorts(this.value)">
              <option value="lumix" ${a?.provider === 'lumix' ? 'selected' : ''}>Lumix TV</option>
              <option value="stlive" ${a?.provider === 'stlive' ? 'selected' : ''}>STlive</option>
            </select>
          </div>
          <div class="form-group" id="iacc-maxports-group">
            <label>Máx. Portas (Lumix)</label>
            <input type="number" id="iacc-maxports" value="${a?.max_ports || 4}" min="1" max="8">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Usuário *</label>
            <input type="text" id="iacc-user" value="${a?.account_user || ''}" placeholder="login@provedor.com">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="text" id="iacc-pass" value="${a?.account_pass || ''}" placeholder="senha">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Custo de Compra (₲)</label>
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
      Utils.toast('Provedor e usuário são obrigatórios', 'error'); return;
    }

    try {
      if (this._editingAccountId) {
        await API.iptvm.updateAccount(this._editingAccountId, data);
        Utils.toast('Conta atualizada!', 'success');
      } else {
        await API.iptvm.createAccount(data);
        Utils.toast('Conta criada!', 'success');
      }
      Utils.closeModal('modal-iptvm-account-form');
      this.loadAccounts();
    } catch (err) {
      Utils.toast('Erro ao salvar conta', 'error');
      console.error(err);
    }
  },

  async deleteAccount(id) {
    if (!confirm('Excluir esta conta de provedor?')) return;
    try {
      await API.iptvm.deleteAccount(id);
      Utils.toast('Conta removida', 'success');
      this.loadAccounts();
    } catch (err) {
      Utils.toast('Erro ao excluir', 'error');
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
        el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-users"></i><p>Nenhum revendedor cadastrado ainda.</p></div>`;
        return;
      }

      el.innerHTML = `
        <div class="iptvm-table-wrap">
          <table class="iptvm-table">
            <thead><tr><th>Nome</th><th>Usuário</th><th>Telefone</th><th>Status</th><th>Criado em</th><th></th></tr></thead>
            <tbody>
              ${resellers.map(r => `
                <tr>
                  <td style="font-weight:700">${r.name || '—'}</td>
                  <td style="font-size:12px;color:var(--text3);font-family:monospace">${r.username || '—'}</td>
                  <td style="font-size:12px;color:var(--text3)">${r.phone || '—'}</td>
                  <td><span class="iptvm-badge ${r.active !== false ? 'active' : 'inactive'}">${r.active !== false ? 'Ativo' : 'Inativo'}</span></td>
                  <td style="font-size:12px;color:var(--text3)">${this._fmtDate(r.created_at)}</td>
                  <td>
                    <div class="iptvm-row-actions">
                      <button class="btn-edit" title="Editar" onclick="IPTVM.openResellerForm('${r.id}')"><i class="fas fa-edit"></i></button>
                      <button class="btn-del" title="Excluir" onclick="IPTVM.deleteReseller('${r.id}','${r.name}')"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div class="iptvm-empty"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar revendedores</p></div>`;
    }
  },

  openResellerForm(id = null) {
    this._editingResellerId = id;
    const r = id ? this._resellers.find(u => u.id === id) : null;
    Utils.openModal('modal-iptvm-reseller-form');
    const title = document.getElementById('modal-iptvm-reseller-title');
    const body = document.getElementById('modal-iptvm-reseller-body');
    if (title) title.textContent = id ? 'Editar Revendedor' : 'Novo Revendedor';
    if (!body) return;

    body.innerHTML = `<form class="iptvm-form" id="iptvm-reseller-form" onsubmit="return false">
      <div class="form-row">
        <div class="form-group">
          <label>Nome Completo *</label>
          <input type="text" id="ireseller-name" value="${r?.name || ''}" placeholder="Nome do revendedor">
        </div>
        <div class="form-group">
          <label>Usuário (login) *</label>
          <input type="text" id="ireseller-username" value="${r?.username || ''}" placeholder="usuario123" ${id ? 'readonly style="opacity:0.6"' : ''}>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>${id ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha *'}</label>
          <input type="password" id="ireseller-password" placeholder="mínimo 6 caracteres">
        </div>
        <div class="form-group">
          <label>Telefone / WhatsApp</label>
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

    if (!name) { Utils.toast('Nome é obrigatório', 'error'); return; }
    if (!id && (!username || !password)) { Utils.toast('Usuário e senha são obrigatórios', 'error'); return; }
    if (password && password.length < 6) { Utils.toast('Senha deve ter mínimo 6 caracteres', 'error'); return; }

    try {
      if (id) {
        const updates = { name, phone };
        if (password) updates.password = password;
        const activeEl = document.getElementById('ireseller-active');
        if (activeEl) updates.active = activeEl.value === 'true';
        await API.auth.updateUser(id, updates);
        Utils.toast('Revendedor atualizado!', 'success');
      } else {
        await API.auth.createUser({ username, name, password, phone, role: 'reseller' });
        Utils.toast('Revendedor criado! Ele já pode fazer login.', 'success');
      }
      Utils.closeModal('modal-iptvm-reseller-form');
      this.loadResellers();
    } catch (err) {
      Utils.toast(err.message || 'Erro ao salvar', 'error');
      console.error(err);
    }
  },

  async deleteReseller(id, name) {
    if (!confirm(`Excluir o revendedor "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await API.auth.deleteUser(id);
      Utils.toast('Revendedor removido', 'success');
      this.loadResellers();
    } catch (err) {
      Utils.toast('Erro ao excluir', 'error');
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
