// database/seed.js
// Popula o Firestore com dados iniciais (equivalente ao seed do SQLite)
// Executar UMA VEZ: node database/seed.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./firestore');

async function seed() {
  const db = getDb();
  console.log('🔥 Conectando ao Firestore...');

  // ==================== USUÁRIO ADMIN ====================
  const usersSnap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (usersSnap.empty) {
    const adminHash = bcrypt.hashSync(process.env.ADMIN_PASS || 'Ander@2024', 10);
    const now = new Date().toISOString();
    await db.collection('users').add({
      username: 'jacsonander', password: adminHash,
      name: 'Jacson Ander', phone: '595XXXXXXXXX',
      email: 'contacto@jacsonander.com', city: 'Paraguay',
      type: 'Admin', role: 'admin', notes: '',
      created_at: now, updated_at: now
    });
    console.log('  ✅ Admin criado');
  } else {
    console.log('  ⏭  Admin já existe');
  }

  // ==================== PRODUTOS ====================
  const productsSnap = await db.collection('products').limit(1).get();
  if (productsSnap.empty) {
    const now = new Date().toISOString();
    const products = [
      { name: 'Laptop Gamer ASUS ROG', category: 'Computadoras', emoji: '💻', cost_price: 0, sale_price: 0, purchase_link: '',
        description: 'Intel i7, RTX 4060, 16GB RAM, 512GB SSD. Importada a pedido.',
        long_description: 'Laptop gaming de alto rendimiento con procesador Intel Core i7 de 13ª generación, tarjeta gráfica NVIDIA RTX 4060 de 8GB, 16GB RAM DDR5, disco SSD NVMe de 512GB.',
        specifications: ['Procesador: Intel i7-13700H','GPU: NVIDIA RTX 4060 8GB','RAM: 16GB DDR5','Almacenamiento: 512GB SSD NVMe','Pantalla: 15.6" IPS 144Hz'] },
      { name: 'Drone DJI Mini 4 Pro', category: 'Drones', emoji: '🚁', cost_price: 0, sale_price: 0, purchase_link: '',
        description: 'Cámara 4K, 3 ejes de estabilización, 34min de vuelo.',
        long_description: 'El DJI Mini 4 Pro ofrece una experiencia de vuelo profesional en un formato ultraligero de menos de 249g.',
        specifications: ['Peso: <249g','Cámara: 4K/60fps HDR','Autonomía: 34 min','Alcance: 20 km'] },
      { name: 'Kit Starlink Gen 2', category: 'Conectividad', emoji: '📡', cost_price: 0, sale_price: 0, purchase_link: '',
        description: 'Kit completo para instalación, cobertura satelital 24/7.',
        long_description: 'Kit completo de internet satelital Starlink de segunda generación. Velocidades de 50-200 Mbps con latencia de 20-40ms.',
        specifications: ['Velocidad: 50-200 Mbps','Latencia: 20-40ms','WiFi: Dual Band WiFi 6','Cobertura: Global satelital'] },
      { name: 'Smart TV Samsung 55"', category: 'Pantallas', emoji: '📺', cost_price: 0, sale_price: 0, purchase_link: '',
        description: 'OLED 4K, 120Hz, HDR10+, control de voz integrado.',
        long_description: 'Smart TV Samsung de 55 pulgadas con panel OLED 4K. Compatible con HDR10+, Dolby Atmos.',
        specifications: ['Pantalla: 55" OLED 4K','Refresco: 120Hz','HDR: HDR10+, Dolby Vision','Smart TV: Tizen OS'] },
    ];
    for (const p of products) {
      await db.collection('products').add({ ...p, image_url: '', active: true, created_at: now, updated_at: now });
    }
    console.log('  ✅ Produtos criados');
  } else {
    console.log('  ⏭  Produtos já existem');
  }

  // ==================== SERVIÇOS ====================
  const servicesSnap = await db.collection('services').limit(1).get();
  if (servicesSnap.empty) {
    const now = new Date().toISOString();
    const services = [
      { name: 'Instalación de Cámaras', icon: 'fa-camera', description: 'Instalación profesional de sistemas de vigilancia CCTV, IP y analógico.',
        features: ['Cámaras HD y 4K','Configuración acceso remoto','Instalación en exteriores','Soporte técnico incluido'] },
      { name: 'Instalación Starlink', icon: 'fa-satellite-dish', description: 'Instalación y configuración completa del kit Starlink.',
        features: ['Instalación del plato','Configuración de red WiFi','Orientación óptima','Test de velocidad incluido'] },
      { name: 'Mantenimiento de Computadoras', icon: 'fa-desktop', description: 'Limpieza interna, reinstalación de Windows, actualización de drivers.',
        features: ['Limpieza de polvo','Pasta térmica','Instalación de Windows','Recuperación de datos'] },
      { name: 'Mantenimiento de Impresoras', icon: 'fa-print', description: 'Limpieza de cabezales, recarga de cartuchos, configuración de red.',
        features: ['Limpieza de cabezales','Recarga de tóner/tinta','Configuración WiFi','Reparación mecánica'] },
    ];
    for (const s of services) {
      await db.collection('services').add({ ...s, active: true, created_at: now, updated_at: now });
    }
    console.log('  ✅ Serviços criados');
  } else {
    console.log('  ⏭  Serviços já existem');
  }

  // ==================== PLANOS IPTV ====================
  const iptvSnap = await db.collection('iptv_plans').limit(1).get();
  if (iptvSnap.empty) {
    const now = new Date().toISOString();
    await db.collection('iptv_plans').add({
      name: 'Plan Básico', price: '150.000', period: 'mes', featured: false,
      channels: '+15.000 Canales HD', vod: '5.000 Películas y Series', connections: '1 Conexión simultánea',
      epg: 'Guía de programación', support: 'Soporte vía WhatsApp', update_info: 'Actualizaciones incluidas',
      active: true, created_at: now, updated_at: now
    });
    await db.collection('iptv_plans').add({
      name: 'Plan Premium', price: '250.000', period: 'mes', featured: true,
      channels: '+30.000 Canales HD/4K', vod: '25.000 Películas y Series', connections: '3 Conexiones simultáneas',
      epg: 'Guía de programación EPG', support: 'Soporte prioritario 24/7', update_info: 'Actualizaciones automáticas',
      active: true, created_at: now, updated_at: now
    });
    console.log('  ✅ Planos IPTV criados');
  } else {
    console.log('  ⏭  Planos IPTV já existem');
  }

  // ==================== FERRAMENTAS ====================
  const toolsSnap = await db.collection('tools').limit(1).get();
  if (toolsSnap.empty) {
    const now = new Date().toISOString();
    const tools = [
      { name: 'Activador Windows 11', icon: 'fa-windows', description: 'Script para activación permanente de Windows 10/11 Pro.', file_type: 'Script .bat', file_size: '2.3 KB', download_link: '#' },
      { name: 'Pack Drivers Universal', icon: 'fa-microchip', description: 'Instalador automático de drivers para Windows.', file_type: 'Software .exe', file_size: '450 MB', download_link: '#' },
      { name: 'Guía Config Starlink PDF', icon: 'fa-file-pdf', description: 'Manual completo de configuración Starlink en español.', file_type: 'Documento PDF', file_size: '3.8 MB', download_link: '#' },
    ];
    for (const t of tools) {
      await db.collection('tools').add({ ...t, downloads: 0, active: true, created_at: now, updated_at: now });
    }
    console.log('  ✅ Ferramentas criadas');
  } else {
    console.log('  ⏭  Ferramentas já existem');
  }

  // ==================== PROJETOS ====================
  const projectsSnap = await db.collection('projects').limit(1).get();
  if (projectsSnap.empty) {
    const now = new Date().toISOString();
    const projects = [
      { name: 'Sistema de Gestión Veterinaria', tag: 'Sistema Web', color: '#00c8ff', description: 'Sistema completo para clínicas veterinarias.', technologies: ['PHP', 'MySQL', 'Bootstrap', 'jQuery'], demo_link: '#', code_link: '#', image_url: '' },
      { name: 'App Control de Inventario', tag: 'Aplicación', color: '#00ff99', description: 'Control de stock en tiempo real, alertas de reposición.', technologies: ['React', 'Node.js', 'MongoDB', 'Chart.js'], demo_link: '#', code_link: '#', image_url: '' },
    ];
    for (const p of projects) {
      await db.collection('projects').add({ ...p, active: true, created_at: now, updated_at: now });
    }
    console.log('  ✅ Projetos criados');
  } else {
    console.log('  ⏭  Projetos já existem');
  }

  // ==================== REDES SOCIAIS ====================
  const socialSnap = await db.collection('social_media').limit(1).get();
  if (socialSnap.empty) {
    const socials = [
      { name: 'Facebook', username: '@jacsonander', icon: 'fab fa-facebook-f', color: '#1877F2', link: 'https://facebook.com/jacsonander', followers: '500+ seguidores', description: 'Publicaciones de tecnología', sort_order: 1 },
      { name: 'Instagram', username: '@jacsonander', icon: 'fab fa-instagram', color: '#E1306C', link: 'https://instagram.com/jacsonander', followers: '350+ seguidores', description: 'Fotos de proyectos y reels', sort_order: 2 },
      { name: 'YouTube', username: '@jacsonander', icon: 'fab fa-youtube', color: '#FF0000', link: 'https://youtube.com/@jacsonander', followers: '200+ suscriptores', description: 'Tutoriales de tecnología', sort_order: 3 },
      { name: 'GitHub', username: '@jacsonander', icon: 'fab fa-github', color: '#ffffff', link: 'https://github.com/jacsonander', followers: 'Repositorios públicos', description: 'Código abierto', sort_order: 6 },
    ];
    for (const s of socials) {
      await db.collection('social_media').add({ ...s, created_at: new Date().toISOString() });
    }
    console.log('  ✅ Redes sociais criadas');
  } else {
    console.log('  ⏭  Redes sociais já existem');
  }

  // ==================== CONFIGURAÇÃO DO SITE ====================
  const configDoc = await db.doc('site_config/site').get();
  if (!configDoc.exists) {
    await db.doc('site_config/site').set({
      phone: '595XXXXXXXXX',
      clients_stat: '120',
      experience_years: '5',
      site_name: 'Ander Instalaciones y Mantenimientos',
      site_url: 'jacsonander.com'
    });
    console.log('  ✅ Configuração do site criada');
  } else {
    console.log('  ⏭  Configuração já existe');
  }

  console.log('\n🎉 Seed finalizado! Dados prontos no Firestore.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Erro no seed:', err.message);
  process.exit(1);
});
