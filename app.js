// Stap 1: Initialiseer Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
  apiKey: "AIzaSyB9KRUbVBknnDDkkWF2Z5nRskmY-9CkD24",
  authDomain: "vriezer-app.firebaseapp.com",
  projectId: "vriezer-app",
  storageBucket: "vriezer-app.firebasestorage.app",
  messagingSenderId: "788492326775",
  appId: "1:788492326775:web:c2cd85deac708b44f27372"
    };

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const itemsCollectieBasis = db.collection('items');
const ladesCollectieBasis = db.collection('lades');
const vriezersCollectieBasis = db.collection('vriezers');
const usersCollectie = db.collection('users');
const adminsCollectie = db.collection('admins');
const sharesCollectie = db.collection('shares');
const shoppingListCollectie = db.collection('shoppingList');
const weekMenuCollectie = db.collection('weekmenu');
const historyCollectie = db.collection('history'); 

// --- GLOBALE VARIABELEN ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let userUnits = []; 
const defaultUnits = ["stuks", "zak", "boterpot", "ijsdoos", "gram", "kilo", "bakje", "portie"];

// EMOJI MAPPING
const categoryEmojis = {
    "Vlees": "🥩", "Vis": "🐟", "Groenten": "🥦", "Fruit": "🍓",
    "IJs": "🍦", "Brood": "🍞", "Restjes": "🍲", "Saus": "🥫",
    "Ander": "📦", "Geen": "🧊"
};

// Listeners
let vriezersListener = null, ladesListener = null, itemsListener = null, userListListener = null;
let sharesOwnerListener = null, pendingSharesListener = null, acceptedSharesListener = null;
let shoppingListListener = null, weekMenuListener = null, historyListener = null;

let isAdmin = false, beheerdeUserId = null, eigenUserId = null;
let alleAcceptedShares = [];
let isMoveMode = false; // Status voor Snel Verplaatsen

// --- DOM Elementen ---
const form = document.getElementById('add-item-form');
const vriezerSelect = document.getElementById('item-vriezer'); 
const schuifSelect = document.getElementById('item-schuif'); 
const itemDatum = document.getElementById('item-datum');
const itemCategorie = document.getElementById('item-categorie'); 

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-item-form');
// Edit form fields
const editId = document.getElementById('edit-item-id');
const editNaam = document.getElementById('edit-item-naam');
const editAantal = document.getElementById('edit-item-aantal');
const editEenheid = document.getElementById('edit-item-eenheid');
const editVriezer = document.getElementById('edit-item-vriezer');
const editSchuif = document.getElementById('edit-item-schuif');
const editDatum = document.getElementById('edit-item-datum');
const editCategorie = document.getElementById('edit-item-categorie');

// Knoppen & Containers
const btnCancel = document.getElementById('btn-cancel');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const dashboard = document.getElementById('dashboard'); 
const feedbackMessage = document.getElementById('feedback-message');
const vriezerLijstenContainer = document.getElementById('vriezer-lijsten-container');

// Bulk Move UI
const bulkMoveControls = document.getElementById('bulk-move-controls');
const btnStartMoveMode = document.getElementById('btn-start-move-mode');
const btnCancelMoveMode = document.getElementById('btn-cancel-move-mode');
const bulkTargetVriezer = document.getElementById('bulk-target-vriezer');
const bulkTargetSchuif = document.getElementById('bulk-target-schuif');
const btnConfirmBulkMove = document.getElementById('btn-confirm-bulk-move');
const bulkSelectedCount = document.getElementById('bulk-selected-count');

// Modals
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');
const qrShowModal = document.getElementById('qr-show-modal');
const purchasedProcessModal = document.getElementById('purchased-process-modal');
const historyModal = document.getElementById('history-modal');
const profileModal = document.getElementById('profile-modal');
const shoppingListModal = document.getElementById('shopping-list-modal');

