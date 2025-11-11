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

let editingDocId = null;
let currentFilterSpecialty = 'Todos';
let allTopics = [];
let currentUserUid = null;

// Firestore ref for social links (single doc 'config' in collection 'social_links')
const socialDocRef = db.collection('social_links').doc('config');

// --- Logo modo claro/oscuro ---
function updateLogoForScheme(){
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  logoImg.src = dark ? 'logo-dark.png' : 'logo-light.png';
}
updateLogoForScheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateLogoForScheme);

// --- Sidebar toggle ---
logoArea.addEventListener('click', () => sidebar.classList.toggle('closed'));

// --- Menú ---
menuItems.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilterSpecialty = btn.dataset.specialty;
    menuItems.forEach(m=>m.classList.remove('active'));
    btn.classList.add('active');
    renderTopics();
  });
});

// --- Búsqueda ---
searchInput.addEventListener('input', renderTopics);

// --- Firestore realtime: temas ---
db.collection('temas').orderBy('title').onSnapshot(snapshot => {
  allTopics = [];
  snapshot.forEach(doc => allTopics.push({ id: doc.id, ...doc.data() }));
  renderTopics();
});

// --- Firestore realtime: social links (to keep icons updated live) ---
socialDocRef.onSnapshot(doc => {
  const data = doc.exists ? doc.data() : {};
  // default blank if not set
  const whatsapp = data.whatsapp || '';
  const tiktok = data.tiktok || '';
  const instagram = data.instagram || '';
  const telegram = data.telegram || '';

  // update anchors: if empty, keep href="#" and opacity lower
  updateSocialAnchor(socialWhatsappA, whatsapp);
  updateSocialAnchor(socialTiktokA, tiktok);
  updateSocialAnchor(socialInstagramA, instagram);
  updateSocialAnchor(socialTelegramA, telegram);

  // If admin panel visible, populate inputs
  if(currentUserUid){
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
  const q = searchInput.value.trim().toLowerCase();
  topicsContainer.innerHTML = '';

  const filtered = allTopics.filter(t => {
    // si filtro por "Todos", EXCLUIR los de "Acceso gratuito limitado"
    if(currentFilterSpecialty === 'Todos'){
      if(t.specialty === 'Acceso gratuito limitado') return false;
      // else allow any specialty
      const matchesQuery = q === '' || (t.title && t.title.toLowerCase().includes(q));
      return matchesQuery;
    } else {
      // filtro por otra especialidad (incluye Acceso gratuito limitado)
      const matchesSpecialty = t.specialty === currentFilterSpecialty;
      const matchesQuery = q === '' || (t.title && t.title.toLowerCase().includes(q));
      return matchesSpecialty && matchesQuery;
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

// --- Admin modal ---
adminBtn.addEventListener('click', ()=> {
  adminModal.classList.remove('hidden');
  adminModal.setAttribute('aria-hidden','false');
});
closeModalBtn.addEventListener('click', ()=> {
  adminModal.classList.add('hidden');
  adminModal.setAttribute('aria-hidden','true');
});

// --- Login Admin ---
adminLoginBtn.addEventListener('click', async () => {
  const email = adminEmailInput.value.trim();
  const pass = adminPassInput.value;
  if(!email || !pass){ adminStatus.textContent = 'Ingresa email y contraseña'; return; }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    currentUserUid = cred.user.uid;
    adminStatus.textContent = 'Autenticado ✅';
    adminPanel.classList.remove('hidden');
    document.getElementById('admin-auth').classList.add('hidden');

    // populate social inputs after login: fetch once (onSnapshot already populates, but ensure inputs visible)
    const doc = await socialDocRef.get();
    const data = doc.exists ? doc.data() : {};
    inputWhatsapp.value = data.whatsapp || '';
    inputTiktok.value = data.tiktok || '';
    inputInstagram.value = data.instagram || '';
    inputTelegram.value = data.telegram || '';
  } catch(e){ adminStatus.textContent = 'Error: ' + e.message; }
});

logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  currentUserUid = null;
  adminPanel.classList.add('hidden');
  document.getElementById('admin-auth').classList.remove('hidden');
  adminModal.classList.add('hidden');
});

// --- Formulario de tema ---
addLinkBtn.addEventListener('click', ()=> {
  const div = document.createElement('div');
  div.className = 'link-row';
  div.innerHTML = `<input class="link-label" placeholder="Etiqueta" /><input class="link-url" placeholder="https://..." />`;
  linksArea.appendChild(div);
});

temaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!currentUserUid){ alert('Debes iniciar sesión'); return; }
  const title = temaTitle.value.trim();
  const specialty = temaSpecialty.value;
  const links = [];
  document.querySelectorAll('#links-area .link-row').forEach(r=>{
    const label = r.querySelector('.link-label').value.trim();
    const url = r.querySelector('.link-url').value.trim();
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
  adminModal.classList.remove('hidden');
  adminModal.setAttribute('aria-hidden','false');
  adminPanel.classList.remove('hidden');
  document.getElementById('admin-auth').classList.add('hidden');
  temaTitle.value = t.title || '';
  temaSpecialty.value = t.specialty || '';
  linksArea.innerHTML = '';
  (t.links || []).forEach(l=>{
    const div = document.createElement('div');
    div.className = 'link-row';
    div.innerHTML = `<input class="link-label" value="${l.label||''}" /><input class="link-url" value="${l.url||''}" />`;
    linksArea.appendChild(div);
  });
  editingDocId = t.id;
  deleteTemaBtn.classList.remove('hidden');
}

deleteTemaBtn.addEventListener('click', async () => {
  if(!editingDocId) return;
  if(!confirm('Eliminar tema permanentemente?')) return;
  try {
    await db.collection('temas').doc(editingDocId).delete();
    alert('Tema eliminado');
    resetForm();
  } catch(e){ alert('Error: ' + e.message); }
});

function resetForm(){
  temaForm.reset();
  linksArea.innerHTML = `<div class="link-row"><input class="link-label" placeholder="Etiqueta" /><input class="link-url" placeholder="https://..." /></div>`;
  editingDocId = null;
  deleteTemaBtn.classList.add('hidden');
  adminModal.classList.add('hidden');
}

// --- Social links admin handlers ---
// Helper: save object merge to social doc
async function saveSocialLinksObject(obj){
  try {
    await socialDocRef.set(obj, { merge: true });
    alert('Enlace(s) guardado(s)');
  } catch(e){
    alert('Error guardando enlace(s): ' + e.message);
  }
}

// Individual save buttons
saveWhatsappBtn.addEventListener('click', ()=> {
  const v = inputWhatsapp.value.trim();
  saveSocialLinksObject({ whatsapp: v });
});
saveTiktokBtn.addEventListener('click', ()=> {
  const v = inputTiktok.value.trim();
  saveSocialLinksObject({ tiktok: v });
});
saveInstagramBtn.addEventListener('click', ()=> {
  const v = inputInstagram.value.trim();
  saveSocialLinksObject({ instagram: v });
});
saveTelegramBtn.addEventListener('click', ()=> {
  const v = inputTelegram.value.trim();
  saveSocialLinksObject({ telegram: v });
});

// Clear / delete individual links (set to empty string)
clearWhatsappBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de WhatsApp?')) return;
  try {
    await socialDocRef.update({ whatsapp: firebase.firestore.FieldValue.delete() });
    inputWhatsapp.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
clearTiktokBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de TikTok?')) return;
  try {
    await socialDocRef.update({ tiktok: firebase.firestore.FieldValue.delete() });
    inputTiktok.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
clearInstagramBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de Instagram?')) return;
  try {
    await socialDocRef.update({ instagram: firebase.firestore.FieldValue.delete() });
    inputInstagram.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});
clearTelegramBtn.addEventListener('click', async ()=> {
  if(!confirm('Eliminar enlace de Telegram?')) return;
  try {
    await socialDocRef.update({ telegram: firebase.firestore.FieldValue.delete() });
    inputTelegram.value = '';
    alert('Enlace eliminado');
  } catch(e){ alert('Error: ' + e.message); }
});

// --- Export backup (existing button) ---
exportBackupBtn.addEventListener('click', async ()=> {
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

// --- Countdown ---
function updateCountdown(){
  const end = new Date('2026-09-22T00:00:00Z').getTime();
  const now = Date.now();
  let diff = end - now;
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
