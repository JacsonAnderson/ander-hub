// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDb, docToObj } = require('../database/firestore');
const { authenticate, generateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }
    const db = getDb();
    // Busca usuário pelo username (campo único)
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = docToObj(snap.docs[0]);
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        city: user.city,
        type: user.type
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor', details: err.message });
  }
});

// GET /api/auth/me - Obtener perfil actual
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.user.id).get();
    const user = docToObj(doc);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/auth/users - Listar usuários (admin only)
router.get('/users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const db = getDb();
    const snap = await db.collection('users').get();
    const users = snap.docs.map(d => {
      const { password, ...safe } = { id: d.id, ...d.data() };
      return safe;
    }).filter(u => u.role !== 'admin');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários', details: err.message });
  }
});

// POST /api/auth/users - Criar usuário (admin only)
router.post('/users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { username, name, password, role, email, phone } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ error: 'Usuário, nome e senha são obrigatórios' });
    }
    if (!['reseller', 'client'].includes(role || 'client')) {
      return res.status(400).json({ error: 'Role inválido' });
    }
    const db = getDb();
    // Check username uniqueness
    const existing = await db.collection('users').where('username', '==', username).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Nome de usuário já existe' });

    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const ref = await db.collection('users').add({
      username, name, password: hash,
      role: role || 'client',
      email: email || '',
      phone: phone || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    const doc = await ref.get();
    const { password: _, ...safe } = { id: doc.id, ...doc.data() };
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: err.message });
  }
});

// PUT /api/auth/users/:id - Atualizar usuário (admin only)
router.put('/users/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const db = getDb();
    const ref = db.collection('users').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Não encontrado' });

    const updates = { updated_at: new Date().toISOString() };
    ['name', 'email', 'phone', 'role', 'active'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (req.body.password) {
      updates.password = bcrypt.hashSync(req.body.password, 10);
    }
    await ref.update(updates);
    const doc = await ref.get();
    const { password: _, ...safe } = { id: doc.id, ...doc.data() };
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: err.message });
  }
});

// DELETE /api/auth/users/:id - Remover usuário (admin only)
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const db = getDb();
    const ref = db.collection('users').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Não encontrado' });
    if (doc.data().role === 'admin') return res.status(403).json({ error: 'Não é possível remover admin' });
    await ref.delete();
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário', details: err.message });
  }
});

// PUT /api/auth/password - Cambiar contraseña
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseñas requeridas' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mínimo 6 caracteres' });
    }
    const db = getDb();
    const doc = await db.collection('users').doc(req.user.id).get();
    const user = docToObj(doc);
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.collection('users').doc(req.user.id).update({
      password: hash,
      updated_at: new Date().toISOString()
    });
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
