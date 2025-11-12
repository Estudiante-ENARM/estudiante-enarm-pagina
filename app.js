// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCjOqAQUDeKi_bucZ8PzunNQsx1UlomuEw",
  authDomain: "pagina-buena.firebaseapp.com",
  projectId: "pagina-buena",
  storageBucket: "pagina-buena.firebasestorage.app",
  messagingSenderId: "810208199031",
  appId: "1:810208199031:web:707a76b931ee7d2f002172"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM ---
const sidebar = document.getElementById('sidebar');
const logoArea = document.getElementById('logo-area');
const logoImg = document.getElementById('logo-img');
const menuItems = document.querySelectorAll('.menu-item');
const topicsContainer = document.getElementById('topics-container');
const searchInput = document.getElementById('search');
const adminBtn = document.getElementById('admin-btn');
const adminModal = document.getElementById('admin-modal');
const adminLoginBtn = document.getElementById('admin-login');
const adminEmailInput = document.getElementById('admin-email');
const adminPassInput = document.getElementById('admin-pass');
const adminStatus = document.getElementById('admin-status');
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logout-btn');
const temaForm = document.getElementById('tema-form');
const temaTitle = document.getElementById('tema-title');
const temaSpecialty = document.getElementById('tema-specialty');
const linksArea = document.getElementById('links-area');
const addLinkBtn = document.getElementById('add-link');
const deleteTemaBtn = document.getElementById('delete-tema');
const exportBackupBtn = document.getElementById('export-backup');
const closeModalBtn = document.querySelector('.close-modal');

const socialIconsArea = document.getElementById('social-icons');
const socialWhatsappA = document.getElementById('social-whatsapp');
const socialTiktokA = document.getElementById('social-tiktok');
const socialInstagramA = document.getElementById('social-instagram');
const socialTelegramA = document.getElementById('social-telegram');

// Admin social inputs/buttons
const adminSocialSection = document.getElementById('admin-social-links');
const inputWhatsapp = document.getElementById('input-whatsapp');
const inputTiktok = document.getElementById('input-tiktok');
const inputInstagram = document.getElementById('input-instagram');
const inputTelegram = document.getElementById('input-telegram');
const saveWhatsappBtn = document.getElementById('save-whatsapp');
const saveTiktokBtn = document.getElementById('save-tiktok');
const saveInstagramBtn = document.getElementById('save-instagram');
const saveTelegramBtn = document.getElementById('save-telegram');
const clearWhatsappBtn = document.getElementById('clear-whatsapp');
const clearTiktokBtn = document.getElementById('clear-tiktok');
const clearInstagramBtn = document.getElementById('clear-instagram');
const clearTelegramBtn = document.getElementById('clear-telegram');

// New mobile controls
const menuBtn = document.getElementById('menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const logoImgMobile = document.getElementById('logo-img-mobile');

let editingDocId = null;

// Sección por defecto (ya mantenida)
let currentFilterSpecialty = 'Acceso gratuito limitado';

let allTopics = [];
let currentUserUid = null;

// Firestore ref for social links
const socialDocRef = db.collection('social_links').doc('config');

// --- Logo modo claro/oscuro ---
function updateLogoForScheme(){
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // mantiene rutas previas
  const desktopLogo = document.getElementById('logo-img');
  const mobileLogo = document.getElementById('logo-img-mobile');
  if(desktopLogo) desktopLogo.src = dark ? 'logo-dark.png' : 'logo-light.png';
  if(mobileLogo) mobileLogo.src = dark ? 'logo-dark.png' : 'logo-light.png';
}
updateLogoForScheme();
if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateLogoForScheme);

// --- Sidebar toggle (desktop existing behavior preserved) ---
if(logoArea){
  logoArea.addEventListener('click', () => {
    // desktop toggle
    sidebar.classList.toggle('closed');
  });
}

// --- Mobile drawer handlers ---
// open mobile drawer
function openMobileDrawer(){
  sidebar.classList.add('open-mobile');
  if(mobileOverlay) mobileOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
// close mobile drawer
function closeMobileDrawer(){
  sidebar.classList.remove('open-mobile');
  sidebar.classList.remove('open'); // make sure desktop 'open' is not forcing layout
  if(mobileOverlay) mobileOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

if (menuBtn) {
  menuBtn.addEventListener('click', () => openMobileDrawer());
}
if (mobileOverlay) {
  mobileOverlay.addEventListener('click', () => closeMobileDrawer());
}
// also allow ESC to close overlay/drawer
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && sidebar.classList.contains('open-mobile')) {
    closeMobileDrawer();
  }
});

