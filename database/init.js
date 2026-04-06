// database/init.js
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ander.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  // ==================== TABLAS ====================
  db.exec(`
    -- Usuarios (admin y clientes)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      city TEXT DEFAULT '',
      type TEXT DEFAULT 'Cliente',
      role TEXT DEFAULT 'client',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Productos
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      long_description TEXT DEFAULT '',
      specifications TEXT DEFAULT '[]',
      emoji TEXT DEFAULT '📦',
      image_url TEXT DEFAULT '',
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      purchase_link TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Imágenes de productos (galería múltiple)
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      image_path TEXT DEFAULT '',
      caption TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_cover INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Servicios
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'fa-tools',
      description TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Planes IPTV
    CREATE TABLE IF NOT EXISTS iptv_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price TEXT DEFAULT '0',
      period TEXT DEFAULT 'mes',
      featured INTEGER DEFAULT 0,
      channels TEXT DEFAULT '',
      vod TEXT DEFAULT '',
      connections TEXT DEFAULT '',
      epg TEXT DEFAULT '',
      support TEXT DEFAULT '',
      update_info TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Herramientas / Descargas
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'fa-download',
      description TEXT DEFAULT '',
      file_type TEXT DEFAULT '',
      file_size TEXT DEFAULT '',
      download_link TEXT DEFAULT '',
      downloads INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Redes Sociales
    CREATE TABLE IF NOT EXISTS social_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      color TEXT DEFAULT '#00c8ff',
      link TEXT DEFAULT '',
      followers TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Proyectos de Desarrollo
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tag TEXT DEFAULT '',
      color TEXT DEFAULT '#00c8ff',
      description TEXT DEFAULT '',
      technologies TEXT DEFAULT '[]',
      demo_link TEXT DEFAULT '',
      code_link TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Videos / Edición
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      video_link TEXT DEFAULT '',
      thumbnail_url TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Pagos / Ganancias
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      client_name TEXT DEFAULT '',
      service_id INTEGER,
      service_name TEXT DEFAULT '',
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      concept TEXT DEFAULT '',
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      status TEXT DEFAULT 'Pendiente',
      delivery_status TEXT DEFAULT '',
      payment_date DATE DEFAULT CURRENT_DATE,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    -- Media de pagos/trabajos (fotos y videos del trabajo realizado)
    CREATE TABLE IF NOT EXISTS payment_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      media_type TEXT DEFAULT 'image',
      media_url TEXT DEFAULT '',
      media_path TEXT DEFAULT '',
      caption TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    );

    -- Documentos de Clientes
    CREATE TABLE IF NOT EXISTS client_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_path TEXT DEFAULT '',
      drive_link TEXT DEFAULT '',
      doc_type TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Configuración del sitio
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );

    -- Sesiones activas
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ==================== MIGRACIONES (para bases de datos existentes) ====================
  // Agrega columnas que faltan sin perder datos
  function addColumnIfMissing(table, column, definition) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes(column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`  ✚ Columna ${table}.${column} agregada`);
      }
    } catch (err) {
      // Tabla no existe aún, se creará con CREATE TABLE
    }
  }

  // Productos - columnas nuevas
  addColumnIfMissing('products', 'long_description', "TEXT DEFAULT ''");
  addColumnIfMissing('products', 'specifications', "TEXT DEFAULT '[]'");

  // Pagos - columnas nuevas
  addColumnIfMissing('payments', 'service_id', 'INTEGER');
  addColumnIfMissing('payments', 'service_name', "TEXT DEFAULT ''");
  addColumnIfMissing('payments', 'product_id', 'INTEGER');
  addColumnIfMissing('payments', 'product_name', "TEXT DEFAULT ''");
  addColumnIfMissing('payments', 'delivery_status', "TEXT DEFAULT ''");

  // IPTV - asegurar columna update_info
  addColumnIfMissing('iptv_plans', 'update_info', "TEXT DEFAULT ''");

  // Crear tablas nuevas si no existen (product_images, payment_media)
  // Ya están en el CREATE TABLE IF NOT EXISTS arriba

  console.log('  ✅ Migraciones completadas');

  // ==================== SEED DATA ====================
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync(process.env.ADMIN_PASS || 'Ander@2024', 10);
    db.prepare(`
      INSERT INTO users (username, password, name, phone, email, city, type, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('jacsonander', adminHash, 'Jacson Ander', '595XXXXXXXXX', 'contacto@jacsonander.com', 'Paraguay', 'Admin', 'admin');
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, description, long_description, specifications, emoji) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const products = [
      ['Laptop Gamer ASUS ROG', 'Computadoras', 'Intel i7, RTX 4060, 16GB RAM, 512GB SSD. Importada a pedido.', 'Laptop gaming de alto rendimiento con procesador Intel Core i7 de 13ª generación, tarjeta gráfica NVIDIA RTX 4060 de 8GB, 16GB RAM DDR5, disco SSD NVMe de 512GB. Pantalla IPS de 15.6 pulgadas a 144Hz. Diseño robusto con sistema de refrigeración avanzado. Ideal para gaming, diseño gráfico y desarrollo de software. Importación directa con garantía.', JSON.stringify(['Procesador: Intel i7-13700H','GPU: NVIDIA RTX 4060 8GB','RAM: 16GB DDR5','Almacenamiento: 512GB SSD NVMe','Pantalla: 15.6" IPS 144Hz','Sistema: Windows 11 Pro','Peso: 2.3 kg']), '💻'],
      ['Drone DJI Mini 4 Pro', 'Drones', 'Cámara 4K, 3 ejes de estabilización, 34min de vuelo.', 'El DJI Mini 4 Pro ofrece una experiencia de vuelo profesional en un formato ultraligero de menos de 249g. Cámara con sensor CMOS de 1/1.3 pulgadas que graba en 4K a 60fps con HDR. Sistema de detección de obstáculos omnidireccional. Alcance de transmisión de hasta 20km con O4. Batería Intelligent Flight Battery con hasta 34 minutos de vuelo. Perfecto para fotografía aérea profesional y contenido para redes sociales.', JSON.stringify(['Peso: <249g','Cámara: 4K/60fps HDR','Sensor: 1/1.3" CMOS','Autonomía: 34 min','Alcance: 20 km','Detección: Omnidireccional','Transmisión: O4']), '🚁'],
      ['Kit Starlink Gen 2', 'Conectividad', 'Kit completo para instalación, cobertura satelital 24/7.', 'Kit completo de internet satelital Starlink de segunda generación. Incluye antena rectangular compacta con motor de orientación automática, router WiFi 6 de doble banda, cable de 15 metros, base para montaje y fuente de alimentación. Velocidades de descarga de 50-200 Mbps con latencia de 20-40ms. Cobertura global sin necesidad de infraestructura terrestre. Ideal para zonas rurales y áreas sin cobertura de fibra óptica.', JSON.stringify(['Velocidad: 50-200 Mbps','Latencia: 20-40ms','WiFi: Dual Band WiFi 6','Antena: Orientación automática','Cable: 15m incluido','Cobertura: Global satelital','Consumo: 50-75W promedio']), '📡'],
      ['Impresora HP LaserJet', 'Impresoras', 'Multifunción, WiFi, doble faz automático, 30ppm.', 'Impresora multifunción HP LaserJet Pro con tecnología láser monocromática de alta velocidad. Imprime, escanea, copia y envía fax. Velocidad de impresión de 30 páginas por minuto con resolución de 1200x1200 dpi. Duplex automático para impresión a doble faz. Conectividad WiFi, Ethernet, USB y AirPrint para impresión desde móviles. Bandeja de entrada para 250 hojas. Tóner de alto rendimiento de hasta 3000 páginas.', JSON.stringify(['Tipo: Láser Monocromática','Velocidad: 30 ppm','Resolución: 1200x1200 dpi','Duplex: Automático','Conectividad: WiFi, Ethernet, USB','Bandeja: 250 hojas','Tóner: Hasta 3000 páginas']), '🖨️'],
      ['Smart TV Samsung 55"', 'Pantallas', 'OLED 4K, 120Hz, HDR10+, control de voz integrado.', 'Smart TV Samsung de 55 pulgadas con panel OLED 4K que ofrece negros perfectos y colores vivos. Tasa de refresco de 120Hz para una imagen fluida en deportes y gaming. Compatible con HDR10+, Dolby Atmos para sonido envolvente. Sistema operativo Tizen con acceso a todas las plataformas de streaming. Control de voz integrado con Bixby, Alexa y Google Assistant. Diseño ultra delgado con marco mínimo.', JSON.stringify(['Pantalla: 55" OLED 4K','Refresco: 120Hz','HDR: HDR10+, Dolby Vision','Audio: Dolby Atmos','Smart TV: Tizen OS','Asistentes: Bixby, Alexa, Google','HDMI: 4x HDMI 2.1']), '📺'],
      ['Router WiFi 6 TP-Link', 'Redes', 'AX3000, Dual Band, 8 antenas, cobertura hasta 300m².', 'Router WiFi 6 TP-Link Archer AX3000 de alto rendimiento con velocidades combinadas de hasta 3000 Mbps. Dual Band simultáneo (2.4GHz + 5GHz) con tecnología OFDMA y MU-MIMO para manejar múltiples dispositivos sin perder velocidad. 8 antenas de alto ganancia para cobertura de hasta 300m². Puerto WAN Gigabit + 4 puertos LAN Gigabit. Compatible con TP-Link OneMesh para cobertura mesh. Control parental avanzado y QoS inteligente.', JSON.stringify(['Estándar: WiFi 6 (802.11ax)','Velocidad: AX3000','Bandas: Dual Band','Antenas: 8 de alto ganancia','Cobertura: Hasta 300m²','Puertos: 1 WAN + 4 LAN Gigabit','Tecnología: OFDMA, MU-MIMO']), '📶'],
    ];
    const insertMany = db.transaction((items) => {
      for (const p of items) insertProduct.run(...p);
    });
    insertMany(products);
  }

  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  if (serviceCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name, icon, description, features) VALUES (?, ?, ?, ?)
    `);
    const services = [
      ['Instalación de Cámaras', 'fa-camera', 'Instalación profesional de sistemas de vigilancia CCTV, IP y analógico. Configuración de NVR/DVR y acceso remoto.', JSON.stringify(['Cámaras HD y 4K', 'Configuración acceso remoto', 'Instalación en exteriores', 'Soporte técnico incluido'])],
      ['Instalación Starlink', 'fa-satellite-dish', 'Instalación y configuración completa del kit Starlink. Internet satelital de alta velocidad en cualquier zona.', JSON.stringify(['Instalación del plato', 'Configuración de red WiFi', 'Orientación óptima', 'Test de velocidad incluido'])],
      ['Mantenimiento de Computadoras', 'fa-desktop', 'Limpieza interna, reinstalación de Windows, actualización de drivers, recuperación de datos y más.', JSON.stringify(['Limpieza de polvo', 'Pasta térmica', 'Instalación de Windows', 'Recuperación de datos'])],
      ['Mantenimiento de Impresoras', 'fa-print', 'Limpieza de cabezales, recarga de cartuchos, reparación de papel atascado y configuración de red.', JSON.stringify(['Limpieza de cabezales', 'Recarga de tóner/tinta', 'Configuración WiFi', 'Reparación mecánica'])],
    ];
    const insertMany = db.transaction((items) => {
      for (const s of items) insertService.run(...s);
    });
    insertMany(services);
  }

  const iptvCount = db.prepare('SELECT COUNT(*) as count FROM iptv_plans').get().count;
  if (iptvCount === 0) {
    const insertIptv = db.prepare(`
      INSERT INTO iptv_plans (name, price, period, featured, channels, vod, connections, epg, support, update_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertIptv.run('Plan Básico', '150.000', 'mes', 0, '+15.000 Canales HD', '5.000 Películas y Series', '1 Conexión simultánea', 'Guía de programación', 'Soporte vía WhatsApp', 'Actualizaciones incluidas');
    insertIptv.run('Plan Premium', '250.000', 'mes', 1, '+30.000 Canales HD/4K', '25.000 Películas y Series', '3 Conexiones simultáneas', 'Guía de programación EPG', 'Soporte prioritario 24/7', 'Actualizaciones automáticas');
  }

  const toolCount = db.prepare('SELECT COUNT(*) as count FROM tools').get().count;
  if (toolCount === 0) {
    const insertTool = db.prepare(`
      INSERT INTO tools (name, icon, description, file_type, file_size, download_link) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const tools = [
      ['Activador Windows 11', 'fa-windows', 'Script para activación permanente de Windows 10/11 Pro.', 'Script .bat', '2.3 KB', '#'],
      ['Pack Drivers Universal', 'fa-microchip', 'Instalador automático de drivers para Windows.', 'Software .exe', '450 MB', '#'],
      ['Guía Config Starlink PDF', 'fa-file-pdf', 'Manual completo de configuración Starlink en español.', 'Documento PDF', '3.8 MB', '#'],
      ['Checklist Mantenimiento PC', 'fa-clipboard-list', 'Lista de verificación para mantenimiento preventivo.', 'Documento PDF', '1.2 MB', '#'],
    ];
    const insertMany = db.transaction((items) => {
      for (const t of items) insertTool.run(...t);
    });
    insertMany(tools);
  }

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (projectCount === 0) {
    const insertProject = db.prepare(`
      INSERT INTO projects (name, tag, color, description, technologies, demo_link, code_link) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const projects = [
      ['Sistema de Gestión Veterinaria', 'Sistema Web', '#00c8ff', 'Sistema completo para clínicas veterinarias: historia clínica digital, agenda, facturación y stock.', JSON.stringify(['PHP', 'MySQL', 'Bootstrap', 'jQuery']), '#', '#'],
      ['App Control de Inventario', 'Aplicación', '#00ff99', 'Control de stock en tiempo real, alertas de reposición, reportes PDF y multi-sucursal.', JSON.stringify(['React', 'Node.js', 'MongoDB', 'Chart.js']), '#', '#'],
      ['Plataforma E-learning', 'Educación', '#ff6b35', 'Plataforma de cursos online con video, quizzes, certificados y panel de progreso.', JSON.stringify(['Laravel', 'Vue.js', 'AWS S3', 'Stripe']), '#', '#'],
    ];
    const insertMany = db.transaction((items) => {
      for (const p of items) insertProject.run(...p);
    });
    insertMany(projects);
  }

  const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
  if (videoCount === 0) {
    const insertVideo = db.prepare(`
      INSERT INTO videos (name, category, description, video_link) VALUES (?, ?, ?, ?)
    `);
    insertVideo.run('Reel Corporativo - Empresa XYZ', 'Corporativo', 'Edición de reel institucional con motion graphics.', '#');
    insertVideo.run('Highlights - Evento Social', 'Eventos', 'Compilado de momentos especiales de quinceañera.', '#');
    insertVideo.run('Tutorial - Config Router WiFi', 'Tutorial', 'Video educativo sobre configuración de red doméstica.', '#');
  }

  const socialCount = db.prepare('SELECT COUNT(*) as count FROM social_media').get().count;
  if (socialCount === 0) {
    const insertSocial = db.prepare(`
      INSERT INTO social_media (name, username, icon, color, link, followers, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const socials = [
      ['Facebook', '@jacsonander', 'fab fa-facebook-f', '#1877F2', 'https://facebook.com/jacsonander', '500+ seguidores', 'Publicaciones de tecnología', 1],
      ['Instagram', '@jacsonander', 'fab fa-instagram', '#E1306C', 'https://instagram.com/jacsonander', '350+ seguidores', 'Fotos de proyectos y reels', 2],
      ['YouTube', '@jacsonander', 'fab fa-youtube', '#FF0000', 'https://youtube.com/@jacsonander', '200+ suscriptores', 'Tutoriales de tecnología', 3],
      ['TikTok', '@jacsonander', 'fab fa-tiktok', '#69C9D0', 'https://tiktok.com/@jacsonander', '1K+ seguidores', 'Contenido corto sobre tech', 4],
      ['LinkedIn', 'Jacson Ander', 'fab fa-linkedin-in', '#0A66C2', 'https://linkedin.com/in/jacsonander', '150+ conexiones', 'Perfil profesional', 5],
      ['GitHub', '@jacsonander', 'fab fa-github', '#ffffff', 'https://github.com/jacsonander', 'Repositorios públicos', 'Código abierto', 6],
    ];
    const insertMany = db.transaction((items) => {
      for (const s of items) insertSocial.run(...s);
    });
    insertMany(socials);
  }

  const configCount = db.prepare('SELECT COUNT(*) as count FROM site_config').get().count;
  if (configCount === 0) {
    const insertConfig = db.prepare('INSERT INTO site_config (key, value) VALUES (?, ?)');
    insertConfig.run('phone', '595XXXXXXXXX');
    insertConfig.run('clients_stat', '120');
    insertConfig.run('experience_years', '5');
    insertConfig.run('site_name', 'Ander Instalaciones y Mantenimientos');
    insertConfig.run('site_url', 'jacsonander.com');
  }

  console.log('✅ Base de datos inicializada correctamente');
  return db;
}

module.exports = { getDb, initDatabase };
