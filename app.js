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

// Social
const socialWhatsappA = document.getElementById('social-whatsapp');
const socialTiktokA = document.getElementById('social-tiktok');
const socialInstagramA = document.getElementById('social-instagram');
const socialTelegramA = document.getElementById('social-telegram');

// Social admin inputs
const inputWhatsapp = document.getElementById('input-whatsapp');
const inputTiktok = document.getElementById('input-tiktok');
const inputInstagram = document.getElementById('input-instagram');
const inputTelegram = document.getElementById('input-telegram');

// Panel admin edits
const saveWhatsappBtn = document.getElementById('save-whatsapp');
const saveTiktokBtn = document.getElementById('save-tiktok');
const saveInstagramBtn = document.getElementById('save-instagram');
const saveTelegramBtn = document.getElementById('save-telegram');
const clearWhatsappBtn = document.getElementById('clear-whatsapp');
const clearTiktokBtn = document.getElementById('clear-tiktok');
const clearInstagramBtn = document.getElementById('clear-instagram');
const clearTelegramBtn = document.getElementById('clear-telegram');

// Nueva sección: últimas modificaciones
const recentChangesList = document.createElement('div');
recentChangesList.id = "recent-changes";
recentChangesList.style.padding = "12px";
recentChangesList.style.fontSize = "13px";
recentChangesList.style.color = "var(--muted)";

// Insertar (si existe social-icons). Si no existe, añadir al final del sidebar.
const socialIcons = document.getElementById('social-icons');
if (socialIcons && socialIcons.parentNode) {
  // Insert AFTER socialIcons so social icons are above recent changes
  socialIcons.parentNode.insertBefore(recentChangesList, socialIcons.nextSibling);
} else if (sidebar) {
  sidebar.appendChild(recentChangesList);
}

