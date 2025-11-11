/******************** IMPORTS (CDN) ********************/
console.log('[APP] módulo inicializando...');
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
// ⚠️ Não use analytics aqui
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/******************** FIREBASE CONFIG ********************/
// Use os dados do seu projeto (estes estão batendo com seus prints)
const firebaseConfig = {
  apiKey: "AIzaSyCkJgMgiz89Ra-GglXXolEf76Bf8j43deU",
  authDomain: "gen-lang-client-0187133986.firebaseapp.com",
  projectId: "gen-lang-client-0187133986",
  storageBucket: "gen-lang-client-0187133986.firebasestorage.app",
  messagingSenderId: "467345148998",
  appId: "1:467345148998:web:f220bd5382cccf4cb94e47",
  measurementId: "G-MLQ617DL87"
};

/******************** INICIALIZAÇÃO ********************/
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/******************** ENDPOINTS (Cloud Run) ********************/
// Confirme a região do seu serviço. Pelos prints está em europe-west1.
const CLOUD_RUN_BASE = 'https://create-checkout-session-467345148998.europe-west1.run.app';
const CHECKOUT_URL   = `${CLOUD_RUN_BASE}/create-checkout-session`;
const PORTAL_URL     = `${CLOUD_RUN_BASE}/billing-portal`;

/******************** FUNÇÕES AUXILIARES ********************/
async function irParaCheckout(uid) {
  console.log('[APP] irParaCheckout', { uid, CHECKOUT_URL });
  const resp = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      // troque se o seu Price for outro
      priceId: 'price_1SOTjHA0F0MY0usf0tf1YRd',
      success_url: window.location.origin + '/sucesso.html',
      cancel_url:  window.location.origin + '/cancelado.html'
    })
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { msg = (await resp.json())?.error || msg; } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error('Resposta inválida do backend (sem url).');
  }
}

async function abrirPortal(uid) {
  const resp = await fetch(PORTAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, return_url: window.location.origin })
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { msg = (await resp.json())?.error || msg; } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error('Resposta inválida do backend (sem url).');
  }
}

/******************** DOM + HANDLERS ********************/
window.addEventListener('DOMContentLoaded', () => {
  console.log('[APP] DOM pronto: registrando handlers');

  const badge        = document.getElementById('badge');
  const btnAssinar   = document.getElementById('assinar');
  const btnGerenciar = document.getElementById('gerenciar');
  const freeSec      = document.getElementById('free');
  const premiumSec   = document.getElementById('premium');

  function setPlanoUI(isPremium) {
    if (badge) badge.textContent = isPremium ? 'Plano: Premium' : 'Plano: Free';
    if (freeSec)      freeSec.style.display      = isPremium ? 'none' : '';
    if (premiumSec)   premiumSec.style.display   = isPremium ? '' : 'none';
    if (btnAssinar)   btnAssinar.style.display   = isPremium ? 'none' : '';
    if (btnGerenciar) btnGerenciar.style.display = isPremium ? '' : 'none';
  }

  // Botão Assinar
  if (btnAssinar) {
    btnAssinar.addEventListener('click', async (ev) => {
      ev.preventDefault();
      console.log('[APP] Click ASSINAR');
      try {
        let user = auth.currentUser;
        if (!user) {
          try { await signInWithPopup(auth, provider); }
          catch (e) {
            // Fallback se popup bloqueado
            if (e?.code === 'auth/popup-blocked' ||
                e?.code === 'auth/operation-not-supported-in-this-environment') {
              return signInWithRedirect(auth, provider);
            }
            throw e;
          }
          user = auth.currentUser;
        }
        if (user) await irParaCheckout(user.uid);
      } catch (e) {
        console.error(e);
        alert('Falha no fluxo de assinatura: ' + (e?.message || e));
      }
    });
  }

  // Botão Gerenciar
  if (btnGerenciar) {
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
        alert('Falha ao abrir portal: ' + (e?.message || e));
      }
    });
  }

  // Observa login e “gating” do premium
  onAuthStateChanged(auth, async (user) => {
    if (!user) { setPlanoUI(false); return; }

    // trata retorno de redirect (se tiver usado)
    try { await getRedirectResult(auth); } catch {}

    const ref = doc(db, 'users', user.uid);
    onSnapshot(ref, (snap) => {
      const u = snap.data() || {};
      const ativo = u.status_assinatura === 'ativo' || u.subscriptionStatus === 'active';
      const isPremium = ativo || u.plan === 'premium' || u.plan === 'pro';
      setPlanoUI(!!isPremium);
    }, () => setPlanoUI(false));
  });
});
