// routes/products.js
// Imagens ficam no Firebase Storage (não mais em disco local)
// Subcoleção: products/{id}/images
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getDb, getBucket, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// Multer: memoryStorage → o arquivo fica em memória para enviar ao Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|avif/.test(file.mimetype);
    cb(null, ok);
  }
});

// Helper: upload de buffer para Firebase Storage, retorna URL pública
async function uploadToStorage(buffer, originalName, mimetype, folder) {
  const bucket = getBucket();
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const file = bucket.file(filename);
  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

// Helper: deletar arquivo do Storage pela URL pública
async function deleteFromStorage(url) {
  try {
    if (!url || !url.includes('storage.googleapis.com')) return;
    const bucket = getBucket();
    const urlPath = new URL(url).pathname;
    const filename = urlPath.replace(`/${bucket.name}/`, '');
    await bucket.file(filename).delete();
  } catch (_) { /* silencioso */ }
}

// Helper: produto com suas imagens
async function getProductFull(db, id) {
  const doc = await db.collection('products').doc(id).get();
  const product = docToObj(doc);
  if (!product) return null;
  const imgSnap = await db.collection('products').doc(id).collection('images')
    .orderBy('is_cover', 'desc').get();
  product.images = snapToArr(imgSnap).map(img => ({ ...img, url: img.image_url }));
  return product;
}

// ==================== CRUD PRODUTOS ====================

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { limit, offset, category } = req.query;
    let snap = await db.collection('products').where('active', '==', true).get();
    let products = snapToArr(snap);
    if (category) products = products.filter(p => p.category === category);
    products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const total = products.length;
    const off = parseInt(offset) || 0;
    const lim = parseInt(limit);
    if (lim) products = products.slice(off, off + lim);
    res.json({ data: products, total });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/recent
router.get('/recent', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('products').where('active', '==', true).get();
    const products = snapToArr(snap)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 4);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos recientes' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('products').where('active', '==', true).get();
    const cats = [...new Set(snapToArr(snap).map(p => p.category).filter(Boolean))];
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const product = await getProductFull(db, req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, category, description, long_description, specifications, emoji, image_url, cost_price, sale_price, purchase_link } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const now = new Date().toISOString();
    const ref = await db.collection('products').add({
      name,
      category: category || '',
      description: description || '',
      long_description: long_description || '',
      specifications: Array.isArray(specifications) ? specifications : [],
      emoji: emoji || '📦',
      image_url: image_url || '',
      cost_price: cost_price || 0,
      sale_price: sale_price || 0,
      purchase_link: purchase_link || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(await getProductFull(db, ref.id));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto', details: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('products').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { name, category, description, long_description, specifications, emoji, image_url, cost_price, sale_price, purchase_link, active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (long_description !== undefined) updates.long_description = long_description;
    if (specifications !== undefined) updates.specifications = Array.isArray(specifications) ? specifications : [];
    if (emoji !== undefined) updates.emoji = emoji;
    if (image_url !== undefined) updates.image_url = image_url;
    if (cost_price !== undefined) updates.cost_price = cost_price;
    if (sale_price !== undefined) updates.sale_price = sale_price;
    if (purchase_link !== undefined) updates.purchase_link = purchase_link;
    if (active !== undefined) updates.active = Boolean(active);
    await ref.update(updates);
    res.json(await getProductFull(db, req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('products').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    // Deletar imagens do Storage e subcoleção
    const imgSnap = await ref.collection('images').get();
    await Promise.all(imgSnap.docs.map(async img => {
      await deleteFromStorage(img.data().image_url);
      await img.ref.delete();
    }));
    await ref.delete();
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ==================== IMAGENS ====================

// GET /api/products/:id/images
router.get('/:id/images', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('products').doc(req.params.id).collection('images')
      .orderBy('is_cover', 'desc').get();
    res.json(snapToArr(snap).map(img => ({ ...img, url: img.image_url })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

// POST /api/products/:id/images/upload - Subir archivo al Firebase Storage
router.post('/:id/images/upload', authenticate, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const db = getDb();
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });
    const existing = await db.collection('products').doc(req.params.id).collection('images').get();
    const count = existing.size;
    const isCover = count === 0;
    const imageUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
    const ref = await db.collection('products').doc(req.params.id).collection('images').add({
      product_id: req.params.id, image_url: imageUrl,
      caption: req.body.caption || '', sort_order: count,
      is_cover: isCover, created_at: new Date().toISOString()
    });
    // Atualiza cover_image no produto para aparecer no card da listagem
    if (isCover) {
      await db.collection('products').doc(req.params.id).update({ cover_image: imageUrl });
    }
    const img = docToObj(await ref.get());
    res.status(201).json({ ...img, url: img.image_url });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir imagen', details: err.message });
  }
});

// POST /api/products/:id/images/url - Agregar por URL externa
router.post('/:id/images/url', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ error: 'URL requerida' });
    const existing = await db.collection('products').doc(req.params.id).collection('images').get();
    const count = existing.size;
    const isCover = count === 0;
    const ref = await db.collection('products').doc(req.params.id).collection('images').add({
      product_id: req.params.id, image_url,
      caption: caption || '', sort_order: count,
      is_cover: isCover, created_at: new Date().toISOString()
    });
    // Atualiza cover_image no produto para aparecer no card da listagem
    if (isCover) {
      await db.collection('products').doc(req.params.id).update({ cover_image: image_url });
    }
    const img = docToObj(await ref.get());
    res.status(201).json({ ...img, url: img.image_url });
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar imagen' });
  }
});

// PUT /api/products/:pid/images/:iid/cover - Marcar portada
router.put('/:pid/images/:iid/cover', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const imgsRef = db.collection('products').doc(req.params.pid).collection('images');
    const snap = await imgsRef.get();
    const batch = db.batch();
    let newCoverUrl = '';
    snap.docs.forEach(doc => {
      const isCover = doc.id === req.params.iid;
      batch.update(doc.ref, { is_cover: isCover });
      if (isCover) newCoverUrl = doc.data().image_url;
    });
    await batch.commit();
    // Atualiza cover_image no produto
    if (newCoverUrl) {
      await db.collection('products').doc(req.params.pid).update({ cover_image: newCoverUrl });
    }
    res.json({ message: 'Portada actualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar portada' });
  }
});

// DELETE /api/products/:pid/images/:iid
router.delete('/:pid/images/:iid', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('products').doc(req.params.pid).collection('images').doc(req.params.iid);
    const img = docToObj(await ref.get());
    if (!img) return res.status(404).json({ error: 'No encontrada' });
    await deleteFromStorage(img.image_url);
    await ref.delete();
    // Se era capa, promove a próxima imagem
    if (img.is_cover) {
      const remaining = await db.collection('products').doc(req.params.pid).collection('images')
        .orderBy('sort_order').limit(1).get();
      if (!remaining.empty) await remaining.docs[0].ref.update({ is_cover: true });
    }
    res.json({ message: 'Imagen eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;
