# ⚡ Ander Hub v2.0 - Sistema Completo

## Descripción
Sistema completo de portafolio, e-commerce y gestión para **Ander Instalaciones y Mantenimientos**.
Incluye sitio público, panel administrativo, gestión de clientes, control de pagos/ganancias y más.

---

## 🏗️ Estructura del Proyecto

```
ander-hub/
├── server.js                 # Servidor Express principal
├── package.json              # Dependencias del proyecto
├── .env                      # Variables de entorno
├── database/
│   └── init.js               # Inicialización SQLite + datos semilla
├── middleware/
│   └── auth.js               # Middleware JWT (autenticación)
├── routes/
│   ├── auth.js               # Login, perfil, cambiar contraseña
│   ├── products.js           # CRUD productos
│   ├── services.js           # CRUD servicios
│   ├── iptv.js               # CRUD planes IPTV
│   ├── tools.js              # CRUD herramientas/descargas
│   ├── projects.js           # CRUD proyectos
│   ├── videos.js             # CRUD videos
│   ├── social.js             # CRUD redes sociales
│   ├── clients.js            # Gestión de clientes + documentos
│   ├── payments.js           # Pagos, ganancias, dashboard stats
│   └── config.js             # Configuración del sitio
├── public/
│   ├── index.html            # HTML principal (SPA)
│   ├── css/
│   │   ├── main.css          # Variables, reset, sidebar, base
│   │   ├── sections.css      # Estilos de cada sección pública
│   │   ├── admin.css         # Panel administrativo
│   │   └── mobile.css        # Diseño móvil responsivo
│   └── js/
│       ├── api.js            # Capa de comunicación con el backend
│       ├── utils.js          # Toast, modales, formato, helpers
│       ├── auth.js           # Login/logout/sesión
│       ├── render.js         # Renderizado de secciones públicas
│       ├── admin.js          # Panel admin, CRUD, dashboard
│       └── app.js            # Inicialización de la aplicación
└── README.md
```

---

## 🚀 Instalación y Ejecución

### Requisitos
- **Node.js** v18 o superior
- **npm** (viene con Node.js)

### Pasos

```bash
# 1. Entrar a la carpeta del proyecto
cd ander-hub

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (editar .env)
#    Cambiar la contraseña admin y el JWT_SECRET

# 4. Iniciar el servidor
npm start

# 5. Abrir en el navegador
#    http://localhost:3000
```

### Modo desarrollo (auto-reload)
```bash
npm run dev
```

---

## 🔐 Credenciales por Defecto

| Rol   | Usuario        | Contraseña   |
|-------|---------------|-------------|
| Admin | jacsonander   | Ander@2024  |

> ⚠️ **Cambia la contraseña inmediatamente** desde el Panel Admin → Configuración.

---

## 📡 API Endpoints Completos

### Autenticación
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | ❌ |
| GET | `/api/auth/me` | Obtener perfil actual | ✅ |
| PUT | `/api/auth/password` | Cambiar contraseña | ✅ |

### Productos
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/products` | Listar todos | ❌ |
| GET | `/api/products/recent` | Últimos 4 productos | ❌ |
| GET | `/api/products/categories` | Listar categorías | ❌ |
| GET | `/api/products/:id` | Detalle producto | ❌ |
| POST | `/api/products` | Crear producto | 🔒 Admin |
| PUT | `/api/products/:id` | Editar producto | 🔒 Admin |
| DELETE | `/api/products/:id` | Eliminar producto | 🔒 Admin |

### Servicios
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/services` | Listar todos | ❌ |
| GET | `/api/services/:id` | Detalle | ❌ |
| POST | `/api/services` | Crear | 🔒 Admin |
| PUT | `/api/services/:id` | Editar | 🔒 Admin |
| DELETE | `/api/services/:id` | Eliminar | 🔒 Admin |

### IPTV
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/iptv` | Listar planes | ❌ |
| POST | `/api/iptv` | Crear plan | 🔒 Admin |
| PUT | `/api/iptv/:id` | Editar plan | 🔒 Admin |
| DELETE | `/api/iptv/:id` | Eliminar plan | 🔒 Admin |

### Herramientas
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/tools` | Listar | ❌ |
| POST | `/api/tools/:id/download` | Registrar descarga | ❌ |
| POST | `/api/tools` | Crear | 🔒 Admin |
| PUT | `/api/tools/:id` | Editar | 🔒 Admin |
| DELETE | `/api/tools/:id` | Eliminar | 🔒 Admin |

