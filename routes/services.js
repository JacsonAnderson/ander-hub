// routes/services.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/services
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('services').where('active', '==', true).get();
    const services = snapToArr(snap).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('services').doc(req.params.id).get();
    const service = docToObj(doc);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

// POST /api/services
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, icon, description, features } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('services').add({
      name,
      icon: icon || 'fa-tools',
      description: description || '',
      features: Array.isArray(features) ? features : [],
      active: true,
      created_at: now,
      updated_at: now
    });
    const created = docToObj(await ref.get());
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// PUT /api/services/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('services').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, icon, description, features, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (features !== undefined) updates.features = Array.isArray(features) ? features : [];
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/services/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('services').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
