// routes/payments.js
// Mídia de pagamentos no Firebase Storage
// Subcoleção: payments/{id}/media
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getDb, getBucket, docToObj, snapToArr, FieldValue } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para videos
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mkv/.test(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  }
});

async function uploadToStorage(buffer, originalName, mimetype, folder) {
  const bucket = getBucket();
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const file = bucket.file(filename);
  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

async function deleteFromStorage(url) {
  try {
    if (!url || !url.includes('storage.googleapis.com')) return;
    const bucket = getBucket();
    const urlPath = new URL(url).pathname;
    const filename = urlPath.replace(`/${bucket.name}/`, '');
    await bucket.file(filename).delete();
  } catch (_) { /* silencioso */ }
}

// Helper: pago con su media
async function getPaymentFull(db, id) {
  const doc = await db.collection('payments').doc(id).get();
  const payment = docToObj(doc);
  if (!payment) return null;
  const mediaSnap = await db.collection('payments').doc(id).collection('media')
    .orderBy('sort_order').get();
  payment.media = snapToArr(mediaSnap).map(m => ({ ...m, url: m.media_url }));
  return payment;
}

// ==================== HELPERS PARA DROPDOWNS ====================

// GET /api/payments/helpers
router.get('/helpers', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const [clientsSnap, servicesSnap, productsSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'client').get(),
      db.collection('services').where('active', '==', true).get(),
      db.collection('products').where('active', '==', true).get()
    ]);
    res.json({
      clients: snapToArr(clientsSnap).map(({ password: _, ...c }) => c)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      services: snapToArr(servicesSnap).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      products: snapToArr(productsSnap).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener helpers' });
  }
});

// ==================== CRUD PAGOS ====================

