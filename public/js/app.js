// js/app.js - Inicialización principal de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar configuración del sitio
  await Utils.loadConfig();

  // 2. Inicializar autenticación
  Auth.init();

  // 3. Renderizar todas las secciones
  await Render.all();

  // 4. Inicializar modales
  Utils.initModals();

  // 5. Highlight de navegación en scroll
  Utils.initScrollHighlight();

  // 6. Si es admin, cargar config del panel
  if (Auth.isAdmin) {
    Admin.loadConfig();
  }

  // 7. Evento enter en login
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.login();
  });

  console.log('⚡ Ander Hub v2.0 inicializado correctamente');
});
