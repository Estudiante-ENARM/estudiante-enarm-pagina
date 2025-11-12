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

let editingDocId = null;
let currentFilterSpecialty = 'Todos';
let allTopics = [];
let currentUserUid = null;

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

// --- Firestore realtime ---
db.collection('temas').orderBy('title').onSnapshot(snapshot => {
  allTopics = [];
  snapshot.forEach(doc => allTopics.push({ id: doc.id, ...doc.data() }));
  renderTopics();
});

function renderTopics(){
  const q = searchInput.value.trim().toLowerCase();
  topicsContainer.innerHTML = '';
  const filtered = allTopics.filter(t => {
    let matchesSpecialty = false;
    if (currentFilterSpecialty === 'Acceso gratuito limitado') {
      matchesSpecialty = t.specialty === 'Acceso gratuito limitado';
    } else if (currentFilterSpecialty === 'Todos') {
      matchesSpecialty = t.specialty !== 'Acceso gratuito limitado';
    } else {
      matchesSpecialty = t.specialty === currentFilterSpecialty;
    }
    const matchesQuery = q === '' || t.title.toLowerCase().includes(q);
    return matchesSpecialty && matchesQuery;
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

// --- Iconos sociales ---
const socialIcons = {
  whatsapp: document.getElementById('icon-whatsapp'),
  tiktok: document.getElementById('icon-tiktok'),
  instagram: document.getElementById('icon-instagram'),
  telegram: document.getElementById('icon-telegram')
};

// Íconos del footer (mismos nombres de ID, pero con sufijo "-footer")
const footerSocialIcons = {
  whatsapp: document.getElementById('icon-whatsapp-footer'),
  tiktok: document.getElementById('icon-tiktok-footer'),
  instagram: document.getElementById('icon-instagram-footer'),
  telegram: document.getElementById('icon-telegram-footer')
};

// Cargar enlaces guardados localmente (localStorage)
const socialLinks = JSON.parse(localStorage.getItem('socialLinks') || '{}');

// Asignar comportamiento a íconos de la barra lateral y del footer
function setupSocialIconEvents(iconMap) {
  Object.entries(iconMap).forEach(([name, el]) => {
    if (!el) return;
    el.addEventListener('click', () => {
      if (currentUserUid) {
        const newLink = prompt(`Ingresa el link para ${name}:`, socialLinks[name] || '');
        if (newLink) {
          socialLinks[name] = newLink;
          localStorage.setItem('socialLinks', JSON.stringify(socialLinks));
          alert('Link actualizado correctamente');
        }
      } else {
        const url = socialLinks[name];
        if (url) {
          window.open(url, '_blank');
        } else {
          alert('El enlace aún no ha sido configurado por el administrador.');
        }
      }
    });
  });
}

setupSocialIconEvents(socialIcons);
setupSocialIconEvents(footerSocialIcons);
