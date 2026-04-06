// routes/clients.js
// Clientes são usuários com role = 'client'
// Documentos do cliente são subcoleção: users/{id}/documents
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDb, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/clients - Listar (admin)
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { search, type } = req.query;
    const snap = await db.collection('users').where('role', '==', 'client').get();
    let clients = snapToArr(snap).map(({ password: _, ...c }) => c);
    // Filtros em memória (Firestore não suporta LIKE)
    if (search) {
      const s = search.toLowerCase();
      clients = clients.filter(c =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.username || '').toLowerCase().includes(s) ||
        (c.phone || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s)
      );
    }
    if (type) {
      clients = clients.filter(c => c.type === type);
    }
    clients.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/:id - Detalle
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.id).get();
    const client = docToObj(doc);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    if (req.user.role !== 'admin' && req.user.id !== client.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const docsSnap = await db.collection('users').doc(req.params.id).collection('documents')
      .orderBy('created_at', 'desc').get();
    const { password: _, ...safeClient } = client;
    res.json({ ...safeClient, documents: snapToArr(docsSnap) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// POST /api/clients - Criar cliente (admin)
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { username, password, name, phone, email, city, type, notes } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
    }
    // Verificar username único
    const existing = await db.collection('users').where('username', '==', username).limit(1).get();
    if (!existing.empty) return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const ref = await db.collection('users').add({
      username, password: hash, name,
      phone: phone || '', email: email || '',
      city: city || '', type: type || 'Cliente',
      role: 'client', notes: notes || '',
      created_at: now, updated_at: now
    });
    const created = docToObj(await ref.get());
    const { password: _, ...safeClient } = created;
    res.status(201).json(safeClient);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente', details: err.message });
  }
});

// PUT /api/clients/:id - Editar (admin)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('users').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'client') {
      return res.status(404).json({ error: 'No encontrado' });
    }
    const { username, password, name, phone, email, city, type, notes } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (username !== undefined) updates.username = username;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (city !== undefined) updates.city = city;
    if (type !== undefined) updates.type = type;
    if (notes !== undefined) updates.notes = notes;
    if (password && password.length >= 6) updates.password = bcrypt.hashSync(password, 10);
    await ref.update(updates);
    const updated = docToObj(await ref.get());
    const { password: _, ...safeClient } = updated;
    res.json(safeClient);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar', details: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('users').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== 'client') {
      return res.status(404).json({ error: 'No encontrado' });
    }
    await ref.delete();
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ==================== DOCUMENTOS DO CLIENTE ====================

// GET /api/clients/:id/documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const db = getDb();
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const snap = await db.collection('users').doc(req.params.id).collection('documents')
      .orderBy('created_at', 'desc').get();
    res.json(snapToArr(snap));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// POST /api/clients/:id/documents
router.post('/:id/documents', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, description, file_path, drive_link, doc_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const ref = await db.collection('users').doc(req.params.id).collection('documents').add({
      client_id: req.params.id,
      name,
      description: description || '',
      file_path: file_path || '',
      drive_link: drive_link || '',
      doc_type: doc_type || 'general',
      created_at: new Date().toISOString()
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear documento' });
  }
});

// DELETE /api/clients/:clientId/documents/:docId
router.delete('/:clientId/documents/:docId', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('users').doc(req.params.clientId)
      .collection('documents').doc(req.params.docId);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    await ref.delete();
    res.json({ message: 'Documento eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
