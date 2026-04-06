// js/utils.js - Utilidades generales
const Utils = {
  siteConfig: {},

  async loadConfig() {
    try {
      this.siteConfig = await API.config.get();
    } catch {
      this.siteConfig = { phone: '595XXXXXXXXX', clients_stat: '120', experience_years: '5' };
    }
  },

  // === TOAST ===
  toast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = msg;
    const container = document.getElementById('toast-container');
    if (container) {
      container.appendChild(div);
      setTimeout(() => div.remove(), 3500);
    }
  },

  // === MODALS ===
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  },
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },
  initModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
    });
  },

  // === SIDEBAR ===
  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('show');
  },
  scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (window.innerWidth <= 900) this.toggleSidebar();
  },

  // === FORMATTING ===
  formatGs(n) {
    return Number(n || 0).toLocaleString('es-PY');
  },

  getWhatsAppLink(msg) {
    const phone = this.siteConfig.phone || '595XXXXXXXXX';
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  },

  // === SCROLL HIGHLIGHT ===
  initScrollHighlight() {
    const sections = ['about', 'productos', 'servicios', 'iptv', 'herramientas', 'social-media', 'proyectos', 'videos'];
    window.addEventListener('scroll', () => {
      const links = document.querySelectorAll('.sidebar-nav .nav-link');
      sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el || !links[idx]) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) {
          links.forEach(l => l.classList.remove('active'));
          links[idx].classList.add('active');
        }
      });
    }, { passive: true });
  },

  // === DATE HELPERS ===
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  todayISO() {
    return new Date().toISOString().split('T')[0];
  },
  getSpanishDate() {
    return new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
};
