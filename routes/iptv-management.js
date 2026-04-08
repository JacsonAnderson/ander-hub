// routes/iptv-management.js
// Sistema de gestão de assinaturas IPTV
// Providers: Lumix TV (1 crédito = 4 portas), STlive (1 crédito = 1 tela)
// Roles: admin (tudo), reseller (só seus clientes, sem dados sensíveis)

const express = require('express');
const router = express.Router();
const { getDb, FieldValue, docToObj, snapToArr } = require('../database/firestore');
const { authenticate, adminOnly } = require('../middleware/auth');

// ── helpers ──────────────────────────────────────────────────────────────────

function resellerOnly(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'reseller')) return next();
  return res.status(403).json({ error: 'Acesso negado' });
}

// Remove campos sensíveis para revendedores
function sanitizeForReseller(sub) {
  const { account_user, account_pass, port, cost_price, ...safe } = sub;
  return safe;
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// Calcula status de pagamento automaticamente
function computePaymentStatus(nextPayment) {
  if (!nextPayment) return 'pending';
  const now = new Date();
  const next = new Date(nextPayment);
  const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 5) return 'due_soon';
  return 'paid';
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

// GET /api/iptvm/subscriptions
router.get('/subscriptions', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    const { status, provider, reseller_id, search } = req.query;

    let query = db.collection('iptv_subs');
    // Reseller only sees their own clients
    if (!isAdmin(req)) {
      query = query.where('reseller_id', '==', req.user.id);
    } else if (reseller_id) {
      query = query.where('reseller_id', '==', reseller_id);
    }
    if (provider) query = query.where('provider', '==', provider);
    if (status) query = query.where('payment_status', '==', status);

    const snap = await query.get();
    let subs = snapToArr(snap);

    // Search filter (in-memory)
    if (search) {
      const s = search.toLowerCase();
      subs = subs.filter(sub =>
        (sub.client_name || '').toLowerCase().includes(s) ||
        (sub.client_phone || '').toLowerCase().includes(s) ||
        (sub.device_name || '').toLowerCase().includes(s)
      );
    }

    // Sort by created_at desc
    subs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    if (!isAdmin(req)) {
      subs = subs.map(sanitizeForReseller);
    }

    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar assinaturas', details: err.message });
  }
});

// GET /api/iptvm/subscriptions/:id
router.get('/subscriptions/:id', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('iptv_subs').doc(req.params.id).get();
    const sub = docToObj(doc);
    if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

    // Reseller can only see their own
    if (!isAdmin(req) && sub.reseller_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Payment history
    const paymentsSnap = await db.collection('iptv_subs').doc(req.params.id)
      .collection('payments').orderBy('paid_at', 'desc').get();
    sub.payment_history = snapToArr(paymentsSnap);

    if (!isAdmin(req)) return res.json(sanitizeForReseller(sub));
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar assinatura', details: err.message });
  }
});

// POST /api/iptvm/subscriptions
router.post('/subscriptions', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    const {
      client_name, client_phone, account_id,
      port, device_name, price, next_payment, notes
    } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    // Resolve account data from account_id
    let provider = req.body.provider || '';
    let account_user = '', account_pass = '';
    if (account_id) {
      const accDoc = await db.collection('iptv_accounts').doc(account_id).get();
      if (!accDoc.exists) return res.status(400).json({ error: 'Conta de provedor não encontrada' });
      const acc = accDoc.data();
      provider = acc.provider;
      account_user = acc.account_user;
      account_pass = acc.account_pass;
    }

    if (!['lumix', 'stlive'].includes(provider)) {
      return res.status(400).json({ error: 'Provedor inválido — selecione uma conta de provedor' });
    }
    if (provider === 'lumix' && port && (port < 1 || port > 4)) {
      return res.status(400).json({ error: 'Porta Lumix deve ser entre 1 e 4' });
    }

    // Resolve reseller
    let resellerId = req.user.id;
    let resellerName = req.user.name;
    if (isAdmin(req) && req.body.reseller_id) {
      const rDoc = await db.collection('users').doc(req.body.reseller_id).get();
      if (rDoc.exists) {
        resellerId = rDoc.id;
        resellerName = rDoc.data().name || '';
      }
    }

    const now = new Date().toISOString();
    const data = {
      client_name,
      client_phone: client_phone || '',
      provider,
      account_id: account_id || '',
      account_user,
      account_pass,
      port: provider === 'lumix' ? (parseInt(port) || null) : null,
      device_name: device_name || '',
      reseller_id: resellerId,
      reseller_name: resellerName || '',
      price: parseFloat(price) || 0,
      payment_status: computePaymentStatus(next_payment),
      status: 'active',
      next_payment: next_payment || '',
      notes: notes || '',
      registered_at: now,
      created_at: now,
      updated_at: now
    };

    const ref = await db.collection('iptv_subs').add(data);
    const created = docToObj(await ref.get());

    // Log initial registration as first history entry
    await ref.collection('payments').add({
      type: 'registration',
      amount: parseFloat(price) || 0,
      paid_at: now,
      next_payment: next_payment || '',
      notes: 'Cadastro inicial',
      created_by: req.user.id
    });

    res.status(201).json(isAdmin(req) ? created : sanitizeForReseller(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar assinatura', details: err.message });
  }
});