// --- HELPERS ---
function showModal(el) { if(el) el.classList.add('show'); }
function hideModal(el) { if(el) el.classList.remove('show'); }
function showFeedback(msg, type='success') {
    feedbackMessage.textContent = msg;
    feedbackMessage.className = `feedback ${type} show`;
    setTimeout(() => feedbackMessage.classList.remove('show'), 3000);
}
function formatAantal(a, e) { return (e === 'stuks') ? `${a}x` : `${a} ${e}`; }
function formatDatum(ts) { return ts ? ts.toDate().toLocaleDateString('nl-BE') : '?'; }
function getEmoji(cat) { return categoryEmojis[cat] || categoryEmojis["Geen"]; }

// --- AUTH & INIT ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        eigenUserId = user.uid; 
        beheerdeUserId = user.uid;
        registreerGebruiker(user);
        checkAdminStatus(user.uid);
        
        // Setup Profiel Img
        const img = document.getElementById('profile-img');
        const icon = document.querySelector('.profile-btn i');
        if (user.photoURL) { img.src = user.photoURL; img.style.display='block'; icon.style.display='none'; }
        
        document.getElementById('profile-email').textContent = user.email;
        itemDatum.value = new Date().toISOString().split('T')[0];

        startAlleDataListeners();
        startPendingSharesListener();
    } else {
        window.location.replace('index.html');
    }
});

