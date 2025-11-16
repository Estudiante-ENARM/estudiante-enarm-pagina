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

// Insertar encima de iconos sociales
const socialIcons = document.getElementById('social-icons');
socialIcons.parentNode.insertBefore(recentChangesList, socialIcons.nextSibling);

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

// --- MODO OSCURO / CLARO ---
function updateLogoForScheme(){
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const desktopLogo = document.getElementById('logo-img');
  const mobileLogo = document.getElementById('logo-img-mobile');
  if(desktopLogo) desktopLogo.src = dark ? 'logo-dark.png' : 'logo-light.png';
  if(mobileLogo)  mobileLogo.src  = dark ? 'logo-dark.png' : 'logo-light.png';
}
updateLogoForScheme();
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', updateLogoForScheme);

// --- SIDEBAR DESKTOP ---
logoArea?.addEventListener('click', ()=> {
  sidebar.classList.toggle('closed');
});

// --- MOBILE DRAWER ---
function openMobileDrawer(){
  sidebar.classList.add('open-mobile');
  mobileOverlay.classList.remove('hidden');
  document.body.style.overflow = "hidden";
}
function closeMobileDrawer(){
  sidebar.classList.remove('open-mobile');
  mobileOverlay.classList.add('hidden');
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
searchInput.addEventListener('input', renderTopics);

// --- REALTIME TEMAS ---
db.collection('temas')
  .orderBy('title')
  .onSnapshot(snapshot => {
    allTopics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
    inputWhatsapp.value  = data.whatsapp  || "";
    inputTiktok.value    = data.tiktok    || "";
    inputInstagram.value = data.instagram || "";
    inputTelegram.value  = data.telegram  || "";
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
  const q = searchInput.value.trim().toLowerCase();
  topicsContainer.innerHTML = "";

  const filtered = allTopics.filter(t => {
    if(currentFilterSpecialty === "Todos"){
      if(t.specialty === "Acceso gratuito limitado") return false;
      return !q || t.title.toLowerCase().includes(q);
    }
    return t.specialty === currentFilterSpecialty &&
          (!q || t.title.toLowerCase().includes(q));
  });

  if(filtered.length === 0){
    topicsContainer.innerHTML = "<p>No hay resultados</p>";
    return;
  }

  filtered.forEach(t => {
    const card = document.createElement("article");
    card.className = "topic";

    card.innerHTML = `
      <div class="specialty">${t.specialty}</div>
      <h4>${t.title}</h4>
      <div class="links"></div>
    `;

    const linksDiv = card.querySelector(".links");

    if(Array.isArray(t.links)){
      t.links.forEach(l => {
        if(l?.url){
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
      btn.textContent = `${sp} (${counts[sp]})`;
    }
  });
}


// --- ADMIN MODAL ---
adminBtn.addEventListener("click", ()=>{
  adminModal.classList.remove("hidden");
  adminModal.setAttribute("aria-hidden","false");
});

closeModalBtn.addEventListener("click", ()=>{
  adminModal.classList.add("hidden");
  adminModal.setAttribute("aria-hidden","true");
});


// --- LOGIN ADMIN ---
adminLoginBtn.addEventListener("click", async ()=>{
  const email = adminEmailInput.value.trim();
  const pass  = adminPassInput.value;

  if(!email || !pass){
    adminStatus.textContent = "Ingresa email y contraseña";
    return;
  }

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    currentUserUid = cred.user.uid;

    adminStatus.textContent = "Autenticado ✓";
    adminPanel.classList.remove("hidden");
    document.getElementById("admin-auth").classList.add("hidden");

  } catch(e){
    adminStatus.textContent = "Error: " + e.message;
  }
});


// --- LOGOUT ---
logoutBtn.addEventListener("click", async ()=>{
  await auth.signOut();

  currentUserUid = null;
  adminPanel.classList.add("hidden");
  document.getElementById("admin-auth").classList.remove("hidden");

  adminModal.classList.add("hidden");
});


// --- AQUI VIENE LA REPARACIÓN QUE PEDISTE ---
// --- AGREGAR MÁS ENLACES (BOTÓN “Agregar enlace”) ---
addLinkBtn.addEventListener("click", ()=> {
  const row = document.createElement("div");
  row.className = "link-row";

  row.innerHTML = `
    <input class="link-label" placeholder="Etiqueta" />
    <input class="link-url" placeholder="https://..." />
  `;

  linksArea.appendChild(row);
});
// --- GUARDAR / EDITAR TEMAS ---
temaForm.addEventListener("submit", async e => {
  e.preventDefault();

  if(!currentUserUid){
    alert("Debes iniciar sesión");
    return;
  }

const social = {
  whatsapp: document.getElementById("tema-social-whatsapp").value.trim(),
  tiktok: document.getElementById("tema-social-tiktok").value.trim(),
  instagram: document.getElementById("tema-social-instagram").value.trim(),
  telegram: document.getElementById("tema-social-telegram").value.trim()
};

  const title = temaTitle.value.trim();
  const specialty = temaSpecialty.value;
  const links = [];

  document.querySelectorAll("#links-area .link-row").forEach(r => {
    const label = r.querySelector(".link-label").value.trim();
    const url   = r.querySelector(".link-url").value.trim();
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
  await db.collection("temas").doc(editingDocId).update({
    title, specialty, links, social
  });
  await changesRef.add({
    action: `Editado: ${title}`,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
} else {
  await db.collection("temas").add({
    title, specialty, links, social,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await changesRef.add({
    action: `Agregado: ${title}`,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

    if(editingDocId){
      await db.collection("temas").doc(editingDocId).update({
        title, specialty, links
      });

      // Registrar modificación
      await changesRef.add({
        action: `Editado: ${title}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Tema actualizado");
    } else {
      const docRef = await db.collection("temas").add({
        title, specialty, links,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Registrar nuevo tema
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
  adminModal.classList.remove("hidden");
  adminModal.setAttribute("aria-hidden","false");

  adminPanel.classList.remove("hidden");
  document.getElementById("admin-auth").classList.add("hidden");

  temaTitle.value = t.title;
  temaSpecialty.value = t.specialty;

document.getElementById("tema-social-whatsapp").value = t.social?.whatsapp || "";
document.getElementById("tema-social-tiktok").value   = t.social?.tiktok || "";
document.getElementById("tema-social-instagram").value= t.social?.instagram || "";
document.getElementById("tema-social-telegram").value = t.social?.telegram || "";

  linksArea.innerHTML = "";
  (t.links || []).forEach(l => {
    const row = document.createElement("div");
    row.className = "link-row";

    row.innerHTML = `
      <input class="link-label" value="${l.label || ""}" />
      <input class="link-url" value="${l.url   || ""}" />
    `;

    linksArea.appendChild(row);
  });

  editingDocId = t.id;
  deleteTemaBtn.classList.remove("hidden");
}


// --- ELIMINAR TEMA ---
deleteTemaBtn.addEventListener("click", async ()=>{
  if(!editingDocId) return;

  if(!confirm("¿Eliminar tema permanentemente?")) return;

  try {
    const deletedTitle = temaTitle.value.trim();

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
  temaForm.reset();
  linksArea.innerHTML = `
    <div class="link-row">
      <input class="link-label" placeholder="Etiqueta" />
      <input class="link-url" placeholder="https://..." />
    </div>
  `;
  editingDocId = null;
  deleteTemaBtn.classList.add("hidden");
  adminModal.classList.add("hidden");
}


// --- GUARDAR LINKS SOCIALES ---
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

    input.value = "";
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
auth.onAuthStateChanged(user=>{
  if(user){
    currentUserUid = user.uid;
    adminPanel.classList.remove("hidden");
    document.getElementById("admin-auth").classList.add("hidden");
  } else {
    currentUserUid = null;
    adminPanel.classList.add("hidden");
    document.getElementById("admin-auth").classList.remove("hidden");
  }
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