// Mobile
const menuBtn = document.getElementById('menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const logoImgMobile = document.getElementById('logo-img-mobile');

// Variables globales
let editingDocId = null;
let currentFilterSpecialty = "Acceso gratuito limitado";
let allTopics = [];
let currentUserUid = null;

// Firestore Refs
const socialDocRef = db.collection('social_links').doc('config');
const changesRef = db.collection('changes');

// ---------- Helpers ----------
function safeGetValue(id){
  const el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}
function timeAgo(d){
  if(!d) return '';
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff/1000);
  if(s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h`;
  const days = Math.floor(h/24);
  return `${days}d`;
}

// --- MODO OSCURO / CLARO ---
function updateLogoForScheme(){
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const desktopLogo = document.getElementById('logo-img');
  const mobileLogo = document.getElementById('logo-img-mobile');
  if(desktopLogo) desktopLogo.src = dark ? 'logo-dark.png' : 'logo-light.png';
  if(mobileLogo)  mobileLogo.src  = dark ? 'logo-dark.png' : 'logo-light.png';
}
updateLogoForScheme();
if(window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateLogoForScheme);
}

// --- SIDEBAR DESKTOP ---
logoArea?.addEventListener('click', ()=> {
  sidebar.classList.toggle('closed');
});

// --- MOBILE DRAWER ---
function openMobileDrawer(){
  sidebar.classList.add('open-mobile');
  mobileOverlay?.classList.remove('hidden');
  document.body.style.overflow = "hidden";
}
function closeMobileDrawer(){
  sidebar.classList.remove('open-mobile');
  mobileOverlay?.classList.add('hidden');
  document.body.style.overflow = "";
}

menuBtn?.addEventListener('click', openMobileDrawer);
mobileOverlay?.addEventListener('click', closeMobileDrawer);

document.addEventListener('keydown', (e)=>{
  if(e.key === "Escape" && sidebar.classList.contains('open-mobile')){
    closeMobileDrawer();
  }
});

logoImgMobile?.addEventListener('click', ()=>{
  if(window.innerWidth <= 900){
    openMobileDrawer();
  }
});

// --- MENÚ ---
menuItems.forEach(btn => {
  btn.addEventListener('click', ()=>{
    currentFilterSpecialty = btn.dataset.specialty;
    menuItems.forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    renderTopics();

    if(window.innerWidth <= 900){
      setTimeout(closeMobileDrawer, 180);
    }
  });
});

// --- BÚSQUEDA ---
searchInput?.addEventListener('input', renderTopics);

// --- REALTIME TEMAS ---
db.collection('temas')
  .orderBy('title')
  .onSnapshot(snapshot => {
    allTopics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // ensure alphabetical order defensively
    allTopics.sort((a,b)=> (a.title||'').localeCompare(b.title||'', 'es', {sensitivity:'base'}));
    renderTopics();
    updateCounters();
  }, err => console.error("Error temas realtime:", err));

// --- LISTEN SOCIAL LINKS ---
socialDocRef.onSnapshot(doc => {
  const data = doc.exists ? doc.data() : {};

  updateSocialAnchor(socialWhatsappA, data.whatsapp);
  updateSocialAnchor(socialTiktokA, data.tiktok);
  updateSocialAnchor(socialInstagramA, data.instagram);
  updateSocialAnchor(socialTelegramA, data.telegram);

  if(currentUserUid){
    if(inputWhatsapp) inputWhatsapp.value = data.whatsapp || "";
    if(inputTiktok) inputTiktok.value = data.tiktok || "";
    if(inputInstagram) inputInstagram.value = data.instagram || "";
    if(inputTelegram) inputTelegram.value = data.telegram || "";
  }
});

function updateSocialAnchor(aEl, url){
  if(!aEl) return;
  if(url){
    aEl.href = url;
    aEl.style.opacity = "1";
    aEl.style.pointerEvents = "auto";
  } else {
    aEl.href = "#";
    aEl.style.opacity = "0.5";
    aEl.style.pointerEvents = "none";
  }
}

// --- LISTEN LAST 3 CHANGES ---
changesRef
  .orderBy("timestamp", "desc")
  .limit(3)
  .onSnapshot(snapshot => {
    let html = "<strong>Últimos cambios:</strong><br />";
    if(snapshot.empty){
      html += "<span>No hay cambios aún</span>";
    } else {
      snapshot.forEach(doc => {
        const c = doc.data();
        const ts = c.timestamp?.toDate ? c.timestamp.toDate() : new Date();
        const fecha = ts.toLocaleDateString("es-MX");
        const hora  = ts.toLocaleTimeString("es-MX",{hour:"2-digit", minute:"2-digit"});
        html += `• ${c.action} — ${fecha} ${hora}<br/>`;
      });
    }
    recentChangesList.innerHTML = html;
  });

// --- RENDER TOPICS ---
function renderTopics(){
  if(!topicsContainer) return;
  const q = (searchInput?.value || '').trim().toLowerCase();
  topicsContainer.innerHTML = "";

  const filtered = allTopics.filter(t => {
    const titleLower = (t.title || '').toLowerCase();
    if(currentFilterSpecialty === "Todos"){
      if(t.specialty === "Acceso gratuito limitado") return false;
      return !q || titleLower.includes(q) || (t.specialty || '').toLowerCase().includes(q);
    }
    return (t.specialty || '') === currentFilterSpecialty &&
          (!q || titleLower.includes(q));
  });

  if(filtered.length === 0){
    topicsContainer.innerHTML = "<p>No hay resultados</p>";
    return;
  }

  filtered.forEach(t => {
    const card = document.createElement("article");
    card.className = "topic";

    card.innerHTML = `
      <div class="specialty">${escapeHtml(t.specialty || '')}</div>
      <h4>${escapeHtml(t.title || '')}</h4>
      <div class="links"></div>
    `;

    const linksDiv = card.querySelector(".links");

    if(Array.isArray(t.links)){
      t.links.forEach(l => {
        if(l && l.url){
          const a = document.createElement("a");
          a.className = "link-btn";
          a.textContent = l.label || "Abrir";
          a.href = l.url;
          a.target = "_blank";
          linksDiv.appendChild(a);
        }
      });
    }

    if(currentUserUid){
      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", ()=> openEditorWithTopic(t));
      linksDiv.appendChild(editBtn);
    }

    topicsContainer.appendChild(card);
  });
}

// safe escapeHtml (small util)
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

// --- CONTADORES ---
function updateCounters(){
  const counts = {
    "Acceso gratuito limitado": 0,
    "Todos": 0,
    "Cirugía General": 0,
    "Pediatría": 0,
    "Ginecología y Obstetricia": 0,
    "Medicina Interna": 0
  };

  allTopics.forEach(t => {
    if(t.specialty in counts){
      counts[t.specialty]++;
    }
    if(t.specialty !== "Acceso gratuito limitado"){
      counts["Todos"]++;
    }
  });

  menuItems.forEach(btn => {
    const sp = btn.dataset.specialty;
    if(sp in counts){
      // preserve structure: label + count span if exists
      const countSpan = btn.querySelector('.count');
      if(countSpan) {
        countSpan.textContent = `(${counts[sp]})`;
      } else {
        btn.textContent = `${sp} (${counts[sp]})`;
      }
    }
  });
}

// --- ADMIN MODAL (open/close) ---
adminBtn?.addEventListener("click", ()=>{
  if(!adminModal) return;
  adminModal.classList.remove("hidden");
  adminModal.setAttribute("aria-hidden","false");

  // If user is already authenticated, show panel; otherwise show auth form
  if(currentUserUid){
    if(adminPanel) adminPanel.classList.remove("hidden");
    const authDiv = document.getElementById("admin-auth");
    if(authDiv) authDiv.classList.add("hidden");
  } else {
    if(adminPanel) adminPanel.classList.add("hidden");
    const authDiv = document.getElementById("admin-auth");
    if(authDiv) authDiv.classList.remove("hidden");
  }
});

closeModalBtn?.addEventListener("click", ()=>{
  if(!adminModal) return;
  adminModal.classList.add("hidden");
  adminModal.setAttribute("aria-hidden","true");
});

// --- LOGIN ADMIN ---
adminLoginBtn?.addEventListener("click", async ()=>{
  const email = (adminEmailInput?.value || '').trim();
  const pass  = (adminPassInput?.value || '');

  if(!email || !pass){
    if(adminStatus) adminStatus.textContent = "Ingresa email y contraseña";
    return;
  }

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    currentUserUid = cred.user.uid;

    if(adminStatus) adminStatus.textContent = "Autenticado ✓";
    if(adminPanel) adminPanel.classList.remove("hidden");
    const authDiv = document.getElementById("admin-auth");
    if(authDiv) authDiv.classList.add("hidden");

    // populate social inputs after login
    try {
      const docSnap = await socialDocRef.get();
      const data = docSnap.exists ? docSnap.data() : {};
      if(inputWhatsapp) inputWhatsapp.value = data.whatsapp || "";
      if(inputTiktok) inputTiktok.value = data.tiktok || "";
      if(inputInstagram) inputInstagram.value = data.instagram || "";
      if(inputTelegram) inputTelegram.value = data.telegram || "";
    } catch(e){
      console.warn('No se pudo leer social config tras login', e);
    }

    // re-render so edit buttons appear
    renderTopics();

  } catch(e){
    if(adminStatus) adminStatus.textContent = "Error: " + e.message;
  }
});

// --- LOGOUT ---
logoutBtn?.addEventListener("click", async ()=>{
  try {
    await auth.signOut();
  } catch(e){ console.error('Sign out err', e); }

  currentUserUid = null;
  if(adminPanel) adminPanel.classList.add("hidden");
  const authDiv = document.getElementById("admin-auth");
  if(authDiv) authDiv.classList.remove("hidden");

  // close modal to avoid leaving admin UI visible
  if(adminModal) adminModal.classList.add("hidden");

  // re-render to hide edit buttons
  renderTopics();
});

// --- AGREGAR MÁS ENLACES (botón “Agregar enlace”) ---
if(addLinkBtn && linksArea){
  addLinkBtn.addEventListener("click", ()=> {
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <input class="link-label" placeholder="Etiqueta" />
      <input class="link-url" placeholder="https://..." />
    `;
    linksArea.appendChild(row);
  });
}