async function registreerGebruiker(user) {
    await usersCollectie.doc(user.uid).set({
        email: user.email, displayName: user.displayName || user.email,
        laatstGezien: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function checkAdminStatus(uid) {
    // In een echte app check je de db, hier doen we even een simpele check of placeholder
    try {
        const adminDoc = await adminsCollectie.doc(uid).get();
        isAdmin = adminDoc.exists;
        if(isAdmin) {
             document.getElementById('switch-account-knop').style.display = 'inline-flex';
             document.getElementById('admin-switch-section').style.display = 'block';
             startAdminUserListener();
        } else {
            // Check gewone shares
             startAcceptedSharesListener();
        }
    } catch(e) { console.log(e); }
}

// --- DATA LISTENERS ---
function startAlleDataListeners() {
    stopAlleDataListeners();
    
    // Units
    usersCollectie.doc(beheerdeUserId).onSnapshot((doc) => {
        userUnits = (doc.exists && doc.data().customUnits) ? doc.data().customUnits : [...defaultUnits];
        renderUnitDropdowns();
        renderUnitBeheerLijst();
    });

    // Vriezers
    vriezersListener = vriezersCollectieBasis.where('userId', '==', beheerdeUserId).orderBy('naam').onSnapshot(snap => {
        alleVriezers = snap.docs.map(d => ({id: d.id, ...d.data()}));
        vulDropdowns();
        renderDynamischeLijsten();
    });

    // Lades
    ladesListener = ladesCollectieBasis.where('userId', '==', beheerdeUserId).orderBy('naam').onSnapshot(snap => {
        alleLades = snap.docs.map(d => ({id: d.id, ...d.data()}));
        vulDropdowns();
        renderDynamischeLijsten();
    });

    // Items
    itemsListener = itemsCollectieBasis.where("userId", "==", beheerdeUserId).onSnapshot(snap => {
        alleItems = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderDynamischeLijsten();
        updateDashboard();
        // Eerste keer check notificaties?
    });

    if (beheerdeUserId === eigenUserId) {
        startShoppingListListener();
        startWeekMenuListener();
    }
}

function stopAlleDataListeners() {
    if (vriezersListener) vriezersListener();
    if (ladesListener) ladesListener();
    if (itemsListener) itemsListener();
    if (shoppingListListener) shoppingListListener();
    if (weekMenuListener) weekMenuListener();
    // history listener is on demand
}

function startAcceptedSharesListener() {
    acceptedSharesListener = sharesCollectie.where("sharedWithId", "==", eigenUserId).where("status", "==", "accepted")
    .onSnapshot(snap => {
        const list = document.getElementById('user-shared-lijst');
        list.innerHTML = '';
        if(!snap.empty) {
            document.getElementById('switch-account-knop').style.display = 'inline-flex';
            document.getElementById('user-switch-section').style.display = 'block';
            snap.forEach(doc => {
                const d = doc.data();
                list.innerHTML += `<li onclick="schakelBeheer('${d.ownerId}', '${d.ownerEmail}')"><span>${d.ownerEmail}</span></li>`;
            });
        }
    });
}
// Placeholder functions voor shares
function startPendingSharesListener() {} 
function startAdminUserListener() {}
function schakelBeheer(uid, email) {
    beheerdeUserId = uid;
    document.getElementById('switch-account-titel').textContent = `Beheer van: ${email}`;
    document.getElementById('switch-terug-knop').style.display = 'block';
    hideModal(document.getElementById('switch-account-modal'));
    startAlleDataListeners();
    showFeedback(`Nu ${email} aan het beheren.`);
}
document.getElementById('switch-terug-knop').onclick = () => schakelBeheer(eigenUserId, "Jezelf");


// --- UI RENDERING & LOGICA ---

function vulDropdowns() {
    // Vult add-item, bulk-move en purchased-process dropdowns
    const vriezerSelects = [vriezerSelect, bulkTargetVriezer, document.getElementById('purchased-vriezer'), editVriezer];
    
    vriezerSelects.forEach(sel => {
        if(!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="" disabled>Kies een vriezer...</option>';
        alleVriezers.forEach(v => {
            sel.innerHTML += `<option value="${v.id}">${v.naam}</option>`;
        });
        if(currentVal) sel.value = currentVal;
    });

    // Lades updaten we on-change van vriezer, behalve initieel
    updateLadeDropdown(vriezerSelect.value, schuifSelect);
    updateLadeDropdown(bulkTargetVriezer.value, bulkTargetSchuif);
}

function updateLadeDropdown(vriezerId, selectEl) {
    if(!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="" disabled>Kies een lade...</option>';
    
    if (vriezerId) {
        const lades = alleLades.filter(l => l.vriezerId === vriezerId);
        lades.forEach(l => {
            selectEl.innerHTML += `<option value="${l.id}">${l.naam}</option>`;
        });
        if(currentVal && lades.some(l=>l.id===currentVal)) selectEl.value = currentVal;
    }
}

// Change handlers voor alle vriezer-dropdowns om hun lade-dropdown te updaten
[
    {v: vriezerSelect, l: schuifSelect},
    {v: bulkTargetVriezer, l: bulkTargetSchuif},
    {v: document.getElementById('purchased-vriezer'), l: document.getElementById('purchased-schuif')},
    {v: editVriezer, l: editSchuif}
].forEach(pair => {
    pair.v.addEventListener('change', () => updateLadeDropdown(pair.v.value, pair.l));
});


// *** CORE RENDER FUNCTIE MET EMOJIS & BULK CHECKBOXES ***
function renderDynamischeLijsten() {
    vriezerLijstenContainer.innerHTML = '';
    
    alleVriezers.forEach(vriezer => {
        const kolom = document.createElement('div');
        kolom.className = 'vriezer-kolom';
        kolom.innerHTML = `<h2>${vriezer.naam}</h2>`;
        
        // Filters
        const filterBox = document.createElement('div');
        filterBox.className = 'lade-filter-container';
        filterBox.innerHTML = `
            <select id="filter-lade-${vriezer.id}" class="lade-filter-select" onchange="updateItemVisibility()"><option value="all">Alle lades</option></select>
            <select id="filter-cat-${vriezer.id}" class="lade-filter-select" onchange="updateItemVisibility()"><option value="all">Alle categ.</option><option value="Vlees">🥩 Vlees</option><option value="Vis">🐟 Vis</option><option value="Groenten">🥦 Groenten</option><option value="Fruit">🍓 Fruit</option><option value="Brood">🍞 Brood</option><option value="IJs">🍦 IJs</option><option value="Restjes">🍲 Restjes</option><option value="Saus">🥫 Saus</option><option value="Ander">📦 Ander</option></select>
        `;
        // Vul filter lades
        const vLades = alleLades.filter(l => l.vriezerId === vriezer.id);
        vLades.forEach(l => filterBox.querySelector('select').innerHTML += `<option value="${l.id}">${l.naam}</option>`);
        kolom.appendChild(filterBox);

        vLades.forEach(lade => {
            const group = document.createElement('div');
            group.className = 'lade-group collapsed'; // Standaard dicht
            group.dataset.ladeId = lade.id;
            
            group.innerHTML = `
                <button class="lade-header"><h3>${lade.naam}</h3> <i class="fas fa-chevron-down chevron"></i></button>
                <div class="lade-content"><ul data-vriezer-id="${vriezer.id}"></ul></div>
            `;
            
            const ul = group.querySelector('ul');
            const items = alleItems.filter(i => i.ladeId === lade.id);
            
            items.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id;
                li.dataset.ladeId = item.ladeId;
                li.dataset.categorie = item.categorie || 'Geen';
                
                // Leeftijd kleur
                const dagen = item.ingevrorenOp ? Math.ceil((new Date() - item.ingevrorenOp.toDate())/(1000*60*60*24)) : 0;
                if(dagen > 180) li.classList.add('item-old');
                else if(dagen > 90) li.classList.add('item-medium');
                else li.classList.add('item-fresh');
                
                // EMOJI & CHECKBOX
                const emoji = getEmoji(item.categorie);
                
                li.innerHTML = `
                    <input type="checkbox" class="bulk-check" value="${item.id}">
                    <div class="item-text" onclick="if(isMoveMode) toggleCheck(this)">
                        <strong><span class="emoji-icon">${emoji}</span>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small class="item-datum">${formatDatum(item.ingevrorenOp)} (${dagen}d)</small>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-btn"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                ul.appendChild(li);
            });
            kolom.appendChild(group);
        });
        vriezerLijstenContainer.appendChild(kolom);
    });

    // Toggle click listeners voor accordion
    document.querySelectorAll('.lade-header').forEach(h => {
        h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
    });
    
    // CRUD Listeners
    document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', handleDeleteItem));
    document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', handleEditItem));

    // Drag Drop
    if(beheerdeUserId === eigenUserId) initDragAndDrop();
    
    // Check bulk checkboxes
    document.querySelectorAll('.bulk-check').forEach(c => c.addEventListener('change', updateBulkCount));
}

function initDragAndDrop() {
    document.querySelectorAll('.lade-content ul').forEach(ul => {
        new Sortable(ul, {
            group: 'shared', animation: 150, handle: '.item-text',
            onEnd: function(evt) {
                const itemEl = evt.item;
                const newLadeId = itemEl.closest('.lade-group').dataset.ladeId;
                const newVriezerId = itemEl.closest('.lade-content').querySelector('ul').dataset.vriezerId;
                const ladeNaam = alleLades.find(l => l.id === newLadeId)?.naam;
                
                itemsCollectieBasis.doc(itemEl.dataset.id).update({
                    ladeId: newLadeId, vriezerId: newVriezerId, ladeNaam: ladeNaam
                });
            }
        });
    });
}

function updateDashboard() {
    dashboard.innerHTML = `<strong>Totaal: ${alleItems.length}</strong>`;
    alleVriezers.forEach(v => {
        const count = alleItems.filter(i => i.vriezerId === v.id).length;
        dashboard.innerHTML += `<span>${v.naam}: ${count}</span>`;
    });
}

// --- BULK MOVE FUNCTIONALITEIT (NIEUW) ---
btnStartMoveMode.addEventListener('click', () => {
    isMoveMode = true;
    document.body.classList.add('move-mode');
    bulkMoveControls.style.display = 'block';
    btnStartMoveMode.style.display = 'none';
    // Open alle lades voor makkelijk selecteren
    document.querySelectorAll('.lade-group').forEach(l => l.classList.remove('collapsed'));
});

btnCancelMoveMode.addEventListener('click', () => {
    isMoveMode = false;
    document.body.classList.remove('move-mode');
    bulkMoveControls.style.display = 'none';
    btnStartMoveMode.style.display = 'block';
    // Uncheck alles
    document.querySelectorAll('.bulk-check').forEach(c => c.checked = false);
    updateBulkCount();
});

window.toggleCheck = function(el) {
    if(!isMoveMode) return;
    const chk = el.parentElement.querySelector('.bulk-check');
    chk.checked = !chk.checked;
    updateBulkCount();
}

function updateBulkCount() {
    const count = document.querySelectorAll('.bulk-check:checked').length;
    bulkSelectedCount.textContent = `${count} items geselecteerd`;
    btnConfirmBulkMove.disabled = count === 0;
}

btnConfirmBulkMove.addEventListener('click', async () => {
    const vId = bulkTargetVriezer.value;
    const lId = bulkTargetSchuif.value;
    if(!vId || !lId) return showFeedback("Kies doel vriezer en lade", "error");

    const checkedIds = Array.from(document.querySelectorAll('.bulk-check:checked')).map(c => c.value);
    const ladeNaam = alleLades.find(l => l.id === lId)?.naam || "Onbekend";

    const batch = db.batch();
    checkedIds.forEach(id => {
        batch.update(itemsCollectieBasis.doc(id), { vriezerId: vId, ladeId: lId, ladeNaam: ladeNaam });
    });

    try {
        await batch.commit();
        showFeedback(`${checkedIds.length} items verplaatst!`);
        btnCancelMoveMode.click(); // Reset mode
    } catch(e) {
        showFeedback(e.message, "error");
    }
});

// --- ITEMS CRUD (CREATE/EDIT/DELETE met HISTORY) ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vId = vriezerSelect.value;
    const lId = schuifSelect.value;
    const lNaam = schuifSelect.options[schuifSelect.selectedIndex].text;
    
    itemsCollectieBasis.add({
        naam: document.getElementById('item-naam').value,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        categorie: itemCategorie.value,
        ingevrorenOp: new Date(itemDatum.value),
        userId: beheerdeUserId,
        vriezerId: vId, ladeId: lId, ladeNaam: lNaam
    }).then(() => {
        showFeedback("Toegevoegd!");
        form.reset();
        itemDatum.value = new Date().toISOString().split('T')[0];
    });
});

function handleDeleteItem(e) {
    const li = e.target.closest('li');
    const id = li.dataset.id;
    const item = alleItems.find(i => i.id === id);
    
    if(confirm(`"${item.naam}" verwijderen? (Gaat naar geschiedenis)`)) {
        // 1. Add to History
        historyCollectie.add({
            ...item,
            deletedAt: new Date(),
            deletedBy: currentUser.email,
            ingevrorenOp: item.ingevrorenOp ? item.ingevrorenOp.toDate() : null // Convert back for clean JSON
        });
        
        // 2. Delete
        itemsCollectieBasis.doc(id).delete().then(() => showFeedback("Verwijderd en gearchiveerd."));
    }
}

function handleEditItem(e) {
    const li = e.target.closest('li');
    const item = alleItems.find(i => i.id === li.dataset.id);
    
    editId.value = item.id;
    editNaam.value = item.naam;
    editAantal.value = item.aantal;
    editEenheid.value = item.eenheid;
    editCategorie.value = item.categorie || 'Geen';
    editVriezer.value = item.vriezerId;
    updateLadeDropdown(item.vriezerId, editSchuif);
    editSchuif.value = item.ladeId;
    
    if(item.ingevrorenOp) editDatum.value = item.ingevrorenOp.toDate().toISOString().split('T')[0];
    
    showModal(editModal);
}

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const lNaam = editSchuif.options[editSchuif.selectedIndex].text;
    itemsCollectieBasis.doc(editId.value).update({
        naam: editNaam.value, aantal: parseFloat(editAantal.value), eenheid: editEenheid.value,
        categorie: editCategorie.value, vriezerId: editVriezer.value, ladeId: editSchuif.value,
        ladeNaam: lNaam, ingevrorenOp: new Date(editDatum.value)
    }).then(() => { hideModal(editModal); showFeedback("Aangepast!"); });
});

// --- BOODSCHAPPENLIJST & PURCHASE FLOW (NIEUW) ---
function startShoppingListListener() {
    shoppingListListener = shoppingListCollectie.where("userId", "==", eigenUserId).onSnapshot(snap => {
        const ul = document.getElementById('shopping-list');
        ul.innerHTML = '';
        snap.docs.forEach(doc => {
            const d = doc.data();
            const li = document.createElement('li');
            if(d.checked) li.className = 'checked';
            li.innerHTML = `
                <input type="checkbox" ${d.checked?'checked':''} onchange="toggleShopCheck('${doc.id}', this.checked)">
                <span class="shopping-item-name">${d.naam}</span>
                <div class="item-buttons">
                    <button class="btn-purchased" onclick="processPurchasedItem('${doc.id}', '${d.naam}')"><i class="fas fa-check"></i></button>
                    <button class="delete-btn" onclick="deleteShopItem('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            ul.appendChild(li);
        });
    });
}

window.toggleShopCheck = (id, val) => shoppingListCollectie.doc(id).update({checked: val});
window.deleteShopItem = (id) => shoppingListCollectie.doc(id).delete();

// "Gekocht" klik -> Open Modal
window.processPurchasedItem = function(id, naam) {
    document.getElementById('purchased-item-id').value = id;
    document.getElementById('purchased-item-original-name').value = naam;
    document.getElementById('purchased-item-name').textContent = naam;
    
    // Defaults
    document.getElementById('purchased-aantal').value = 1;
    document.getElementById('purchased-datum').value = new Date().toISOString().split('T')[0];
    
    // Units vullen
    const uSel = document.getElementById('purchased-eenheid');
    uSel.innerHTML = '';
    userUnits.forEach(u => uSel.innerHTML += `<option value="${u}">${u}</option>`);
    
    hideModal(shoppingListModal);
    showModal(purchasedProcessModal);
}

// Verwerk formulier "Waar heb je het gelegd?"
document.getElementById('process-purchased-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('purchased-item-id').value;
    const naam = document.getElementById('purchased-item-original-name').value;
    const vId = document.getElementById('purchased-vriezer').value;
    const lId = document.getElementById('purchased-schuif').value;
    const lNaam = document.getElementById('purchased-schuif').options[document.getElementById('purchased-schuif').selectedIndex].text;
    const aantal = parseFloat(document.getElementById('purchased-aantal').value);
    const eenheid = document.getElementById('purchased-eenheid').value;
    const datum = new Date(document.getElementById('purchased-datum').value);
    
    // 1. Add to Items
    itemsCollectieBasis.add({
        naam, aantal, eenheid, categorie: 'Ander', // Default, gebruiker kan later editen
        ingevrorenOp: datum, userId: eigenUserId, vriezerId: vId, ladeId: lId, ladeNaam: lNaam
    }).then(() => {
        // 2. Delete from Shopping List
        shoppingListCollectie.doc(id).delete();
        hideModal(purchasedProcessModal);
        showFeedback(`${naam} opgeslagen in ${lNaam}!`);
    });
});

document.getElementById('add-shopping-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    shoppingListCollectie.add({
        naam: document.getElementById('shopping-item-naam').value,
        checked: false, userId: eigenUserId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('shopping-item-naam').value = '';
});

// --- WEEKMENU (simpel) ---
function startWeekMenuListener() {
    weekMenuListener = weekMenuCollectie.where("userId", "==", eigenUserId).orderBy("datum").onSnapshot(snap => {
         const ul = document.getElementById('weekmenu-list'); ul.innerHTML='';
         snap.forEach(d => {
             const data = d.data();
             ul.innerHTML += `<li><span>${data.datum}: ${data.gerecht}</span> <button class="delete-btn" onclick="deleteWeekMenuItem('${d.id}')"><i class="fas fa-trash"></i></button></li>`;
         });
    });
}
document.getElementById('add-weekmenu-form').addEventListener('submit', (e) => {
    e.preventDefault();
    weekMenuCollectie.add({
        datum: document.getElementById('weekmenu-datum').value,
        gerecht: document.getElementById('weekmenu-gerecht').value,
        userId: eigenUserId
    });
    document.getElementById('weekmenu-gerecht').value='';
});
window.deleteWeekMenuItem = (id) => weekMenuCollectie.doc(id).delete();


// --- GESCHIEDENIS (NIEUW) ---
document.getElementById('profile-history-btn').addEventListener('click', () => {
    hideModal(profileModal);
    showModal(historyModal);
    loadHistory();
});

function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<li>Laden...</li>';
    
    historyCollectie.where("userId", "==", eigenUserId).orderBy("deletedAt", "desc").limit(30).get()
    .then(snap => {
        list.innerHTML = '';
        if(snap.empty) { list.innerHTML = '<li>Geen geschiedenis gevonden.</li>'; return; }
        
        snap.forEach(doc => {
            const d = doc.data();
            const delDate = d.deletedAt ? d.deletedAt.toDate().toLocaleDateString() : '?';
            list.innerHTML += `
                <li>
                    <div style="flex-grow:1">
                        <strong>${d.naam}</strong> (${d.aantal} ${d.eenheid})<br>
                        <small>Verwijderd op: ${delDate}</small>
                    </div>
                    <button class="btn-beheer" style="background:#aaa; font-size:12px" onclick="restoreItem('${doc.id}')">Herstel</button>
                </li>
            `;
        });
    });
}

window.restoreItem = function(histId) {
    historyCollectie.doc(histId).get().then(doc => {
        const d = doc.data();
        const { deletedAt, deletedBy, ...itemData } = d; // Strip history fields
        itemData.ingevrorenOp = d.ingevrorenOp ? new Date(d.ingevrorenOp.seconds * 1000) : new Date(); // Fix timestamp
        
        itemsCollectieBasis.add(itemData).then(() => {
            historyCollectie.doc(histId).delete(); // Remove from history
            showFeedback("Item hersteld!");
            loadHistory(); // Refresh
        });
    });
}

// --- QR CODES GENERATIE & BEHEER (NIEUW) ---
// We voegen een QR knop toe in de lade-lijst in de beheermodal
function renderUnitBeheerLijst() {
    /* (bestaande code voor eenheden) */
    const ul = document.getElementById('eenheid-beheer-lijst'); ul.innerHTML='';
    userUnits.forEach(u => ul.innerHTML += `<li><span>${u}</span><button class="delete-btn" onclick="verwijderEenheid('${u}')"><i class="fas fa-trash"></i></button></li>`);
}

// Override de laadLadesBeheer om QR knoppen toe te voegen
function laadLadesBeheer(vId) {
    ladeBeheerLijst.innerHTML = '...';
    ladeBeheerListener = ladesCollectieBasis.where("vriezerId", "==", vId).onSnapshot(snap => {
        ladeBeheerLijst.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${d.naam}</span>
                <div class="item-buttons">
                    <button class="qr-btn" onclick="showQrCode('${doc.id}', '${d.naam}')" title="Toon QR"><i class="fas fa-qrcode"></i></button>
                    <button class="delete-btn" onclick="verwijderLade('${doc.id}', '${d.naam}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            ladeBeheerLijst.appendChild(li);
        });
    });
}

