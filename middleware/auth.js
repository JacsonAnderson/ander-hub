// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'AnderHub_SuperSecretKey_2024';

// Verificar token JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Solo admin
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
  }
  next();
}

// Admin o el propio usuario
function adminOrSelf(req, res, next) {
  if (req.user.role === 'admin' || req.user.id === req.params.id) {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado' });
}

function generateToken(user) {
  return jwt.sign(
    // id agora é string (Firestore doc ID)
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticate, adminOnly, adminOrSelf, generateToken, JWT_SECRET };