// PUT /api/iptvm/subscriptions/:id
router.put('/subscriptions/:id', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_subs').doc(req.params.id);
    const existing = docToObj(await ref.get());
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    // Reseller can only edit their own
    if (!isAdmin(req) && existing.reseller_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updates = { updated_at: new Date().toISOString() };
    const fields = ['client_name', 'client_phone', 'device_name', 'price', 'next_payment', 'notes', 'status'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Admin-only fields
    if (isAdmin(req)) {
      ['port', 'provider', 'reseller_id', 'reseller_name'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });
      // If account_id changed, re-fetch credentials
      if (req.body.account_id !== undefined) {
        updates.account_id = req.body.account_id;
        if (req.body.account_id) {
          const db2 = getDb();
          const accDoc = await db2.collection('iptv_accounts').doc(req.body.account_id).get();
          if (accDoc.exists) {
            updates.provider = accDoc.data().provider;
            updates.account_user = accDoc.data().account_user;
            updates.account_pass = accDoc.data().account_pass;
          }
        }
      }
      if (req.body.reseller_id) {
        const db2 = getDb();
        const rDoc = await db2.collection('users').doc(req.body.reseller_id).get();
        if (rDoc.exists) updates.reseller_name = rDoc.data().name || '';
      }
    }

    // Recompute payment_status if next_payment changed
    const nextPayment = updates.next_payment || existing.next_payment;
    updates.payment_status = computePaymentStatus(nextPayment);

    await ref.update(updates);
    const updated = docToObj(await ref.get());
    res.json(isAdmin(req) ? updated : sanitizeForReseller(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar assinatura', details: err.message });
  }
});

// DELETE /api/iptvm/subscriptions/:id  (admin only)
router.delete('/subscriptions/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_subs').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Não encontrado' });

    // Delete payment history subcollection
    const paySnap = await ref.collection('payments').get();
    const batch = db.batch();
    paySnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await ref.delete();
    res.json({ message: 'Assinatura removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover assinatura', details: err.message });
  }
});

// ── PAYMENT REGISTRATION ──────────────────────────────────────────────────────

// POST /api/iptvm/subscriptions/:id/pay
router.post('/subscriptions/:id/pay', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_subs').doc(req.params.id);
    const existing = docToObj(await ref.get());
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    if (!isAdmin(req) && existing.reseller_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { amount, next_payment, notes } = req.body;
    if (!next_payment) return res.status(400).json({ error: 'Data do próximo pagamento obrigatória' });

    const now = new Date().toISOString();
    await ref.collection('payments').add({
      type: 'payment',
      amount: parseFloat(amount) || existing.price || 0,
      paid_at: now,
      next_payment,
      notes: notes || '',
      created_by: req.user.id
    });

    await ref.update({
      next_payment,
      payment_status: computePaymentStatus(next_payment),
      updated_at: now
    });

    const updated = docToObj(await ref.get());
    res.json(isAdmin(req) ? updated : sanitizeForReseller(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
  }
});

// ── PROVIDER ACCOUNTS (admin only) ───────────────────────────────────────────

// GET /api/iptvm/accounts/:id/subscribers  (admin only)
router.get('/accounts/:id/subscribers', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const accDoc = await db.collection('iptv_accounts').doc(req.params.id).get();
    if (!accDoc.exists) return res.status(404).json({ error: 'Conta não encontrada' });
    const account = { id: accDoc.id, ...accDoc.data() };

    const snap = await db.collection('iptv_subs')
      .where('account_id', '==', req.params.id)
      .where('status', '==', 'active')
      .get();
    const subs = snapToArr(snap);

    // For Lumix: group by port (1-4). For STlive: single slot
    if (account.provider === 'lumix') {
      const maxPorts = account.max_ports || 4;
      const ports = [];
      for (let p = 1; p <= maxPorts; p++) {
        const sub = subs.find(s => s.port === p) || null;
        ports.push({ port: p, sub });
      }
      res.json({ account, ports, total: subs.length });
    } else {
      res.json({ account, subs, total: subs.length });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar assinantes', details: err.message });
  }
});