window.showQrCode = function(ladeId, ladeNaam) {
    // We genereren een unieke string die de scanner herkent
    const qrData = `VRIEZERAPP:LADE:${ladeId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    document.getElementById('qr-modal-title').textContent = `Lade: ${ladeNaam}`;
    document.getElementById('qr-code-display').innerHTML = `<img src="${qrUrl}" alt="QR Code">`;
    showModal(qrShowModal);
}

// --- SCANNER LOGICA UPDATE ---
function startScanner() {
    const html5QrCode = new Html5Qrcode("barcode-scanner-container");
    showModal(document.getElementById('scan-modal'));
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
        (decodedText) => {
            html5QrCode.stop();
            hideModal(document.getElementById('scan-modal'));
            
            // Check of het een Lade QR is
            if(decodedText.startsWith("VRIEZERAPP:LADE:")) {
                const ladeId = decodedText.split(":")[2];
                filterOpLade(ladeId);
            } else {
                // Anders behandel als product barcode
                fetchProductFromOFF(decodedText);
            }
        },
        (err) => {}
    );
    document.getElementById('btn-stop-scan').onclick = () => { html5QrCode.stop(); hideModal(document.getElementById('scan-modal')); };
}

function filterOpLade(ladeId) {
    // Zoek de lade en vriezer
    const lade = alleLades.find(l => l.id === ladeId);
    if(lade) {
        showFeedback(`Lade gescand: ${lade.naam}`);
        // Reset search
        searchBar.value = "";
        
        // We moeten de vriezer filters instellen
        // Dit is een beetje hacky omdat we dynamische IDs hebben in de HTML
        // We zetten de filter dropdown van de betreffende vriezer
        const select = document.getElementById(`filter-lade-${lade.vriezerId}`);
        if(select) {
            select.value = ladeId;
            // Trigger change event
            updateItemVisibility(); 
            // Scroll naar die vriezer kolom
            select.scrollIntoView({behavior: 'smooth'});
        }
    } else {
        showFeedback("Lade niet gevonden in jouw vriezers.", "error");
    }
}

// Overige hulpfuncties (fetchProductFromOFF, etc.) blijven ongewijzigd van origineel, 
// behalve dat we ze in de global scope moeten houden als ze daar zaten.
async function fetchProductFromOFF(ean) {
    // ... (Zelfde als voorheen)
    const url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if(data.product) {
            document.getElementById('item-naam').value = data.product.product_name;
            showFeedback("Product gevonden!");
        } else {
            showFeedback("Niet gevonden.", "error");
        }
    } catch(e) { console.error(e); }
}

// Sluit modals events
document.getElementById('btn-sluit-beheer').onclick = () => hideModal(vriezerBeheerModal);
document.getElementById('btn-sluit-qr').onclick = () => hideModal(qrShowModal);
document.getElementById('btn-cancel-process').onclick = () => hideModal(purchasedProcessModal);
document.getElementById('btn-sluit-history').onclick = () => hideModal(historyModal);
document.getElementById('btn-sluit-profile').onclick = () => hideModal(profileModal);
document.getElementById('btn-sluit-shopping-list').onclick = () => hideModal(shoppingListModal);
document.getElementById('btn-sluit-weekmenu').onclick = () => hideModal(document.getElementById('weekmenu-modal'));
document.getElementById('scan-btn').onclick = startScanner;

// Init
function renderUnitDropdowns() {
    [document.getElementById('item-eenheid'), document.getElementById('edit-item-eenheid'), document.getElementById('purchased-eenheid')]
    .forEach(sel => {
        if(!sel) return;
        sel.innerHTML = '';
        userUnits.forEach(u => sel.innerHTML += `<option value="${u}">${u}</option>`);
    });
}

function updateItemVisibility() {
    const term = searchBar.value.toLowerCase();
    
    alleVriezers.forEach(v => {
        const ladeFilter = document.getElementById(`filter-lade-${v.id}`)?.value || 'all';
        const catFilter = document.getElementById(`filter-cat-${v.id}`)?.value || 'all';
        
        const ladeGroepen = document.querySelectorAll(`.lade-group`);
        
        ladeGroepen.forEach(grp => {
            const grpLadeId = grp.dataset.ladeId;
            const lade = alleLades.find(l => l.id === grpLadeId);
            if(lade && lade.vriezerId !== v.id) return; // Skip groups from other freezers
            
            let visibleCount = 0;
            const ul = grp.querySelector('ul');
            
            ul.querySelectorAll('li').forEach(li => {
                const iName = li.querySelector('strong').textContent.toLowerCase();
                const iCat = li.dataset.categorie;
                const iLade = li.dataset.ladeId;
                
                const matchSearch = iName.includes(term);
                const matchLade = (ladeFilter === 'all' || ladeFilter === iLade);
                const matchCat = (catFilter === 'all' || catFilter === iCat);
                
                if(matchSearch && matchLade && matchCat) {
                    li.style.display = 'flex';
                    visibleCount++;
                } else {
                    li.style.display = 'none';
                }
            });
            
            // Show/Hide group based on items or explicit selection
            if(visibleCount > 0 || (ladeFilter === grpLadeId)) {
                grp.style.display = 'block';
                if(term) grp.classList.remove('collapsed'); // Open on search
            } else {
                grp.style.display = 'none';
            }
        });
    });
}
searchBar.addEventListener('input', updateItemVisibility);
