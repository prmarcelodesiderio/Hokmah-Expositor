// server.js
const express = require('express');
const path = require('path');
const app = express();

// JSON no body
app.use(express.json());

// ---- CORS (usa a variável de ambiente CORS_ORIGIN) ----
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---- Stripe ----
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ---- Servir arquivos estáticos (index.html, sucesso.html, cancelado.html) ----
app.use(express.static(__dirname));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- Criar sessão de checkout (POST) ----
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { uid, priceId, success_url, cancel_url } = req.body || {};
    if (!uid || !priceId) {
      return res.status(400).json({ error: 'uid e priceId são obrigatórios' });
    }

    // Procurar (ou criar) Customer por metadata.uid
    let customerId;
    const search = await stripe.customers.search({
      query: `metadata['uid']:'${uid}'`
    });
    if (search.data.length) {
      customerId = search.data[0].id;
    } else {
      const customer = await stripe.customers.create({ metadata: { uid } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || process.env.SUCCESS_URL,
      cancel_url: cancel_url || process.env.CANCEL_URL,
      allow_promotion_codes: true
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Erro checkout:', err);
    return res.status(500).json({ error: 'Erro ao criar sessão de checkout' });
  }
});

// ---- Portal de cobrança (GET) ----
app.get('/billing-portal', async (req, res) => {
  try {
    const uid = req.query.uid;
    if (!uid) return res.status(400).json({ error: 'uid é obrigatório (?uid=...)' });

    const search = await stripe.customers.search({
      query: `metadata['uid']:'${uid}'`
    });
    if (!search.data.length) {
      return res.status(404).json({ error: 'Cliente não encontrado para este UID' });
    }
    const customerId = search.data[0].id;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.SUCCESS_URL || 'https://example.com/sucesso.html'
    });

    return res.json({ url: portal.url });
  } catch (err) {
    console.error('Erro portal:', err);
    return res.status(500).json({ error: 'Erro ao criar sessão do portal' });
  }
});

// ---- Subir servidor ----
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Hokmah Expositor web rodando na porta ' + port);
});

