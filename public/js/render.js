// js/render.js - Renderizado de secciones públicas
const Render = {

  // ===== PRODUCTOS =====
  async products() {
    try {
      const recent = await API.products.recent();
      const grid = document.getElementById('products-grid');
      if (grid) grid.innerHTML = recent.map(p => this._productCard(p)).join('');
    } catch (err) { console.error('Error loading products:', err); }
  },

  async productsCatalog() {
    try {
      const { data } = await API.products.list();
      const grid = document.getElementById('catalog-grid');
      if (grid) grid.innerHTML = data.map(p => this._productCard(p)).join('');
    } catch (err) { console.error('Error loading catalog:', err); }
  },

  _productCard(prod) {
    const wa = Utils.getWhatsAppLink(`Hola Jacson, me interesa el producto: ${prod.name}`);
    const hasImage = prod.cover_image && prod.cover_image !== '';
    const imgHtml = hasImage
      ? `<img src="${prod.cover_image}" alt="${prod.name}" class="prod-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="prod-img" style="display:none">${prod.emoji || '📦'}</div>`
      : `<div class="prod-img">${prod.emoji || '📦'}</div>`;
    return `<div class="card product-card" onclick="Render.openProductDetail('${prod.id}')" style="cursor:pointer;">
      ${imgHtml}
      <div class="prod-badge">${prod.category || 'Producto'}</div>
      <div class="prod-name">${prod.name}</div>
      <div class="prod-desc">${prod.description || ''}</div>
      <div class="prod-actions" onclick="event.stopPropagation()">
        <a href="${wa}" target="_blank" class="btn-wa-small"><i class="fab fa-whatsapp"></i> Consultar</a>
        <button class="btn-ver-detalle" onclick="event.stopPropagation(); Render.openProductDetail('${prod.id}')"><i class="fas fa-eye"></i> Ver</button>
      </div>
    </div>`;
  },

  // ===== PRODUCT DETAIL =====
  async openProductDetail(id) {
    try {
      const prod = await API.products.get(id);
      const wa = Utils.getWhatsAppLink(`Hola Jacson, me interesa el producto: ${prod.name}`);
      const images = prod.images || [];
      const specs = Array.isArray(prod.specifications) ? prod.specifications : [];

      // Galería de imágenes
      let galleryHtml = '';
      if (images.length > 0) {
        galleryHtml = `
          <div class="pd-gallery">
            <div class="pd-main-img">
              <img src="${images[0].url}" alt="${prod.name}" id="pd-main-photo" onclick="Render.openLightbox(this.src)">
            </div>
            ${images.length > 1 ? `<div class="pd-thumbs">${images.map((img, i) => `<img src="${img.url}" alt="" class="pd-thumb ${i === 0 ? 'active' : ''}" onclick="Render.setMainImage(this, '${img.url}')" loading="lazy">`).join('')}</div>` : ''}
          </div>`;
      } else {
        galleryHtml = `<div class="pd-gallery"><div class="pd-main-img pd-emoji-bg">${prod.emoji || '📦'}</div></div>`;
      }

      // Especificaciones
      let specsHtml = '';
      if (specs.length > 0) {
        specsHtml = `<div class="pd-specs">
          <h4><i class="fas fa-list-ul"></i> Especificaciones</h4>
          <div class="pd-specs-list">${specs.map(s => {
            const parts = s.split(':');
            return parts.length > 1
              ? `<div class="pd-spec-row"><span class="pd-spec-label">${parts[0].trim()}</span><span class="pd-spec-value">${parts.slice(1).join(':').trim()}</span></div>`
              : `<div class="pd-spec-row"><span class="pd-spec-value" style="grid-column:1/-1;">${s}</span></div>`;
          }).join('')}</div>
        </div>`;
      }

      const body = document.getElementById('product-detail-body');
      if (!body) return;
      body.innerHTML = `
        <div class="pd-container">
          ${galleryHtml}
          <div class="pd-info">
            <div class="prod-badge">${prod.category || 'Producto'}</div>
            <h2 class="pd-title">${prod.name}</h2>
            <p class="pd-short-desc">${prod.description || ''}</p>
            ${prod.long_description ? `<div class="pd-long-desc">${prod.long_description}</div>` : ''}
            ${specsHtml}
            <div class="pd-actions">
              <a href="${wa}" target="_blank" class="btn-whatsapp" style="flex:1;justify-content:center;animation:none;">
                <i class="fab fa-whatsapp"></i> Consultar Precio por WhatsApp
              </a>
            </div>
          </div>
        </div>`;
      Utils.openModal('modal-product-detail');
    } catch (err) {
      Utils.toast('Error al cargar producto', 'error');
      console.error(err);
    }
  },

  setMainImage(thumb, url) {
    const main = document.getElementById('pd-main-photo');
    if (main) main.src = url;
    document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  },

  openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${src}" class="lightbox-img"><button class="lightbox-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  },

  // ===== SERVICIOS =====
  async services() {
    try {
      const services = await API.services.list();
      const html = services.map(s => this._serviceCard(s)).join('');
      const grid = document.getElementById('services-grid');
      const modalGrid = document.getElementById('services-modal-grid');
      if (grid) grid.innerHTML = html;
      if (modalGrid) modalGrid.innerHTML = html;
    } catch (err) { console.error('Error loading services:', err); }
  },

  _serviceCard(s) {
    const wa = Utils.getWhatsAppLink(`Hola, necesito el servicio: ${s.name}`);
    const features = Array.isArray(s.features) ? s.features : [];
    return `<div class="card service-card">
      <div class="service-icon"><i class="fas ${s.icon || 'fa-tools'}"></i></div>
      <div class="service-title">${s.name}</div>
      <div class="service-desc">${s.description || ''}</div>
      <ul class="service-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
      <a href="${wa}" target="_blank" class="btn-wa-small"><i class="fab fa-whatsapp"></i> Solicitar Servicio</a>
    </div>`;
  },

  // ===== IPTV =====
  async iptv() {
    try {
      const plans = await API.iptv.list();
      const grid = document.getElementById('iptv-grid');
      if (grid) grid.innerHTML = plans.map(p => this._iptvCard(p)).join('');
    } catch (err) { console.error('Error loading IPTV:', err); }
  },

  _iptvCard(p) {
    const wa = Utils.getWhatsAppLink(`Hola, me interesa el plan IPTV: ${p.name}`);
    return `<div class="iptv-card ${p.featured ? 'featured' : ''}">
      <div class="iptv-name">${p.name}</div>
      <div style="color:var(--text2);font-size:13px;">Plan mensual</div>
      <div class="iptv-price">₲ ${p.price}<span>/ ${p.period || 'mes'}</span></div>
      <ul class="iptv-features">
        <li><i class="fas fa-tv"></i> ${p.channels || ''}</li>
        <li><i class="fas fa-film"></i> ${p.vod || ''}</li>
        <li><i class="fas fa-users"></i> ${p.connections || ''}</li>
        <li><i class="fas fa-calendar-alt"></i> ${p.epg || ''}</li>
        <li><i class="fas fa-headset"></i> ${p.support || ''}</li>
        <li><i class="fas fa-sync"></i> ${p.update_info || ''}</li>
      </ul>
      <a href="${wa}" target="_blank" class="btn-wa-small" style="justify-content:center;width:100%;"><i class="fab fa-whatsapp"></i> Contratar Plan</a>
    </div>`;
  },

  // ===== HERRAMIENTAS =====
  async tools() {
    try {
      const tools = await API.tools.list();
      const make = items => items.map(t => `<div class="card tool-card">
        <div class="tool-icon"><i class="fas ${t.icon || 'fa-download'}"></i></div>
        <div class="tool-info">
          <div class="tool-name">${t.name}</div>
          <div class="tool-desc">${t.description || ''}</div>
          <div class="tool-meta">${t.file_type || ''} · ${t.file_size || ''}</div>
        </div>
        <a href="${t.download_link || '#'}" target="_blank" class="btn-download" onclick="API.tools.download('${t.id}')"><i class="fas fa-download"></i> Descargar</a>
      </div>`).join('');
      const grid = document.getElementById('tools-grid');
      const modalGrid = document.getElementById('tools-modal-grid');
      if (grid) grid.innerHTML = make(tools.slice(0, 4));
      if (modalGrid) modalGrid.innerHTML = make(tools);
    } catch (err) { console.error('Error loading tools:', err); }
  },

  // ===== REDES SOCIALES =====
  async social() {
    try {
      const social = await API.social.list();
      const grid = document.getElementById('social-grid');
      if (grid) grid.innerHTML = social.map(s => `<div class="card social-card">
        <div class="social-card-icon" style="background:${s.color}22;border:1px solid ${s.color}44;">
          <i class="${s.icon}" style="color:${s.color};"></i>
        </div>
        <div class="social-card-info">
          <div class="social-card-name">${s.name}</div>
          <div class="social-card-user">${s.username || ''}</div>
          <div class="social-card-stats">${s.followers || ''}</div>
        </div>
        <a href="${s.link || '#'}" target="_blank" class="btn-follow" style="background:${s.color}22;border:1px solid ${s.color}44;color:${s.color};">
          <i class="fas fa-external-link-alt"></i> Seguir
        </a>
      </div>`).join('');
    } catch (err) { console.error('Error loading social:', err); }
  },

  // ===== PROYECTOS =====
  async projects() {
    try {
      const projects = await API.projects.list();
      const make = items => items.map(p => {
        const tech = Array.isArray(p.technologies) ? p.technologies : [];
        return `<div class="card project-card">
          <div class="project-tag" style="background:${p.color}22;border:1px solid ${p.color}44;color:${p.color};">${p.tag || ''}</div>
          <div class="project-title">${p.name}</div>
          <div class="project-desc">${p.description || ''}</div>
          <div class="tech-stack">${tech.map(t => `<span class="tech-badge">${t}</span>`).join('')}</div>
          <div class="project-links">
            <a href="${p.demo_link || '#'}" target="_blank" class="btn-project demo"><i class="fas fa-external-link-alt"></i> Demo</a>
            <a href="${p.code_link || '#'}" target="_blank" class="btn-project code"><i class="fab fa-github"></i> Código</a>
          </div>
        </div>`;
      }).join('');
      const grid = document.getElementById('projects-grid');
      const modalGrid = document.getElementById('projects-modal-grid');
      if (grid) grid.innerHTML = make(projects.slice(0, 3));
      if (modalGrid) modalGrid.innerHTML = make(projects);
    } catch (err) { console.error('Error loading projects:', err); }
  },

  // ===== VIDEOS =====
  async videos() {
    try {
      const videos = await API.videos.list();
      const make = items => items.map(v => `<div class="card video-card">
        <a href="${v.video_link || '#'}" target="_blank" class="video-thumb">
          <div class="video-play"><i class="fas fa-play"></i></div>
        </a>
        <div class="video-title">${v.name}</div>
        <div class="video-meta"><span class="badge badge-blue">${v.category || ''}</span> · ${v.description || ''}</div>
      </div>`).join('');
      const grid = document.getElementById('videos-grid');
      const modalGrid = document.getElementById('videos-modal-grid');
      if (grid) grid.innerHTML = make(videos.slice(0, 3));
      if (modalGrid) modalGrid.innerHTML = make(videos);
    } catch (err) { console.error('Error loading videos:', err); }
  },

  // ===== CONFIG STATS =====
  async heroStats() {
    const cfg = Utils.siteConfig;
    const el1 = document.getElementById('stat-clients');
    const el2 = document.getElementById('stat-exp');
    if (el1) el1.textContent = (cfg.clients_stat || '120') + '+';
    if (el2) el2.textContent = (cfg.experience_years || '5') + '+';
  },

  // ===== RENDER ALL =====
  async all() {
    await Promise.all([
      this.products(),
      this.services(),
      this.iptv(),
      this.tools(),
      this.social(),
      this.projects(),
      this.videos(),
      this.heroStats()
    ]);
  }
};
