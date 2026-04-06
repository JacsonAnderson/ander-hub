// routes/projects.js
const express = require('express');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { limit } = req.query;
    const snap = await db.collection('projects').where('active', '==', true).get();
    let projects = snapToArr(snap).sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    );
    if (limit) projects = projects.slice(0, parseInt(limit));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('projects').doc(req.params.id).get();
    const project = docToObj(doc);
    if (!project) return res.status(404).json({ error: 'No encontrado' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// POST /api/projects
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, tag, color, description, technologies, demo_link, code_link, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('projects').add({
      name,
      tag: tag || '',
      color: color || '#00c8ff',
      description: description || '',
      technologies: Array.isArray(technologies) ? technologies : [],
      demo_link: demo_link || '',
      code_link: code_link || '',
      image_url: image_url || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('projects').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, tag, color, description, technologies, demo_link, code_link, image_url, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (tag !== undefined) updates.tag = tag;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;
    if (technologies !== undefined) updates.technologies = Array.isArray(technologies) ? technologies : [];
    if (demo_link !== undefined) updates.demo_link = demo_link;
    if (code_link !== undefined) updates.code_link = code_link;
    if (image_url !== undefined) updates.image_url = image_url;
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('projects').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