// close drawer after selecting a menu item on small screens
menuItems.forEach(btn => {
  btn.addEventListener('click', () => {
    if(window.innerWidth <= 900){
      setTimeout(()=> closeMobileDrawer(), 180);
    }
  });
});

// --- NUEVO: abrir sidebar desde logo móvil ---
if (logoImgMobile) {
  logoImgMobile.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      openMobileDrawer();
    }
  });
}

// --- Menú (existing) ---
menuItems.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilterSpecialty = btn.dataset.specialty;
    menuItems.forEach(m=>m.classList.remove('active'));
    btn.classList.add('active');
    renderTopics();
  });
});

// --- Búsqueda ---
if(searchInput) searchInput.addEventListener('input', renderTopics);

// --- Firestore realtime: temas ---
db.collection('temas').orderBy('title').onSnapshot(snapshot => {
  allTopics = [];
  snapshot.forEach(doc => allTopics.push({ id: doc.id, ...doc.data() }));
  renderTopics();
}, err => console.error('temas onSnapshot err', err));

// --- Firestore realtime: social links ---
socialDocRef.onSnapshot(doc => {
  const data = doc.exists ? doc.data() : {};
  const whatsapp = data.whatsapp || '';
  const tiktok = data.tiktok || '';
  const instagram = data.instagram || '';
  const telegram = data.telegram || '';

  updateSocialAnchor(socialWhatsappA, whatsapp);
  updateSocialAnchor(socialTiktokA, tiktok);
  updateSocialAnchor(socialInstagramA, instagram);
  updateSocialAnchor(socialTelegramA, telegram);

  if(currentUserUid && inputWhatsapp) {
    inputWhatsapp.value = whatsapp;
    inputTiktok.value = tiktok;
    inputInstagram.value = instagram;
    inputTelegram.value = telegram;
  }
}, err => {
  console.error('Error listening social links:', err);
});

function updateSocialAnchor(aEl, url){
  if(!aEl) return;
  if(url && url.trim() !== ''){
    aEl.href = url;
    aEl.setAttribute('aria-disabled','false');
    aEl.style.opacity = '1';
    aEl.style.pointerEvents = 'auto';
  } else {
    aEl.href = '#';
    aEl.setAttribute('aria-disabled','true');
    aEl.style.opacity = '0.5';
    aEl.style.pointerEvents = 'none';
  }
}

function renderTopics(){
  const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
  topicsContainer.innerHTML = '';

  const filtered = allTopics.filter(t => {
    if(currentFilterSpecialty === 'Todos'){
      if(t.specialty === 'Acceso gratuito limitado') return false;
      return q === '' || (t.title && t.title.toLowerCase().includes(q));
    } else {
      return t.specialty === currentFilterSpecialty && (q === '' || (t.title && t.title.toLowerCase().includes(q)));
    }
  });

  if(filtered.length === 0){
    topicsContainer.innerHTML = '<p>No hay resultados</p>';
    return;
  }
  filtered.forEach(t => {
    const card = document.createElement('article');
    card.className = 'topic';
    card.innerHTML = `
      <div class="specialty">${t.specialty || ''}</div>
      <h4>${t.title || ''}</h4>
      <div class="links"></div>
    `;
    const linksDiv = card.querySelector('.links');
    if(Array.isArray(t.links)){
      t.links.forEach(l=>{
        if(l && l.url){
          const a = document.createElement('a');
          a.className = 'link-btn';
          a.textContent = l.label || 'Abrir';
          a.href = l.url;
          a.target = '_blank';
          linksDiv.appendChild(a);
        }
      });
    }
    if(currentUserUid){
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.className = 'edit-btn';
      editBtn.addEventListener('click', ()=> openEditorWithTopic(t));
      linksDiv.appendChild(editBtn);
    }
    topicsContainer.appendChild(card);
  });
}