### Proyectos
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/projects` | Listar | ❌ |
| POST | `/api/projects` | Crear | 🔒 Admin |
| PUT | `/api/projects/:id` | Editar | 🔒 Admin |
| DELETE | `/api/projects/:id` | Eliminar | 🔒 Admin |

### Videos
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/videos` | Listar | ❌ |
| POST | `/api/videos` | Crear | 🔒 Admin |
| PUT | `/api/videos/:id` | Editar | 🔒 Admin |
| DELETE | `/api/videos/:id` | Eliminar | 🔒 Admin |

### Redes Sociales
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/social` | Listar | ❌ |
| POST | `/api/social` | Crear | 🔒 Admin |
| PUT | `/api/social/:id` | Editar | 🔒 Admin |
| DELETE | `/api/social/:id` | Eliminar | 🔒 Admin |

### Clientes
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/clients` | Listar clientes | 🔒 Admin |
| GET | `/api/clients/:id` | Detalle + documentos | ✅ |
| POST | `/api/clients` | Registrar cliente | 🔒 Admin |
| PUT | `/api/clients/:id` | Editar cliente | 🔒 Admin |
| DELETE | `/api/clients/:id` | Eliminar cliente | 🔒 Admin |
| GET | `/api/clients/:id/documents` | Documentos del cliente | ✅ |
| POST | `/api/clients/:id/documents` | Agregar documento | 🔒 Admin |
| DELETE | `/api/clients/:cid/documents/:did` | Eliminar documento | 🔒 Admin |

### Pagos y Ganancias
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/payments` | Listar pagos | 🔒 Admin |
| GET | `/api/payments/my-orders` | Mis pedidos (cliente) | ✅ |
| GET | `/api/payments/dashboard` | Stats del dashboard | 🔒 Admin |
| POST | `/api/payments` | Registrar pago | 🔒 Admin |
| PUT | `/api/payments/:id` | Editar pago | 🔒 Admin |
| DELETE | `/api/payments/:id` | Eliminar pago | 🔒 Admin |

### Configuración
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/config` | Obtener config | ❌ |
| PUT | `/api/config` | Actualizar config | 🔒 Admin |

---

## 💾 Base de Datos

Usa **SQLite** vía `better-sqlite3` - archivo `ander.db` en la raíz del proyecto.

**Sin costos mensuales.** El archivo `.db` se crea automáticamente al iniciar.

### Tablas:
- `users` - Administrador y clientes
- `products` - Catálogo de productos
- `services` - Servicios técnicos
- `iptv_plans` - Planes IPTV
- `tools` - Herramientas/descargas
- `social_media` - Redes sociales
- `projects` - Proyectos de sistemas
- `videos` - Trabajos de edición
- `payments` - Registro de pagos (costo, venta, ganancia)
- `client_documents` - Documentos de clientes
- `site_config` - Configuración del sitio

---

## 🌐 Deploy en Producción

### Opción 1: VPS (DigitalOcean, Linode, etc.)
```bash
# En el servidor
git clone <repo> && cd ander-hub
npm install --production
# Configurar .env con datos reales
# Usar PM2 para mantener vivo:
npm install -g pm2
pm2 start server.js --name ander-hub
pm2 save
```

### Opción 2: Railway / Render (gratis)
1. Subir a GitHub
2. Conectar con Railway o Render
3. Configurar variables de entorno
4. Deploy automático

---

## 🛡️ Seguridad
- Contraseñas hasheadas con **bcrypt**
- Autenticación con **JWT** (tokens de 7 días)
- Rutas admin protegidas con middleware
- CORS habilitado
- Solo el admin puede crear/editar/eliminar contenido y clientes

---

## 📱 Diseño Móvil
- Grid de 2 columnas para cards en móvil
- Modales que suben desde abajo (estilo app)
- Sidebar con overlay en móvil
- Diseño compacto optimizado para pantallas pequeñas
- Compatible con la imagen de referencia del mockup

---

© 2024 jacsonander.com - Ander Instalaciones y Mantenimientos
