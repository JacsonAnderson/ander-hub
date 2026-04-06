// routes/social.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/social
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('social_media').get();
    const social = snapToArr(snap).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    res.json(social);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener redes sociales' });
  }
});

// POST /api/social
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, username, icon, color, link, followers, description, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const ref = await db.collection('social_media').add({
      name,
      username: username || '',
      icon: icon || '',
      color: color || '#00c8ff',
      link: link || '',
      followers: followers || '',
      description: description || '',
      sort_order: sort_order || 0,
      created_at: new Date().toISOString()
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear' });
  }
});

// PUT /api/social/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('social_media').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, username, icon, color, link, followers, description, sort_order } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (username !== undefined) updates.username = username;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (link !== undefined) updates.link = link;
    if (followers !== undefined) updates.followers = followers;
    if (description !== undefined) updates.description = description;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/social/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('social_media').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Red social eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
