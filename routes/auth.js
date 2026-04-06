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
