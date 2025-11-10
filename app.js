/******************** IMPORTS ********************/
console.log('[APP] módulo inicializando...');
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/******************** FIREBASE CONFIG ********************/
const firebaseConfig = {
  apiKey: "AIzaSyCkJ9Mgiz89Ra-GglXXOleF76Bf843deU",
  authDomain: "gen-lang-client-0187133986.firebaseapp.com",
  projectId: "gen-lang-client-0187133986",
  storageBucket: "gen-lang-client-0187133986.appspot.com",
  messagingSenderId: "467345148998",
  appId: "1:467345148998:web:f2209db5382ccc4fcb94e7",
  measurementId: "G-MLQ671DLB7"
};

/******************** INICIALIZAÇÃO ********************/
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/******************** ENDPOINTS (Cloud Run) ********************/
const CLOUD_RUN_BASE = 'https://create-checkout-session-467345148998.europe-west1.run.app';
const CHECKOUT_URL   = `${CLOUD_RUN_BASE}/create-checkout-session`;
const PORTAL_URL     = `${CLOUD_RUN_BASE}/billing-portal`;

/******************** UI ********************/
const badge        = document.getElementById('badge');
const btnAssinar   = document.getElementById('assinar');
const btnGerenciar = document.getElementById('gerenciar');
const freeSec      = document.getElementById('free');
const premiumSec   = document.getElementById('premium');

function setPlanoUI(isPremium){
  if (badge) badge.textContent = isPremium ? 'Plano: Premium' : 'Plano: Free';
  freeSec.style.display    = isPremium ? 'none' : '';
  premiumSec.style.display = isPremium ? '' : 'none';
  btnAssinar.style.display = isPremium ? 'none' : '';
  btnGerenciar.style.display = isPremium ? '' : 'none';
}

/******************** FLUXOS ********************/
async function irParaCheckout(uid) {
  console.log('[APP] irParaCheckout', { uid, CHECKOUT_URL });
  const resp = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      priceId: 'price_1SOTjHA0F0MY0usf0tf1YRd',
      success_url: window.location.origin + '/sucesso.html',
      cancel_url:  window.location.origin + '/cancelado.html'
    })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(()=>({}));
    throw new Error(err?.error || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data?.url) window.location.href = data.url;
  else throw new Error('Resposta inválida do backend (sem url).');
}

async function abrirPortal(uid) {
  const resp = await fetch(PORTAL_URL, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ uid, return_url: window.location.origin })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(()=>({}));
    throw new Error(err?.error || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data?.url) window.location.href = data.url;
  else throw new Error('Resposta inválida do backend (sem url).');
}

/******************** HANDLERS ********************/
btnAssinar.addEventListener('click', async (ev) => {
  ev.preventDefault();
  console.log('[APP] Click ASSINAR');
  try {
    let user = auth.currentUser;
    if (!user) {
      await signInWithPopup(auth, provider);
      user = auth.currentUser;
      console.log('[APP] Login OK', user?.uid);
    }
    if (user) await irParaCheckout(user.uid);
  } catch (e) {
    console.error(e);
    alert('Falha no fluxo de assinatura: ' + e.message);
  }
});

btnGerenciar.addEventListener('click', async (ev) => {
  ev.preventDefault();
  console.log('[APP] Click GERENCIAR');
  try {
    let user = auth.currentUser;
    if (!user) {
      try { await signInWithPopup(auth, provider); }
      catch { return alert('Login cancelado.'); }
    }
    await abrirPortal(auth.currentUser.uid);
  } catch (e) {
    console.error(e);
    alert('Falha ao abrir portal de cobrança: ' + (e?.message || e));
  }
});

/******************** AUTH + GATING ********************/
onAuthStateChanged(auth, (user) => {
  if (!user) { setPlanoUI(false); return; }
  const ref = doc(db, 'users', user.uid);
  onSnapshot(ref, (snap) => {
    const u = snap.data() || {};
    const ativo = u.status_assinatura === 'ativo' || u.subscriptionStatus === 'active';
    const isPremium = ativo || u.plan === 'premium' || u.plan === 'pro';
    setPlanoUI(!!isPremium);
  }, (err) => {
    console.error('[APP] onSnapshot users err', err);
    setPlanoUI(false);
  });
});

console.log('[APP] módulo carregado');
