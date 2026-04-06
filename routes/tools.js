// routes/tools.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr, FieldValue } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/tools
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { limit } = req.query;
    const snap = await db.collection('tools').where('active', '==', true).get();
    let tools = snapToArr(snap).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );
    if (limit) tools = tools.slice(0, parseInt(limit));
    res.json(tools);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener herramientas' });
  }
});

// GET /api/tools/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('tools').doc(req.params.id).get();
    const tool = docToObj(doc);
    if (!tool) return res.status(404).json({ error: 'No encontrado' });
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener herramienta' });
  }
});

// POST /api/tools/:id/download - Registrar descarga
router.post('/:id/download', async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('tools').doc(req.params.id);
    // FieldValue.increment(1) incrementa atomicamente sin leer el valor actual
    await ref.update({ downloads: FieldValue.increment(1) });
    const tool = docToObj(await ref.get());
    if (!tool) return res.status(404).json({ error: 'No encontrado' });
    res.json({ download_link: tool.download_link, downloads: tool.downloads });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar descarga' });
  }
});

// POST /api/tools
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, icon, description, file_type, file_size, download_link } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('tools').add({
      name,
      icon: icon || 'fa-download',
      description: description || '',
      file_type: file_type || '',
      file_size: file_size || '',
      download_link: download_link || '',
      downloads: 0,
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear' });
  }
});

// PUT /api/tools/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('tools').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, icon, description, file_type, file_size, download_link, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (file_type !== undefined) updates.file_type = file_type;
    if (file_size !== undefined) updates.file_size = file_size;
    if (download_link !== undefined) updates.download_link = download_link;
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/tools/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('tools').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Herramienta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