// --- Admin modal (existing) ---
if(adminBtn) adminBtn.addEventListener('click', ()=> {
  adminModal.classList.remove('hidden');
  adminModal.setAttribute('aria-hidden','false');
});
if(closeModalBtn) closeModalBtn.addEventListener('click', ()=> {
  adminModal.classList.add('hidden');
  adminModal.setAttribute('aria-hidden','true');
});

// --- Login Admin ---
if(adminLoginBtn) adminLoginBtn.addEventListener('click', async () => {
  const email = adminEmailInput ? adminEmailInput.value.trim() : '';
  const pass = adminPassInput ? adminPassInput.value : '';
  if(!email || !pass){ if(adminStatus) adminStatus.textContent = 'Ingresa email y contraseña'; return; }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    currentUserUid = cred.user.uid;
    if(adminStatus) adminStatus.textContent = 'Autenticado ✅';
    if(adminPanel) adminPanel.classList.remove('hidden');
    const authDiv = document.getElementById('admin-auth');
    if(authDiv) authDiv.classList.add('hidden');

    // populate social inputs after login (one-time fetch)
    try {
      const docSnap = await socialDocRef.get();
      const data = docSnap.exists ? docSnap.data() : {};
      if(inputWhatsapp) inputWhatsapp.value = data.whatsapp || '';
      if(inputTiktok) inputTiktok.value = data.tiktok || '';
      if(inputInstagram) inputInstagram.value = data.instagram || '';
      if(inputTelegram) inputTelegram.value = data.telegram || '';
    } catch(e) {
      console.warn('No se pudo leer social config tras login', e);
    }

  } catch(e){ if(adminStatus) adminStatus.textContent = 'Error: ' + e.message; }
});

if(logoutBtn) logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    currentUserUid = null;
    if(adminPanel) adminPanel.classList.add('hidden');
    const authDiv = document.getElementById('admin-auth');
    if(authDiv) authDiv.classList.remove('hidden');
    if(adminModal) adminModal.classList.add('hidden');
  } catch(e){ console.error('Sign out err', e); }
});

// --- Formulario de tema ---
if(addLinkBtn) addLinkBtn.addEventListener('click', ()=> {
  const div = document.createElement('div');
  div.className = 'link-row';
  div.innerHTML = `<input class="link-label" placeholder="Etiqueta" /><input class="link-url" placeholder="https://..." />`;
  if(linksArea) linksArea.appendChild(div);
});