// --- GUARDAR / EDITAR TEMAS ---
temaForm?.addEventListener("submit", async e => {
  e.preventDefault();

  if(!currentUserUid){
    alert("Debes iniciar sesión");
    return;
  }

  // read optional per-tema social inputs only if exist (defensivo)
  const social = {
    whatsapp: safeGetValue("tema-social-whatsapp"),
    tiktok:   safeGetValue("tema-social-tiktok"),
    instagram:safeGetValue("tema-social-instagram"),
    telegram: safeGetValue("tema-social-telegram")
  };

  const title = (temaTitle?.value || '').trim();
  const specialty = (temaSpecialty?.value || '');
  const links = [];

  document.querySelectorAll("#links-area .link-row").forEach(r => {
    const labEl = r.querySelector(".link-label");
    const urlEl = r.querySelector(".link-url");
    const label = labEl ? (labEl.value || '').trim() : '';
    const url   = urlEl ? (urlEl.value || '').trim() : '';
    if(url){
      links.push({ label: label || "Abrir", url });
    }
  });

  if(!title || !specialty || links.length === 0){
    alert("Completa todos los campos");
    return;
  }

  try {
    if(editingDocId){
      // update single time (no duplicates)
      await db.collection("temas").doc(editingDocId).update({
        title, specialty, links, social
      });

      await changesRef.add({
        action: `Editado: ${title}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Tema actualizado");
    } else {
      await db.collection("temas").add({
        title, specialty, links, social,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await changesRef.add({
        action: `Agregado: ${title}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Tema agregado");
    }

    resetForm();

  } catch(e){
    alert("Error: " + e.message);
  }
});

// --- EDITAR EXISTENTE ---
function openEditorWithTopic(t){
  if(!adminModal) return;
  adminModal.classList.remove("hidden");
  adminModal.setAttribute("aria-hidden","false");

  if(adminPanel) adminPanel.classList.remove("hidden");
  const authDiv = document.getElementById("admin-auth");
  if(authDiv) authDiv.classList.add("hidden");

  temaTitle.value = t.title || '';
  temaSpecialty.value = t.specialty || '';

  // If tema social inputs exist, populate them defensively
  const tsw = document.getElementById("tema-social-whatsapp");
  const tst = document.getElementById("tema-social-tiktok");
  const tsi = document.getElementById("tema-social-instagram");
  const tte = document.getElementById("tema-social-telegram");
  if(tsw) tsw.value = t.social?.whatsapp || "";
  if(tst) tst.value = t.social?.tiktok   || "";
  if(tsi) tsi.value = t.social?.instagram|| "";
  if(tte) tte.value = t.social?.telegram || "";

  // render links
  if(linksArea) {
    linksArea.innerHTML = "";
    (t.links || []).forEach(l => {
      const row = document.createElement("div");
      row.className = "link-row";
      row.innerHTML = `
        <input class="link-label" value="${escapeHtml(l.label || '')}" />
        <input class="link-url" value="${escapeHtml(l.url || '')}" />
      `;
      linksArea.appendChild(row);
    });
  }

  editingDocId = t.id;
  if(deleteTemaBtn) deleteTemaBtn.classList.remove("hidden");
}

// --- ELIMINAR TEMA ---
deleteTemaBtn?.addEventListener("click", async ()=>{
  if(!editingDocId) return;

  if(!confirm("¿Eliminar tema permanentemente?")) return;

  try {
    const deletedTitle = (temaTitle?.value || '').trim();

    await db.collection("temas").doc(editingDocId).delete();

    // Registrar eliminación
    await changesRef.add({
      action: `Eliminado: ${deletedTitle}`,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Tema eliminado");
    resetForm();

  } catch(e){
    alert("Error: " + e.message);
  }
});

// --- RESETEAR FORM ---
function resetForm(){
  if(temaForm) temaForm.reset();
  if(linksArea) linksArea.innerHTML = `
    <div class="link-row">
      <input class="link-label" placeholder="Etiqueta" />
      <input class="link-url" placeholder="https://..." />
    </div>
  `;
  editingDocId = null;
  if(deleteTemaBtn) deleteTemaBtn.classList.add("hidden");
  if(adminModal) adminModal.classList.add("hidden");

  // re-render topics to reflect changes
  renderTopics();
}

// --- GUARDAR LINKS SOCIALES desde panel admin ---
async function saveSocialLinks(obj){
  try {
    await socialDocRef.set(obj, { merge: true });

    const key = Object.keys(obj)[0];
    const val = obj[key];

    await changesRef.add({
      action: `Link actualizado: ${key} → ${val || "(vacío)"}`,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Guardado");

  } catch(e){
    alert("Error: " + e.message);
  }
}

saveWhatsappBtn?.addEventListener("click", ()=> saveSocialLinks({ whatsapp:  inputWhatsapp.value.trim() }));
saveTiktokBtn?.addEventListener("click",   ()=> saveSocialLinks({ tiktok:    inputTiktok.value.trim() }));
saveInstagramBtn?.addEventListener("click",()=> saveSocialLinks({ instagram: inputInstagram.value.trim() }));
saveTelegramBtn?.addEventListener("click", ()=> saveSocialLinks({ telegram:  inputTelegram.value.trim() }));

// --- BORRAR LINKS SOCIALES ---
async function deleteSocialField(field, input){
  try {
    await socialDocRef.update({ [field]: firebase.firestore.FieldValue.delete() });

    await changesRef.add({
      action: `Link eliminado: ${field}`,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    if(input) input.value = "";
    alert("Eliminado");
  } catch(e){
    alert("Error: " + e.message);
  }
}

clearWhatsappBtn?.addEventListener("click", ()=> deleteSocialField("whatsapp",  inputWhatsapp));
clearTiktokBtn?.addEventListener("click",   ()=> deleteSocialField("tiktok",    inputTiktok));
clearInstagramBtn?.addEventListener("click",()=> deleteSocialField("instagram", inputInstagram));
clearTelegramBtn?.addEventListener("click", ()=> deleteSocialField("telegram",  inputTelegram));

// --- AUTH OBSERVER ---
// NOTE: we no longer auto-show the admin panel on auth change to avoid "entering admin mode" unexpectedly.
// We keep currentUserUid updated and re-render topics (so edit buttons appear when user is signed in).
auth.onAuthStateChanged(user=>{
  if(user){
    currentUserUid = user.uid;
  } else {
    currentUserUid = null;
  }

  // keep admin modal hidden by default; open it only via admin button or openEditorWithTopic
  if(adminModal) {
    adminModal.classList.add('hidden');
    adminModal.setAttribute('aria-hidden','true');
  }

  // re-render topics so edit buttons appear/disappear
  renderTopics();
});

// --- COUNTDOWN ---
function updateCountdown(){
  const end = new Date("2026-09-22T00:00:00Z").getTime();
  const now = Date.now();

  const cd = document.getElementById("countdown");
  if(!cd) return;

  let diff = end - now;
  if(diff < 0){
    cd.textContent = "Evento ya ocurrió";
    return;
  }

  const days = Math.floor(diff / (86400000));
  diff -= days * 86400000;

  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;

  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;

  const seconds = Math.floor(diff / 1000);

  cd.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

setInterval(updateCountdown, 1000);
updateCountdown();