// GET /api/payments
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { status, client_id, month, year } = req.query;
    const snap = await db.collection('payments').get();
    let payments = snapToArr(snap);
    // Filtros en memoria
    if (status) payments = payments.filter(p => p.status === status);
    if (client_id) payments = payments.filter(p => p.client_id === client_id);
    if (year) {
      const y = String(year);
      payments = payments.filter(p => (p.payment_date || '').startsWith(y));
    }
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      payments = payments.filter(p => (p.payment_date || '').startsWith(prefix));
    }
    payments.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
    // Contar media de cada pago
    const result = await Promise.all(payments.map(async p => {
      const mediaSnap = await db.collection('payments').doc(p.id).collection('media').get();
      return { ...p, media_count: mediaSnap.size };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// GET /api/payments/my-orders - Pedidos del cliente logueado
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('payments').where('client_id', '==', req.user.id).get();
    const payments = snapToArr(snap).sort((a, b) =>
      (b.payment_date || '').localeCompare(a.payment_date || '')
    );
    const result = await Promise.all(payments.map(async p => {
      const mediaSnap = await db.collection('payments').doc(p.id).collection('media').get();
      return { ...p, media: snapToArr(mediaSnap).map(m => ({ ...m, url: m.media_url })) };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/payments/dashboard
router.get('/dashboard', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const year = String(req.query.year || new Date().getFullYear());
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const snap = await db.collection('payments').get();
    const all = snapToArr(snap);
    const paid = all.filter(p => p.status === 'Pagado');
    // Totales globales (solo pagados)
    const totals = {
      total_sales: paid.reduce((s, p) => s + (p.sale_price || 0), 0),
      total_costs: paid.reduce((s, p) => s + (p.cost_price || 0), 0),
      total_profit: paid.reduce((s, p) => s + ((p.sale_price || 0) - (p.cost_price || 0)), 0),
      total_transactions: paid.length
    };
    // Totales del mes actual
    const thisMonth = paid.filter(p => (p.payment_date || '').startsWith(`${year}-${currentMonth}`));
    const monthTotals = {
      month_sales: thisMonth.reduce((s, p) => s + (p.sale_price || 0), 0),
      month_costs: thisMonth.reduce((s, p) => s + (p.cost_price || 0), 0),
      month_profit: thisMonth.reduce((s, p) => s + ((p.sale_price || 0) - (p.cost_price || 0)), 0),
      month_transactions: thisMonth.length
    };
    // Ganancias por mes del año
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const monthPaid = paid.filter(p => (p.payment_date || '').startsWith(`${year}-${m}`));
      return {
        month: i + 1,
        profit: monthPaid.reduce((s, p) => s + ((p.sale_price || 0) - (p.cost_price || 0)), 0)
      };
    });
    const recentPayments = all
      .sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
      .slice(0, 5);
    const pending = all.filter(p => p.status === 'Pendiente');
    const pendingData = {
      count: pending.length,
      total: pending.reduce((s, p) => s + (p.sale_price || 0), 0)
    };
    // Por status
    const statusMap = {};
    all.forEach(p => {
      if (!statusMap[p.status]) statusMap[p.status] = { status: p.status, count: 0, total: 0 };
      statusMap[p.status].count++;
      statusMap[p.status].total += p.sale_price || 0;
    });
    // Conteos
    const [clientsSnap, productsSnap, servicesSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'client').get(),
      db.collection('products').where('active', '==', true).get(),
      db.collection('services').where('active', '==', true).get()
    ]);
    res.json({
      totals, monthTotals, monthlyData, recentPayments,
      pending: pendingData,
      byStatus: Object.values(statusMap),
      counts: {
        clients: clientsSnap.size,
        products: productsSnap.size,
        services: servicesSnap.size
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener dashboard', details: err.message });
  }
});

// GET /api/payments/by-client/:clientId
router.get('/by-client/:clientId', authenticate, async (req, res) => {
  try {
    const db = getDb();
    if (req.user.role !== 'admin' && req.user.id !== req.params.clientId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const snap = await db.collection('payments').where('client_id', '==', req.params.clientId).get();
    const payments = snapToArr(snap).sort((a, b) =>
      (b.payment_date || '').localeCompare(a.payment_date || '')
    );
    const result = await Promise.all(payments.map(async p => {
      const mediaSnap = await db.collection('payments').doc(p.id).collection('media').get();
      return { ...p, media: snapToArr(mediaSnap).map(m => ({ ...m, url: m.media_url })) };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pagos del cliente' });
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const payment = await getPaymentFull(db, req.params.id);
    if (!payment) return res.status(404).json({ error: 'No encontrado' });
    if (req.user.role !== 'admin' && req.user.id !== payment.client_id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pago' });
  }
});

// POST /api/payments
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { client_id, service_id, product_id, concept, cost_price, sale_price, status, delivery_status, payment_date, notes } = req.body;
    // Resolver nombres en paralelo
    const [clientDoc, serviceDoc, productDoc] = await Promise.all([
      client_id ? db.collection('users').doc(client_id).get() : null,
      service_id ? db.collection('services').doc(service_id).get() : null,
      product_id ? db.collection('products').doc(product_id).get() : null
    ]);
    const clientName = clientDoc?.exists ? clientDoc.data().name : '';
    const serviceName = serviceDoc?.exists ? serviceDoc.data().name : (concept || '');
    const productName = productDoc?.exists ? productDoc.data().name : '';
    const now = new Date().toISOString();
    const ref = await db.collection('payments').add({
      client_id: client_id || null,
      client_name: clientName,
      service_id: service_id || null,
      service_name: serviceName,
      product_id: product_id || null,
      product_name: productName,
      concept: serviceName,
      cost_price: cost_price || 0,
      sale_price: sale_price || 0,
      status: status || 'Pendiente',
      delivery_status: delivery_status || '',
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      notes: notes || '',
      created_at: now,
      updated_at: now
    });
    res.status(201).json(await getPaymentFull(db, ref.id));
  } catch (err) {
    res.status(500).json({ error: 'Error al crear pago', details: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('payments').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    const { client_id, service_id, product_id, concept, cost_price, sale_price, status, delivery_status, payment_date, notes } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (client_id !== undefined) {
      updates.client_id = client_id || null;
      if (client_id) {
        const d = await db.collection('users').doc(client_id).get();
        updates.client_name = d.exists ? d.data().name : '';
      }
    }
    if (service_id !== undefined) {
      updates.service_id = service_id || null;
      if (service_id) {
        const d = await db.collection('services').doc(service_id).get();
        updates.service_name = d.exists ? d.data().name : '';
      }
    }
    if (product_id !== undefined) {
      updates.product_id = product_id || null;
      if (product_id) {
        const d = await db.collection('products').doc(product_id).get();
        updates.product_name = d.exists ? d.data().name : '';
      }
    }
    if (concept !== undefined) updates.concept = concept;
    if (cost_price !== undefined) updates.cost_price = cost_price;
    if (sale_price !== undefined) updates.sale_price = sale_price;
    if (status !== undefined) updates.status = status;
    if (delivery_status !== undefined) updates.delivery_status = delivery_status;
    if (payment_date !== undefined) updates.payment_date = payment_date;
    if (notes !== undefined) updates.notes = notes;
    await ref.update(updates);
    res.json(await getPaymentFull(db, req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('payments').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'No encontrado' });
    // Deletar media do Storage e subcoleção
    const mediaSnap = await ref.collection('media').get();
    await Promise.all(mediaSnap.docs.map(async m => {
      await deleteFromStorage(m.data().media_url);
      await m.ref.delete();
    }));
    await ref.delete();
    res.json({ message: 'Pago eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ==================== MEDIA DE PAGOS ====================

// GET /api/payments/:id/media
router.get('/:id/media', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const payDoc = await db.collection('payments').doc(req.params.id).get();
    if (!payDoc.exists) return res.status(404).json({ error: 'Pago no encontrado' });
    if (req.user.role !== 'admin' && req.user.id !== payDoc.data().client_id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const snap = await db.collection('payments').doc(req.params.id).collection('media')
      .orderBy('sort_order').get();
    res.json(snapToArr(snap).map(m => ({ ...m, url: m.media_url })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener media' });
  }
});

// POST /api/payments/:id/media/upload - Subir foto/video al Storage
router.post('/:id/media/upload', authenticate, adminOnly, upload.single('media'), async (req, res) => {
  try {
    const db = getDb();
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó archivo' });
    const isVideo = /mp4|mov|avi|webm|mkv/.test(path.extname(req.file.originalname).toLowerCase());
    const existing = await db.collection('payments').doc(req.params.id).collection('media').get();
    const mediaUrl = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype, 'payments');
    const ref = await db.collection('payments').doc(req.params.id).collection('media').add({
      payment_id: req.params.id,
      media_type: isVideo ? 'video' : 'image',
      media_url: mediaUrl,
      caption: req.body.caption || '',
      sort_order: existing.size,
      created_at: new Date().toISOString()
    });
    const media = docToObj(await ref.get());
    res.status(201).json({ ...media, url: media.media_url });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir archivo', details: err.message });
  }
});

// POST /api/payments/:id/media/url - Agregar por URL externa
router.post('/:id/media/url', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { media_url, media_type, caption } = req.body;
    if (!media_url) return res.status(400).json({ error: 'URL requerida' });
    const existing = await db.collection('payments').doc(req.params.id).collection('media').get();
    const ref = await db.collection('payments').doc(req.params.id).collection('media').add({
      payment_id: req.params.id,
      media_type: media_type || 'image',
      media_url,
      caption: caption || '',
      sort_order: existing.size,
      created_at: new Date().toISOString()
    });
    const media = docToObj(await ref.get());
    res.status(201).json({ ...media, url: media.media_url });
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar media' });
  }
});

// DELETE /api/payments/:paymentId/media/:mediaId
router.delete('/:paymentId/media/:mediaId', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('payments').doc(req.params.paymentId)
      .collection('media').doc(req.params.mediaId);
    const m = docToObj(await ref.get());
    if (!m) return res.status(404).json({ error: 'No encontrado' });
    await deleteFromStorage(m.media_url);
    await ref.delete();
    res.json({ message: 'Media eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar media' });
  }
});

module.exports = router;