if(temaForm) temaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!currentUserUid){ alert('Debes iniciar sesión'); return; }
  const title = temaTitle ? temaTitle.value.trim() : '';
  const specialty = temaSpecialty ? temaSpecialty.value : '';
  const links = [];
  document.querySelectorAll('#links-area .link-row').forEach(r=>{
    const labelEl = r.querySelector('.link-label');
    const urlEl = r.querySelector('.link-url');
    const label = labelEl ? labelEl.value.trim() : '';
    const url = urlEl ? urlEl.value.trim() : '';
    if(url){ links.push({ label: label || 'Abrir', url }); }
  });
  if(!title || !specialty || links.length===0){ alert('Faltan datos'); return; }

  try {
    if(editingDocId){
      await db.collection('temas').doc(editingDocId).update({ title, specialty, links });
    } else {
      await db.collection('temas').add({ title, specialty, links, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    alert('Guardado correctamente');
    resetForm();
  } catch(e){ alert('Error: ' + e.message); }
});

function openEditorWithTopic(t){
  if(!adminModal) return;
  adminModal.classList.remove('hidden');
  adminModal.setAttribute('aria-hidden','false');
  if(adminPanel) adminPanel.classList.remove('hidden');
  const authDiv = document.getElementById('admin-auth');
  if(authDiv) authDiv.classList.add('hidden');
  if(temaTitle) temaTitle.value = t.title || '';
  if(temaSpecialty) temaSpecialty.value = t.specialty || '';
  if(linksArea){
    linksArea.innerHTML = '';
    (t.links || []).forEach(l => {
      const div = document.createElement('div');
      div.className = 'link-row';
      div.innerHTML = `<input class="link-label" value="${(l.label||'')}" /><input class="link-url" value="${(l.url||'')}" />`;
      linksArea.appendChild(div);
    });
  }
  editingDocId = t.id;
  if(deleteTemaBtn) deleteTemaBtn.classList.remove('hidden');
}

if(deleteTemaBtn) deleteTemaBtn.addEventListener('click', async () => {
  if(!editingDocId) return;
  if(!confirm('Eliminar tema permanentemente?')) return;
  try {
    await db.collection('temas').doc(editingDocId).delete();
    alert('Tema eliminado');
    resetForm();
  } catch(e){ alert('Error: ' + e.message); }
});

function resetForm(){
  if(temaForm) temaForm.reset();
  if(linksArea) linksArea.innerHTML = `<div class="link-row"><input class="link-label" placeholder="Etiqueta" /><input class="link-url" placeholder="https://..." /></div>`;
  editingDocId = null;
  if(deleteTemaBtn) deleteTemaBtn.classList.add('hidden');
  if(adminModal) adminModal.classList.add('hidden');
}

// --- Social links admin handlers ---
async function saveSocialLinksObject(obj){
  try {
    await socialDocRef.set(obj, { merge: true });
    alert('Enlace(s) guardado(s)');
  } catch(e){
    alert('Error guardando enlace(s): ' + e.message);
  }
}

if(saveWhatsappBtn) saveWhatsappBtn.addEventListener('click', ()=> saveSocialLinksObject({ whatsapp: inputWhatsapp.value.trim() }));
if(saveTiktokBtn) saveTiktokBtn.addEventListener('click', ()=> saveSocialLinksObject({ tiktok: inputTiktok.value.trim() }));
if(saveInstagramBtn) saveInstagramBtn.addEventListener('click', ()=> saveSocialLinksObject({ instagram: inputInstagram.value.trim() }));
if(saveTelegramBtn) saveTelegramBtn.addEventListener('click', ()=> saveSocialLinksObject({ telegram: inputTelegram.value.trim() }));

if(clearWhatsappBtn) clearWhatsappBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de WhatsApp?')) return;
  try {
    await socialDocRef.update({ whatsapp: firebase.firestore.FieldValue.delete() });
    if(inputWhatsapp) inputWhatsapp.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
if(clearTiktokBtn) clearTiktokBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de TikTok?')) return;
  try {
    await socialDocRef.update({ tiktok: firebase.firestore.FieldValue.delete() });
    if(inputTiktok) inputTiktok.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
if(clearInstagramBtn) clearInstagramBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de Instagram?')) return;
  try {
    await socialDocRef.update({ instagram: firebase.firestore.FieldValue.delete() });
    if(inputInstagram) inputInstagram.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
if(clearTelegramBtn) clearTelegramBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de Telegram?')) return;
  try {
    await socialDocRef.update({ telegram: firebase.firestore.FieldValue.delete() });
    if(inputTelegram) inputTelegram.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});

// --- Export backup ---
if(exportBackupBtn) exportBackupBtn.addEventListener('click', async ()=> {
  try {
    const snap = await db.collection('temas').get();
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'temas-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e){ alert('Error exportando: ' + e.message); }
});

// --- Auth state observer (persistencia UI) ---
auth.onAuthStateChanged(user => {
  if(user){
    currentUserUid = user.uid;
    if(adminPanel) adminPanel.classList.remove('hidden');
    const authDiv = document.getElementById('admin-auth');
    if(authDiv) authDiv.classList.add('hidden');
  } else {
    currentUserUid = null;
    if(adminPanel) adminPanel.classList.add('hidden');
    const authDiv = document.getElementById('admin-auth');
    if(authDiv) authDiv.classList.remove('hidden');
  }
});

// --- Countdown ---
function updateCountdown(){
  const end = new Date('2026-09-22T00:00:00Z').getTime();
  const now = Date.now();
  let diff = end - now;
  if(!document.getElementById('countdown')) return;
  if(diff < 0){ document.getElementById('countdown').textContent = 'Evento ya ocurrió'; return; }
  const days = Math.floor(diff / (24*3600*1000));
  diff -= days*(24*3600*1000);
  const hours = Math.floor(diff / (3600*1000));
  diff -= hours*(3600*1000);
  const minutes = Math.floor(diff / (60*1000));
  diff -= minutes*(60*1000);
  const seconds = Math.floor(diff/1000);
  document.getElementById('countdown').textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
setInterval(updateCountdown, 1000);
updateCountdown();