// GET /api/iptvm/accounts
router.get('/accounts', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('iptv_accounts').get();
    const accounts = snapToArr(snap).sort((a, b) => (a.provider || '').localeCompare(b.provider || ''));
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contas', details: err.message });
  }
});

// POST /api/iptvm/accounts
router.post('/accounts', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { provider, account_user, account_pass, max_ports, cost_price, notes } = req.body;
    if (!provider || !account_user) {
      return res.status(400).json({ error: 'Provedor e usuário são obrigatórios' });
    }
    const now = new Date().toISOString();
    const ref = await db.collection('iptv_accounts').add({
      provider,
      account_user,
      account_pass: account_pass || '',
      max_ports: provider === 'lumix' ? (parseInt(max_ports) || 4) : 1,
      cost_price: parseFloat(cost_price) || 0,
      notes: notes || '',
      active: true,
      created_at: now,
      updated_at: now
    });
    res.status(201).json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta', details: err.message });
  }
});

// PUT /api/iptvm/accounts/:id
router.put('/accounts/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_accounts').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Não encontrado' });
    const updates = { updated_at: new Date().toISOString() };
    ['provider', 'account_user', 'account_pass', 'max_ports', 'cost_price', 'notes', 'active'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    await ref.update(updates);
    res.json(docToObj(await ref.get()));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta', details: err.message });
  }
});

// DELETE /api/iptvm/accounts/:id
router.delete('/accounts/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('iptv_accounts').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Não encontrado' });
    await ref.delete();
    res.json({ message: 'Conta removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta', details: err.message });
  }
});

// ── RESELLERS (admin only) ────────────────────────────────────────────────────

// GET /api/iptvm/resellers/:id/subscriptions  (admin only)
router.get('/resellers/:id/subscriptions', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const rDoc = await db.collection('users').doc(req.params.id).get();
    if (!rDoc.exists) return res.status(404).json({ error: 'Revendedor não encontrado' });
    const reseller = { id: rDoc.id, ...rDoc.data() };
    delete reseller.password;

    const snap = await db.collection('iptv_subs')
      .where('reseller_id', '==', req.params.id)
      .get();
    const subs = snapToArr(snap).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const total = subs.length;
    const active = subs.filter(s => s.status === 'active').length;
    const overdue = subs.filter(s => s.payment_status === 'overdue').length;
    const monthlyRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

    res.json({ reseller, subs, stats: { total, active, overdue, monthlyRevenue } });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar assinaturas do revendedor', details: err.message });
  }
});

// GET /api/iptvm/resellers
router.get('/resellers', authenticate, adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('users').where('role', '==', 'reseller').get();
    const resellers = snapToArr(snap).map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });
    res.json(resellers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar revendedores', details: err.message });
  }
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

// GET /api/iptvm/dashboard
router.get('/dashboard', authenticate, resellerOnly, async (req, res) => {
  try {
    const db = getDb();
    let query = db.collection('iptv_subs');
    if (!isAdmin(req)) query = query.where('reseller_id', '==', req.user.id);

    const snap = await query.get();
    const subs = snapToArr(snap);

    const total = subs.length;
    const active = subs.filter(s => s.status === 'active').length;
    const overdue = subs.filter(s => s.payment_status === 'overdue').length;
    const dueSoon = subs.filter(s => s.payment_status === 'due_soon').length;

    const byProvider = { lumix: 0, stlive: 0 };
    subs.forEach(s => { if (byProvider[s.provider] !== undefined) byProvider[s.provider]++; });

    // Monthly revenue estimate (active subs)
    const monthlyRevenue = subs
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

    // Recent subscriptions (last 5)
    const recent = subs
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5)
      .map(s => isAdmin(req) ? s : sanitizeForReseller(s));

    // Overdue list
    const overdueList = subs
      .filter(s => s.payment_status === 'overdue')
      .sort((a, b) => (a.next_payment || '').localeCompare(b.next_payment || ''))
      .slice(0, 10)
      .map(s => isAdmin(req) ? s : sanitizeForReseller(s));

    res.json({ total, active, overdue, dueSoon, byProvider, monthlyRevenue, recent, overdueList });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar dashboard', details: err.message });
  }
});

module.exports = router;
