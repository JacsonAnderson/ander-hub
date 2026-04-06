// routes/videos.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { limit } = req.query;
    const snap = await db.collection('videos').where('active', '==', true).get();
    let videos = snapToArr(snap).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );
    if (limit) videos = videos.slice(0, parseInt(limit));
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener videos' });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('videos').doc(req.params.id).get();
    const video = docToObj(doc);
    if (!video) return res.status(404).json({ error: 'No encontrado' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener video' });
  }
});

// POST /api/videos
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, category, description, video_link, thumbnail_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('videos').add({
      name,
      category: category || '',
      description: description || '',
      video_link: video_link || '',
      thumbnail_url: thumbnail_url || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear' });
  }
});

// PUT /api/videos/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('videos').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, category, description, video_link, thumbnail_url, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (video_link !== undefined) updates.video_link = video_link;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/videos/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('videos').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Video eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
