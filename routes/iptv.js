// routes/iptv.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/iptv
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('iptv_plans').where('active', '==', true).get();
    // Ordena por precio numérico (price está guardado como string ej: "150.000")
    const plans = snapToArr(snap).sort((a, b) => {
      const pa = parseInt((a.price || '0').replace(/\./g, ''));
      const pb = parseInt((b.price || '0').replace(/\./g, ''));
      return pa - pb;
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// GET /api/iptv/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('iptv_plans').doc(req.params.id).get();
    const plan = docToObj(doc);
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener plan' });
  }
});

// POST /api/iptv
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, price, period, featured, channels, vod, connections, epg, support, update_info } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('iptv_plans').add({
      name,
      price: price || '0',
      period: period || 'mes',
      featured: Boolean(featured),
      channels: channels || '',
      vod: vod || '',
      connections: connections || '',
      epg: epg || '',
      support: support || '',
      update_info: update_info || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

// PUT /api/iptv/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_plans').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, price, period, featured, channels, vod, connections, epg, support, update_info, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (period !== undefined) updates.period = period;
    if (featured !== undefined) updates.featured = Boolean(featured);
    if (channels !== undefined) updates.channels = channels;
    if (vod !== undefined) updates.vod = vod;
    if (connections !== undefined) updates.connections = connections;
    if (epg !== undefined) updates.epg = epg;
    if (support !== undefined) updates.support = support;
    if (update_info !== undefined) updates.update_info = update_info;
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/iptv/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_plans').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Plan eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
