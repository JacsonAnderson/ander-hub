// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ==================== RUTAS API ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/services', require('./routes/services'));
app.use('/api/iptv', require('./routes/iptv'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/social', require('./routes/social'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/config', require('./routes/config'));


// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    name: 'Ander Hub API',
    database: 'Firestore'
  });
});

// ==================== SPA FALLBACK ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ==================== INICIAR ====================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   ⚡ Ander Hub v3.0 - Servidor Iniciado     ║
║   📍 http://localhost:${PORT}                   ║
║   🔥 Base de datos: Firestore (Firebase)     ║
║   🔐 Admin: jacsonander / Ander@2024        ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
