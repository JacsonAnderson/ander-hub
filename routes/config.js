// routes/config.js
// Firestore: um único documento "site" na coleção "site_config"
const express = require('express');
const router = express.Router();
const { getDb } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

const CONFIG_DOC = 'site_config/site';

// GET /api/config - Obtener configuración pública
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.doc(CONFIG_DOC).get();
    res.json(doc.exists ? doc.data() : {});
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/config - Actualizar configuración (admin)
router.put('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.doc(CONFIG_DOC);
    // merge: true → atualiza só os campos enviados, sem apagar o resto
    await ref.set(req.body, { merge: true });
    const doc = await ref.get();
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

module.exports = router;
