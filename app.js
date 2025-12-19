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

// Initialiseer Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Collectie referenties
const itemsCollectieBasis = db.collection('items');
const ladesCollectieBasis = db.collection('lades');
const vriezersCollectieBasis = db.collection('vriezers');
const usersCollectie = db.collection('users');
const adminsCollectie = db.collection('admins');
const sharesCollectie = db.collection('shares');
const shoppingListCollectie = db.collection('shoppingList');
const weekMenuCollectie = db.collection('weekmenu');
const historyCollectie = db.collection('history');

// ---
// GLOBALE VARIABELEN
// ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let userUnits = []; 

// CONFIGURATIE PER LOCATIE TYPE (Vriezer vs Voorraad)
const configPerType = {
    'vriezer': {
        categories: ["Geen", "Vlees", "Vis", "Groenten", "Fruit", "Brood", "IJs", "Restjes", "Saus", "Friet", "Pizza", "Ander"],
        units: ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "ijsdoos"]
    },
    'voorraad': {
        categories: ["Geen", "Pasta", "Rijst", "Conserven", "Saus", "Kruiden", "Bakproducten", "Snacks", "Drank", "Huishoud", "Ander"],
        units: ["stuks", "pak", "fles", "blik", "pot", "zak", "kg", "liter", "doos"]
    },
    // Fallback voor onbekende types
    'default': {
        categories: ["Geen", "Ander"],
        units: ["stuks"]
    }
};

const defaultUnits = configPerType['vriezer'].units; // Initiele fallback

// VARIABELE VOOR TABBLADEN
let activeTab = 'vriezer'; // Default: Vriezer

// Listeners
let vriezersListener = null;
let ladesListener = null;
let itemsListener = null; 
let userListListener = null;
let sharesOwnerListener = null;
let pendingSharesListener = null;
let acceptedSharesListener = null;
let shoppingListListener = null;
let weekMenuListener = null;
let historyListener = null;
let vriezerBeheerListener = null;
let ladeBeheerListener = null;

// Admin & Data Scheiding
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null; 
let alleAcceptedShares = [];

let isEersteNotificatieCheck = true;
let isMoveMode = false;
let selectedItemIds = new Set();

// --- Snelkoppelingen naar elementen ---
const form = document.getElementById('add-item-form');
const vriezerSelect = document.getElementById('item-vriezer'); 
const schuifSelect = document.getElementById('item-schuif'); 
const itemDatum = document.getElementById('item-datum');
const itemCategorie = document.getElementById('item-categorie');
const itemEmoji = document.getElementById('item-emoji');
const itemEenheid = document.getElementById('item-eenheid'); 

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-item-form');
const editId = document.getElementById('edit-item-id');
const editNaam = document.getElementById('edit-item-naam');
const editAantal = document.getElementById('edit-item-aantal');
const editEenheid = document.getElementById('edit-item-eenheid');
const editVriezer = document.getElementById('edit-item-vriezer');
const editSchuif = document.getElementById('edit-item-schuif');
const editDatum = document.getElementById('edit-item-datum');
const editCategorie = document.getElementById('edit-item-categorie');
const editEmoji = document.getElementById('edit-item-emoji');

const btnCancel = document.getElementById('btn-cancel');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn'); 
const dashboard = document.getElementById('dashboard'); 
const feedbackMessage = document.getElementById('feedback-message');
const scanBtn = document.getElementById('scan-btn');
const scanModal = document.getElementById('scan-modal');
const stopScanBtn = document.getElementById('btn-stop-scan');
const scannerContainerId = "barcode-scanner-container";
const manualEanBtn = document.getElementById('manual-ean-btn');
let html5QrCode;
const vriezerLijstenContainer = document.getElementById('vriezer-lijsten-container');
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer');
const addVriezerForm = document.getElementById('add-vriezer-form');
const vriezerBeheerLijst = document.getElementById('vriezer-beheer-lijst');
const ladesBeheerTitel = document.getElementById('lades-beheer-titel');
const addLadeForm = document.getElementById('add-lade-form');
const ladesBeheerHr = document.getElementById('lades-beheer-hr');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');
const btnToggleAlles = document.getElementById('btn-toggle-alles');

// Wissel Account & Profiel
const switchAccountKnop = document.getElementById('switch-account-knop');
const switchAccountModal = document.getElementById('switch-account-modal');
const sluitSwitchAccountKnop = document.getElementById('btn-sluit-switch-account');
const adminUserLijst = document.getElementById('admin-user-lijst');
const userSharedLijst = document.getElementById('user-shared-lijst');
const adminSwitchSection = document.getElementById('admin-switch-section');
const userSwitchSection = document.getElementById('user-switch-section');
const switchAccountTitel = document.getElementById('switch-account-titel');
const switchTerugKnop = document.getElementById('switch-terug-knop');
const profileBtn = document.getElementById('profile-btn');
const profileImg = document.getElementById('profile-img');
const profileIcon = profileBtn.querySelector('i'); 
const profileModal = document.getElementById('profile-modal');
const sluitProfileModalKnop = document.getElementById('btn-sluit-profile');
const profileModalImg = document.getElementById('profile-modal-img');
const profileModalIcon = profileModal.querySelector('.profile-header i');
const profileEmailEl = document.getElementById('profile-email');
const profileVriezerBeheerBtn = document.getElementById('profile-vriezer-beheer-btn');
const profileShoppingListBtn = document.getElementById('profile-shopping-list-btn'); 
const exportDataBtn = document.getElementById('export-data-btn');
const profileShareBtn = document.getElementById('profile-share-btn');
const profileHistoryBtn = document.getElementById('profile-history-btn'); 

// Overige Modals
const notificatieModal = document.getElementById('notificatie-modal');
const notificatieLijst = document.getElementById('notificatie-lijst');
const sluitNotificatieKnop = document.getElementById('btn-sluit-notificatie');
const shareModal = document.getElementById('share-modal');
const sluitShareKnop = document.getElementById('btn-sluit-share');
const shareInviteForm = document.getElementById('share-invite-form');
const shareHuidigeLijst = document.getElementById('share-huidige-lijst');
const acceptShareModal = document.getElementById('accept-share-modal');
const acceptShareLijst = document.getElementById('accept-share-lijst');
const sluitAcceptShareKnop = document.getElementById('btn-sluit-accept-share');
const shoppingListModal = document.getElementById('shopping-list-modal');
const sluitShoppingListKnop = document.getElementById('btn-sluit-shopping-list');
const addShoppingItemForm = document.getElementById('add-shopping-item-form');
const shoppingItemNaam = document.getElementById('shopping-item-naam');
const shoppingListUl = document.getElementById('shopping-list');
const clearCheckedShoppingItemsBtn = document.getElementById('btn-clear-checked-shopping-items');
const profileWeekmenuBtn = document.getElementById('profile-weekmenu-btn');
const weekmenuModal = document.getElementById('weekmenu-modal');
const sluitWeekmenuKnop = document.getElementById('btn-sluit-weekmenu');
const addWeekmenuForm = document.getElementById('add-weekmenu-form');
const weekmenuDatumInput = document.getElementById('weekmenu-datum');
const weekmenuGerechtInput = document.getElementById('weekmenu-gerecht');
const weekmenuLinkInput = document.getElementById('weekmenu-link');
const weekmenuListUl = document.getElementById('weekmenu-list');
const clearOldWeekmenuBtn = document.getElementById('btn-clear-old-weekmenu');
const historyModal = document.getElementById('history-modal');
const sluitHistoryKnop = document.getElementById('btn-sluit-history');
const historyListUl = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

// Bulk Actie
const btnToggleMode = document.getElementById('btn-toggle-mode');
const bulkActionBar = document.getElementById('bulk-action-bar');
const bulkCountSpan = document.getElementById('bulk-count');
const btnBulkMove = document.getElementById('btn-bulk-move');
const bulkTargetVriezer = document.getElementById('bulk-target-vriezer');
const bulkTargetLade = document.getElementById('bulk-target-lade');

// QR & Move Purchased
const qrModal = document.getElementById('qr-modal');
const sluitQrKnop = document.getElementById('btn-sluit-qr');
const qrCanvas = document.getElementById('qr-canvas');
const qrLadeNaam = document.getElementById('qr-lade-naam');
const btnPrintQr = document.getElementById('btn-print-qr');
const movePurchasedModal = document.getElementById('move-purchased-modal');
const movePurchasedForm = document.getElementById('move-purchased-form');
const btnCancelMovePurchased = document.getElementById('btn-cancel-move-purchased');
const movePurchasedNaamSpan = document.getElementById('move-purchased-naam');
const movePurchasedTempId = document.getElementById('move-purchased-temp-id');
const movePurchasedItemNaam = document.getElementById('move-purchased-item-naam');
const movePurchasedVriezer = document.getElementById('move-purchased-vriezer');
const movePurchasedLade = document.getElementById('move-purchased-lade');
const movePurchasedAantal = document.getElementById('move-purchased-aantal');
const movePurchasedEenheid = document.getElementById('move-purchased-eenheid');
const movePurchasedCategorie = document.getElementById('move-purchased-categorie');
const movePurchasedEmoji = document.getElementById('move-purchased-emoji');

// --- TABS LOGICA ---
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tabName) {
    activeTab = tabName;
    
    // Update knop styles
    tabButtons.forEach(btn => {
        if(btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Her-render lijsten en dashboard
    renderDynamischeLijsten();
    vulToevoegVriezerDropdown(); 
    updateDashboard();
}

// --- HELPER FUNCTIES (Emoji & Formatting) ---
function showModal(modalElement) { if (modalElement) modalElement.classList.add('show'); }
function hideModal(modalElement) { if (modalElement) modalElement.classList.remove('show'); }

function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback';
    feedbackMessage.classList.add(type);
    feedbackMessage.classList.add('show');
    setTimeout(() => { feedbackMessage.classList.remove('show'); }, 3000);
}

function formatAantal(aantal, eenheid) {
    if (!eenheid || eenheid === 'stuks') return `${aantal}x`;
    return `${aantal}x ${eenheid}`;
}

function formatDatum(timestamp) {
    if (!timestamp) return 'Onbekende datum';
    return timestamp.toDate().toLocaleDateString('nl-BE');
}

// Emoji mapping per categorie (Uitgebreid voor Voorraad)
function getEmojiForCategory(categorie) {
    const emojis = {
        // Vriezer
        "Vlees": "🥩", "Vis": "🐟", "Groenten": "🥦", "Fruit": "🍎", 
        "Brood": "🍞", "IJs": "🍦", "Restjes": "🥡", "Saus": "🥫", 
        "Friet": "🍟", "Pizza": "🍕",
        // Voorraad
        "Pasta": "🍝", "Rijst": "🍚", "Conserven": "🥫", "Kruiden": "🌿",
        "Bakproducten": "🥖", "Snacks": "🍿", "Drank": "🥤", "Huishoud": "🧻",
        // Algemeen
        "Ander": "📦", "Geen": "🔳"
    };
    return emojis[categorie] || "📦";
}

function updateEmojiField(selectElement, inputElement) {
    const cat = selectElement.value;
    const emoji = getEmojiForCategory(cat);
    inputElement.value = emoji;
}

function handleAantalKlik(e) {
    const target = e.target.closest('.aantal-btn');
    if (!target) return;
    const wrapper = target.parentElement;
    const input = wrapper.querySelector('input[type="number"]');
    if (!input) return;
    const action = target.dataset.action;
    const step = parseFloat(input.step) || 1;
    let currentValue = parseFloat(input.value) || 0;
    if (action === 'plus') currentValue += step;
    else if (action === 'minus') currentValue -= step;
    const min = parseFloat(input.min) || 0;
    if (currentValue < min) currentValue = min;
    input.value = currentValue;
}

// --- DYNAMISCHE DROPDOWNS (CATEGORIE/EENHEID PER TYPE) ---
function updateFormOptions(locatieSelect, categorieSelect, eenheidSelect) {
    const selectedLocatieId = locatieSelect.value;
    if (!selectedLocatieId) return;

    // Zoek het type van de geselecteerde locatie
    const locatie = alleVriezers.find(v => v.id === selectedLocatieId);
    // Standaard type 'vriezer' als er geen type is
    const type = (locatie && locatie.type) ? locatie.type : 'vriezer';
    
    // Haal config op, fallback naar default als type onbekend is
    const config = configPerType[type] || configPerType['default'];

    // 1. Update Categorieën
    const huidigeCat = categorieSelect.value;
    categorieSelect.innerHTML = '';
    config.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorieSelect.appendChild(opt);
    });
    // Herstel selectie indien mogelijk
    if (config.categories.includes(huidigeCat)) {
        categorieSelect.value = huidigeCat;
    } else {
        categorieSelect.value = "Geen";
    }

    // 2. Update Eenheden (Combineer standaard config met user custom units indien van toepassing)
    // Opmerking: Hier gebruiken we de config units.
    const huidigeEenheid = eenheidSelect.value;
    eenheidSelect.innerHTML = '';
    
    // Voeg type-specifieke eenheden toe
    config.units.forEach(unit => {
        const opt = document.createElement('option');
        opt.value = unit;
        opt.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
        eenheidSelect.appendChild(opt);
    });
    
    // Voeg ook algemene custom user units toe die nog niet in de lijst staan (optioneel)
    userUnits.forEach(u => {
        if (!config.units.includes(u)) {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = u + " (Eigen)";
            eenheidSelect.appendChild(opt);
        }
    });

    if (huidigeEenheid && (config.units.includes(huidigeEenheid) || userUnits.includes(huidigeEenheid))) {
        eenheidSelect.value = huidigeEenheid;
    } else {
        eenheidSelect.value = config.units[0];
    }
}

// Event Listeners voor dropdown updates
vriezerSelect.addEventListener('change', () => {
    updateLadeDropdown(vriezerSelect.value, schuifSelect, true);
    updateFormOptions(vriezerSelect, itemCategorie, itemEenheid);
});

editVriezer.addEventListener('change', () => {
    updateLadeDropdown(editVriezer.value, editSchuif, true);
    updateFormOptions(editVriezer, editCategorie, editEenheid);
});

movePurchasedVriezer.addEventListener('change', () => {
    updateLadeDropdown(movePurchasedVriezer.value, movePurchasedLade, true);
    updateFormOptions(movePurchasedVriezer, movePurchasedCategorie, movePurchasedEenheid);
});


// --- Scanner ---
function startScanner() {
    html5QrCode = new Html5Qrcode(scannerContainerId);
    showModal(scanModal);
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        showFeedback("Camera niet gevonden.", "error");
        sluitScanner();
    });
}

function sluitScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => hideModal(scanModal)).catch(() => hideModal(scanModal));
    } else {
        hideModal(scanModal);
    }
}

function onScanSuccess(decodedText) {
    sluitScanner();
    if (decodedText.includes("ladeFilter=")) {
        try {
            const url = new URL(decodedText);
            const ladeId = url.searchParams.get("ladeFilter");
            if (ladeId) {
                const gevondenLade = alleLades.find(l => l.id === ladeId);
                if (gevondenLade) {
                    const parentVriezer = alleVriezers.find(v => v.id === gevondenLade.vriezerId);
                    if (parentVriezer && parentVriezer.type) {
                        switchTab(parentVriezer.type);
                    }
                    window.pendingLadeFilter = ladeId;
                    renderDynamischeLijsten();
                    showFeedback(`Gevonden: ${gevondenLade.naam}`, 'success');
                } else {
                    showFeedback("Locatie onbekend.", "error");
                }
            }
        } catch (e) { console.error(e); }
    } else {
        fetchProductFromOFF(decodedText);
    }
}
function onScanFailure(error) {}

async function fetchProductFromOFF(ean) {
    if (!ean || ean.length < 8) { showFeedback("Ongeldige EAN.", "error"); return; }
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
        const data = await response.json();
        if (data.status === 1 && data.product && data.product.product_name) {
            document.getElementById('item-naam').value = data.product.product_name;
            showFeedback(`Product: ${data.product.product_name}`, "success");
        } else { showFeedback("Niet gevonden.", "error"); }
    } catch (error) { showFeedback("API Fout.", "error"); }
}

// --- AUTH & INIT ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user; eigenUserId = user.uid; beheerdeUserId = user.uid; beheerdeUserEmail = user.email || "Jezelf";
        isEersteNotificatieCheck = true; alleAcceptedShares = [];
        registreerGebruiker(user);
        checkAdminStatus(user.uid);
        
        if (user.photoURL) {
            profileImg.src = user.photoURL; profileImg.style.display = 'block'; profileIcon.style.display = 'none';
            profileModalImg.src = user.photoURL; profileModalImg.style.display = 'block'; profileModalIcon.style.display = 'none';
        } else {
            profileImg.style.display = 'none'; profileIcon.style.display = 'block';
            profileModalImg.style.display = 'none'; profileModalIcon.style.display = 'block';
        }
        profileEmailEl.textContent = user.email || 'Geen e-mail';
        itemDatum.value = new Date().toISOString().split('T')[0];
        
        startAlleDataListeners();
        startPendingSharesListener();
        checkUrlForLadeFilter();
    } else {
        currentUser = null; eigenUserId = null; beheerdeUserId = null; isAdmin = false;
        stopAlleDataListeners();
        window.location.replace('index.html');
    }
});

function checkUrlForLadeFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const ladeId = urlParams.get('ladeFilter');
    if (ladeId) window.pendingLadeFilter = ladeId;
}

async function registreerGebruiker(user) {
    try { await usersCollectie.doc(user.uid).set({ email: user.email||'Onbekend', displayName: user.displayName||user.email, laatstGezien: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (e) {}
}

async function checkAdminStatus(uid) {
    try { const doc = await adminsCollectie.doc(uid).get(); isAdmin = doc.exists; } catch (e) { isAdmin = false; }
    if(isAdmin) { switchAccountKnop.style.display = 'inline-flex'; adminSwitchSection.style.display = 'block'; userSwitchSection.style.display = 'none'; startAdminUserListener(); }
    else { adminSwitchSection.style.display = 'none'; userSwitchSection.style.display = 'block'; startAcceptedSharesListener(); }
    updateSwitchAccountUI();
}

function schakelBeheer(naarUserId, naarUserEmail) {
    if (beheerdeUserId === naarUserId) return;
    beheerdeUserId = naarUserId; beheerdeUserEmail = naarUserEmail || 'Onbekende';
    isEersteNotificatieCheck = true;
    stopAlleDataListeners();
    vriezerLijstenContainer.innerHTML = ''; dashboard.innerHTML = '';
    startAlleDataListeners();
    updateSwitchAccountUI();
    hideModal(switchAccountModal);
    showFeedback(`Beheer nu: ${beheerdeUserEmail}`, 'success');
}

function updateSwitchAccountUI() {
    if (beheerdeUserId === eigenUserId) {
        switchAccountTitel.textContent = 'Je beheert je eigen voorraad.'; switchAccountTitel.style.color = '#555'; switchTerugKnop.style.display = 'none';
        startPendingSharesListener(); if(isAdmin) startAdminUserListener(); else startAcceptedSharesListener(); startShoppingListListener();
    } else {
        switchAccountTitel.textContent = `LET OP: Je beheert ${beheerdeUserEmail}!`; switchAccountTitel.style.color = '#FF6B6B'; switchTerugKnop.style.display = 'block';
        if (pendingSharesListener) pendingSharesListener(); if (acceptedSharesListener) acceptedSharesListener(); if (shoppingListListener) shoppingListListener();
    }
}

// --- DATA LISTENERS ---
function startAlleDataListeners() {
    if (!beheerdeUserId) return;
    stopAlleDataListeners();

    usersCollectie.doc(beheerdeUserId).onSnapshot((doc) => {
        if (doc.exists) { userUnits = doc.data().customUnits || []; } 
        else { userUnits = []; }
        renderUnitBeheerLijst();
    });

    vriezersListener = vriezersCollectieBasis.where('userId', '==', beheerdeUserId).orderBy('naam').onSnapshot((snapshot) => {
        alleVriezers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: doc.data().type || 'vriezer' }));
        vulToevoegVriezerDropdown();
        renderBulkDropdowns();
        renderDynamischeLijsten();
    });

    ladesListener = ladesCollectieBasis.where('userId', '==', beheerdeUserId).orderBy('naam').onSnapshot((snapshot) => {
        alleLades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateLadeDropdown(vriezerSelect.value, schuifSelect, false);
        renderDynamischeLijsten();
    });

    itemsListener = itemsCollectieBasis.where("userId", "==", beheerdeUserId).onSnapshot((snapshot) => {
        alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDynamischeLijsten();
        updateDashboard();
        if (isEersteNotificatieCheck && alleItems.length > 0 && beheerdeUserId === eigenUserId) { checkHoudbaarheidNotificaties(); isEersteNotificatieCheck = false; }
    });

    if (beheerdeUserId === eigenUserId) { startShoppingListListener(); startWeekMenuListener(); }
}

function stopAlleDataListeners() {
    if (vriezersListener) { vriezersListener(); vriezersListener = null; }
    if (ladesListener) { ladesListener(); ladesListener = null; }
    if (itemsListener) { itemsListener(); itemsListener = null; }
    if (userListListener) { userListListener(); userListListener = null; }
    if (sharesOwnerListener) { sharesOwnerListener(); sharesOwnerListener = null; }
    if (pendingSharesListener) { pendingSharesListener(); pendingSharesListener = null; }
    if (acceptedSharesListener) { acceptedSharesListener(); acceptedSharesListener = null; }
    if (shoppingListListener) { shoppingListListener(); shoppingListListener = null; }
    if (weekMenuListener) { weekMenuListener(); weekMenuListener = null; }
    if (historyListener) { historyListener(); historyListener = null; }
}

function startAdminUserListener() { /* ... (Zelfde als voorheen) ... */ }
function startAcceptedSharesListener() { /* ... */ }
function startPendingSharesListener() { /* ... */ }
function startSharesOwnerListener() { /* ... */ }

// --- UI RENDERING ---

function vulToevoegVriezerDropdown() {
    const geselecteerdeId = vriezerSelect.value;
    vriezerSelect.innerHTML = '<option value="" disabled>Kies een locatie...</option>';
    
    // Filter alleen locaties die bij de actieve tab horen
    const relevanteLocaties = alleVriezers.filter(v => v.type === activeTab);
    
    relevanteLocaties.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam; 
        vriezerSelect.appendChild(option);
    });
    
    if (geselecteerdeId && relevanteLocaties.some(v => v.id === geselecteerdeId)) {
        vriezerSelect.value = geselecteerdeId;
    } else {
        vriezerSelect.value = "";
    }
    // Trigger update voor lades en opties
    updateLadeDropdown(vriezerSelect.value, schuifSelect, false);
    updateFormOptions(vriezerSelect, itemCategorie, itemEenheid);
}

function updateLadeDropdown(vriezerId, ladeSelectElement, resetSelectie) {
    const geselecteerdeLadeId = resetSelectie ? "" : ladeSelectElement.value;
    ladeSelectElement.innerHTML = '<option value="" disabled>Kies een lade...</option>';
    if (!vriezerId) { ladeSelectElement.innerHTML = '<option value="" disabled>Kies eerst locatie...</option>'; ladeSelectElement.value = ""; return; }
    
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === vriezerId);
    gefilterdeLades.sort((a, b) => a.naam.localeCompare(b.naam));
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option'); option.value = lade.id; option.textContent = lade.naam; ladeSelectElement.appendChild(option);
    });
    
    if (geselecteerdeLadeId && gefilterdeLades.some(l => l.id === geselecteerdeLadeId)) ladeSelectElement.value = geselecteerdeLadeId;
    else ladeSelectElement.value = "";
}

function renderDynamischeLijsten() {
    const openLadeIds = new Set();
    document.querySelectorAll('.lade-group:not(.collapsed)').forEach(group => openLadeIds.add(group.dataset.ladeId));
    if (window.pendingLadeFilter) openLadeIds.add(window.pendingLadeFilter);
    
    vriezerLijstenContainer.innerHTML = ''; 
    const zichtbareVriezers = alleVriezers.filter(v => v.type === activeTab);
    zichtbareVriezers.sort((a, b) => a.naam.localeCompare(b.naam));

    if (zichtbareVriezers.length === 0) {
        vriezerLijstenContainer.innerHTML = `<div style="text-align:center; width:100%; padding:20px; color:#777;">
            Nog geen ${activeTab} locaties. <br>Ga naar Beheer om er een toe te voegen.
        </div>`;
        return;
    }

    zichtbareVriezers.forEach(vriezer => {
        const kolomDiv = document.createElement('div');
        kolomDiv.className = 'vriezer-kolom';
        
        // Bereken totaal items voor deze specifieke locatie
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        kolomDiv.innerHTML = `<h2>${vriezer.naam} <small style="font-size:0.6em; color:#777;">(${vriezerItems.length} items)</small></h2>`;

        const vriezerLades = alleLades.filter(lade => lade.vriezerId === vriezer.id).sort((a, b) => a.naam.localeCompare(b.naam));

        // Filters (Lade & Categorie)
        const filterContainer = document.createElement('div'); filterContainer.className = 'lade-filter-container';
        const ladeFilterGroup = document.createElement('div'); ladeFilterGroup.className = 'filter-group';
        const ladeFilterSelect = document.createElement('select'); 
        ladeFilterSelect.id = `filter-lade-${vriezer.id}`; ladeFilterSelect.className = 'lade-filter-select';
        ladeFilterSelect.innerHTML = '<option value="all">Alle lades</option>';
        vriezerLades.forEach(lade => { ladeFilterSelect.innerHTML += `<option value="${lade.id}">${lade.naam}</option>`; });
        
        if (window.pendingLadeFilter) { 
             const checkLade = vriezerLades.find(l => l.id === window.pendingLadeFilter);
             if (checkLade) { ladeFilterSelect.value = window.pendingLadeFilter; setTimeout(() => kolomDiv.scrollIntoView({ behavior: 'smooth' }), 300); }
        }
        ladeFilterSelect.addEventListener('change', updateItemVisibility); 
        ladeFilterGroup.appendChild(ladeFilterSelect); filterContainer.appendChild(ladeFilterGroup);

        const catFilterGroup = document.createElement('div'); catFilterGroup.className = 'filter-group';
        const catFilterSelect = document.createElement('select'); 
        catFilterSelect.id = `filter-categorie-${vriezer.id}`; catFilterSelect.className = 'lade-filter-select';
        // Haal categorieën op uit config voor dit type
        const typeConfig = configPerType[vriezer.type] || configPerType['default'];
        let catOptions = `<option value="all">Alle categorieën</option>`;
        typeConfig.categories.forEach(c => catOptions += `<option value="${c}">${c}</option>`);
        catFilterSelect.innerHTML = catOptions;
        
        catFilterSelect.addEventListener('change', updateItemVisibility); 
        catFilterGroup.appendChild(catFilterSelect); filterContainer.appendChild(catFilterGroup);
        kolomDiv.appendChild(filterContainer);
        
        // Render Lades en Items
        vriezerLades.forEach(lade => {
            const ladeGroup = document.createElement('div');
            ladeGroup.className = 'lade-group'; ladeGroup.dataset.ladeId = lade.id; 
            if (window.pendingLadeFilter && window.pendingLadeFilter === lade.id) ladeGroup.classList.remove('collapsed');
            else if (!openLadeIds.has(lade.id)) ladeGroup.classList.add('collapsed');

            const ladeHeader = document.createElement('button'); ladeHeader.className = 'lade-header';
            ladeHeader.dataset.ladeId = lade.id; ladeHeader.dataset.ladeNaam = lade.naam;
            ladeHeader.innerHTML = `<h3>${lade.naam}</h3> <i class="fas fa-chevron-down chevron"></i>`;

            const ladeContent = document.createElement('div'); ladeContent.className = 'lade-content';
            const ladeUl = document.createElement('ul'); ladeUl.dataset.vriezerId = vriezer.id; 
            
            const ladeItems = vriezerItems.filter(item => item.ladeId === lade.id).sort((a, b) => a.naam.localeCompare(b.naam));
            ladeItems.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id; li.dataset.ladeId = item.ladeId; li.dataset.vriezerId = item.vriezerId; li.dataset.categorie = item.categorie || 'Geen';
                
                let diffDagen = 0;
                if (item.ingevrorenOp) {
                    diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                    if (diffDagen > 180) li.classList.add('item-old'); else if (diffDagen > 90) li.classList.add('item-medium'); else li.classList.add('item-fresh');
                }
                
                const emoji = item.emoji || getEmojiForCategory(item.categorie || 'Geen');
                const isChecked = selectedItemIds.has(item.id) ? 'checked' : '';
                
                li.innerHTML = `
                    <input type="checkbox" class="bulk-checkbox" data-id="${item.id}" ${isChecked}>
                    <div class="item-text">
                        <strong><span class="emoji-icon">${emoji}</span>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small class="item-categorie">Cat: ${item.categorie || 'Geen'}</small>
                        <small class="item-datum">Datum: ${formatDatum(item.ingevrorenOp)} (${diffDagen}d)</small>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-btn" title="Bewerken"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                li.querySelector('.bulk-checkbox').addEventListener('change', (e) => {
                    if (e.target.checked) selectedItemIds.add(item.id); else selectedItemIds.delete(item.id); 
                    updateBulkActionBar();
                });
                ladeUl.appendChild(li);
            });
            ladeContent.appendChild(ladeUl); ladeGroup.appendChild(ladeHeader); ladeGroup.appendChild(ladeContent); kolomDiv.appendChild(ladeGroup);
        });
        vriezerLijstenContainer.appendChild(kolomDiv);
    });
    
    if (window.pendingLadeFilter) { setTimeout(() => { updateItemVisibility(); window.pendingLadeFilter = null; }, 100); } 
    else { 
        const kanBewerken = (beheerdeUserId === eigenUserId) || (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));
        if (kanBewerken) initDragAndDrop(); 
        updateItemVisibility(); 
    }
    if (isMoveMode) { document.body.classList.add('move-mode'); bulkActionBar.classList.add('visible'); }
}

function updateDashboard() {
    dashboard.innerHTML = '';
    
    // Alleen zichtbare locaties tellen voor het overzicht
    const tabVriezers = alleVriezers.filter(v => v.type === activeTab);
    const tabVriezerIds = tabVriezers.map(v => v.id);
    const visibleItems = alleItems.filter(i => tabVriezerIds.includes(i.vriezerId));

    let totaalSpan = document.createElement('strong');
    totaalSpan.textContent = `Totaal ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}: ${visibleItems.length}`;
    dashboard.appendChild(totaalSpan);

    // Totaal PER locatie (zoals gevraagd)
    tabVriezers.forEach(vriezer => {
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        let vriezerSpan = document.createElement('span');
        vriezerSpan.textContent = `${vriezer.naam}: ${vriezerItems.length}`;
        dashboard.appendChild(vriezerSpan);
    });
}

function initDragAndDrop() {
    const lijsten = document.querySelectorAll('.lade-content ul');
    const onDragEnd = (event) => {
        const itemEl = event.item; const itemId = itemEl.dataset.id; const oldLadeId = itemEl.dataset.ladeId;
        const newUL = event.to; const newVriezerId = newUL.dataset.vriezerId; 
        const ladeContentDiv = newUL.parentElement; const ladeHeaderBtn = ladeContentDiv.previousElementSibling;
        const newLadeId = ladeHeaderBtn.dataset.ladeId; const newLadeNaam = ladeHeaderBtn.dataset.ladeNaam;
        if (oldLadeId === newLadeId) return; 
        itemsCollectieBasis.doc(itemId).update({ vriezerId: newVriezerId, ladeId: newLadeId, ladeNaam: newLadeNaam })
        .then(() => { showFeedback('Item verplaatst!', 'success'); logHistoryAction("Verplaatst", `Item naar ${newLadeNaam}`); })
        .catch((err) => showFeedback(`Fout: ${err.message}`, 'error'));
    };
    lijsten.forEach(lijst => { new Sortable(lijst, { animation: 150, group: 'vriezer-items', handle: '.item-text', ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', onEnd: onDragEnd }); });
}

itemCategorie.addEventListener('change', () => updateEmojiField(itemCategorie, itemEmoji));
editCategorie.addEventListener('change', () => updateEmojiField(editCategorie, editEmoji));
movePurchasedCategorie.addEventListener('change', () => updateEmojiField(movePurchasedCategorie, movePurchasedEmoji));

form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const kanBewerken = (beheerdeUserId === eigenUserId) || (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));
    if (!kanBewerken) { showFeedback("Geen rechten.", "error"); return; }
    
    const vId = vriezerSelect.value; const lId = schuifSelect.value;
    if (!vId || !lId) { showFeedback("Selecteer locatie & lade.", "error"); return; }
    
    const lNaam = schuifSelect.options[schuifSelect.selectedIndex].text;
    const naam = document.getElementById('item-naam').value;
    const emoji = itemEmoji.value || getEmojiForCategory(itemCategorie.value);

    itemsCollectieBasis.add({
        naam: naam, aantal: parseFloat(document.getElementById('item-aantal').value), eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: new Date(itemDatum.value + "T00:00:00"), categorie: itemCategorie.value, emoji: emoji, 
        userId: beheerdeUserId, vriezerId: vId, ladeId: lId, ladeNaam: lNaam 
    })
    .then(() => {
        showFeedback(`'${naam}' toegevoegd!`, 'success');
        if (document.getElementById('remember-drawer-check').checked) {
            document.getElementById('item-naam').value = ''; document.getElementById('item-aantal').value = 1; itemEmoji.value = ""; document.getElementById('item-naam').focus();
        } else {
            form.reset(); itemDatum.value = new Date().toISOString().split('T')[0]; 
            // Reset dropdowns naar correcte waarden voor huidige selectie
            updateFormOptions(vriezerSelect, itemCategorie, itemEenheid);
            itemEmoji.value = ""; document.getElementById('item-aantal').value = 1; 
            vriezerSelect.value = ""; schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een locatie...</option>';
        }
    }).catch(err => showFeedback(err.message, 'error'));
});

vriezerLijstenContainer.addEventListener('click', (e) => {
    if (e.target.closest('.lade-header')) { e.target.closest('.lade-header').parentElement.classList.toggle('collapsed'); return; }
    const kanBewerken = (beheerdeUserId === eigenUserId) || (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));
    if (!kanBewerken && beheerdeUserId !== eigenUserId) return;
    
    const li = e.target.closest('li'); if (!li) return;
    const id = li.dataset.id; const item = alleItems.find(i => i.id === id); if (!item) return;

    if (e.target.closest('.delete-btn')) {
        if (!kanBewerken) { showFeedback("Geen rechten.", "error"); return; }
        if (confirm(`Verwijder '${item.naam}'?`)) {
             if (parseFloat(item.aantal) <= 1 && beheerdeUserId === eigenUserId && confirm("Toevoegen aan boodschappenlijst?")) addShoppingItem(item.naam);
             itemsCollectieBasis.doc(id).delete().then(() => { showFeedback('Verwijderd.', 'success'); logHistoryAction("Verwijderd", item.naam); });
        }
    } else if (e.target.closest('.edit-btn')) {
        if (!kanBewerken) { showFeedback("Geen rechten.", "error"); return; }
        editId.value = id; editNaam.value = item.naam; editAantal.value = item.aantal; 
        editVriezer.innerHTML = ''; 
        alleVriezers.forEach(v => { const opt = document.createElement('option'); opt.value = v.id; opt.textContent = v.naam; if(v.id === item.vriezerId) opt.selected = true; editVriezer.appendChild(opt); });
        
        // Eerst options updaten, dan waarden zetten
        updateFormOptions(editVriezer, editCategorie, editEenheid);
        editEenheid.value = item.eenheid || 'stuks';
        editCategorie.value = item.categorie || 'Geen'; 
        
        editEmoji.value = item.emoji || getEmojiForCategory(item.categorie || 'Geen');
        updateLadeDropdown(item.vriezerId, editSchuif, false); editSchuif.value = item.ladeId;
        editDatum.value = item.ingevrorenOp ? item.ingevrorenOp.toDate().toISOString().split('T')[0] : '';
        showModal(editModal);
    }
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const lNaam = editSchuif.options[editSchuif.selectedIndex].text;
    itemsCollectieBasis.doc(editId.value).update({
        naam: editNaam.value, aantal: parseFloat(editAantal.value), eenheid: editEenheid.value, vriezerId: editVriezer.value,
        ladeId: editSchuif.value, ladeNaam: lNaam, ingevrorenOp: new Date(editDatum.value + "T00:00:00"), categorie: editCategorie.value, emoji: editEmoji.value
    }).then(() => { hideModal(editModal); showFeedback('Bijgewerkt!', 'success'); });
});
btnCancel.addEventListener('click', () => hideModal(editModal));

// --- BEHEER ---
profileVriezerBeheerBtn.addEventListener('click', () => { hideModal(profileModal); showModal(vriezerBeheerModal); laadVriezersBeheer(); });
sluitBeheerKnop.addEventListener('click', () => {
    hideModal(vriezerBeheerModal); if (vriezerBeheerListener) vriezerBeheerListener(); if (ladeBeheerListener) ladeBeheerListener();
    ladeBeheerLijst.innerHTML = ''; addLadeForm.style.display = 'none'; ladesBeheerHr.style.display = 'none'; geselecteerdeVriezerId = null;
});
addVriezerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    vriezersCollectieBasis.add({ naam: document.getElementById('vriezer-naam').value, type: document.getElementById('vriezer-type').value, userId: beheerdeUserId })
    .then(() => { showFeedback("Locatie toegevoegd!", "success"); addVriezerForm.reset(); }).catch(err => showFeedback(err.message, "error"));
});
function laadVriezersBeheer() {
    if (vriezerBeheerListener) vriezerBeheerListener();
    vriezerBeheerListener = vriezersCollectieBasis.where("userId", "==", beheerdeUserId).orderBy("naam").onSnapshot(snapshot => {
        vriezerBeheerLijst.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const v = { id: doc.id, ...doc.data() };
            const typeLabel = v.type ? `(${v.type})` : '(vriezer)';
            const li = document.createElement('li'); li.dataset.id = v.id; li.dataset.naam = v.naam; if(v.id === geselecteerdeVriezerId) li.classList.add('selected');
            li.innerHTML = `<span>${v.naam} <small>${typeLabel}</small></span><input type="text" value="${v.naam}" class="beheer-naam-input"><div class="item-buttons"><button class="edit-btn"><i class="fas fa-pencil-alt"></i></button><button class="delete-btn"><i class="fas fa-trash-alt"></i></button></div>`;
            vriezerBeheerLijst.appendChild(li);
        });
    });
}
addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault(); if (!geselecteerdeVriezerId) return;
    ladesCollectieBasis.add({ naam: document.getElementById('lade-naam').value, vriezerId: geselecteerdeVriezerId, userId: beheerdeUserId })
    .then(() => { showFeedback("Lade toegevoegd!", "success"); addLadeForm.reset(); });
});
function laadLadesBeheer(vriezerId) {
    if (ladeBeheerListener) ladeBeheerListener();
    ladeBeheerLijst.innerHTML = '<i>Laden...</i>';
    ladeBeheerListener = ladesCollectieBasis.where("vriezerId", "==", vriezerId).orderBy("naam").onSnapshot(snapshot => {
        ladeBeheerLijst.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const l = { id: doc.id, ...doc.data() };
            const li = document.createElement('li'); li.dataset.id = l.id; li.dataset.naam = l.naam;
            li.innerHTML = `<span>${l.naam}</span><input type="text" value="${l.naam}" class="beheer-naam-input"><div class="item-buttons"><button class="qr-btn"><i class="fas fa-qrcode"></i></button><button class="edit-btn"><i class="fas fa-pencil-alt"></i></button><button class="delete-btn"><i class="fas fa-trash-alt"></i></button></div>`;
            ladeBeheerLijst.appendChild(li);
        });
    });
}
vriezerBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const vId = li.dataset.id; const vNaam = li.dataset.naam;
    if (e.target.closest('.delete-btn')) handleVerwijderVriezer(vId, vNaam);
    else if (e.target.closest('.edit-btn')) handleHernoem(li, vriezersCollectieBasis);
    else {
        geselecteerdeVriezerId = vId; ladesBeheerTitel.textContent = `Lades voor: ${vNaam}`;
        addLadeForm.style.display = 'grid'; ladesBeheerHr.style.display = 'block';
        document.querySelectorAll('#vriezer-beheer-lijst li').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected'); laadLadesBeheer(vId);
    }
});
ladeBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const id = li.dataset.id; const naam = li.dataset.naam;
    if (e.target.closest('.delete-btn')) handleVerwijderLade(id, naam); else if (e.target.closest('.edit-btn')) handleHernoem(li, ladesCollectieBasis); else if (e.target.closest('.qr-btn')) toonQrCode(id, naam);
});
function handleHernoem(li, col) {
    const input = li.querySelector('.beheer-naam-input'); const btn = li.querySelector('.edit-btn');
    if (li.classList.contains('edit-mode')) { col.doc(li.dataset.id).update({ naam: input.value }).then(() => { li.classList.remove('edit-mode'); btn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; }); } 
    else { li.classList.add('edit-mode'); input.focus(); btn.innerHTML = '<i class="fas fa-save"></i>'; }
}
async function handleVerwijderVriezer(id, naam) {
    const chk = await ladesCollectieBasis.where("vriezerId", "==", id).limit(1).get();
    if (!chk.empty) return showFeedback("Maak locatie eerst leeg.", "error");
    if (confirm(`Verwijder ${naam}?`)) vriezersCollectieBasis.doc(id).delete().then(() => { if(id===geselecteerdeVriezerId) sluitBeheerKnop.click(); showFeedback("Verwijderd", "success"); });
}
async function handleVerwijderLade(id, naam) {
    const chk = await itemsCollectieBasis.where("ladeId", "==", id).limit(1).get();
    if (!chk.empty) return showFeedback("Maak lade eerst leeg.", "error");
    if (confirm(`Verwijder ${naam}?`)) ladesCollectieBasis.doc(id).delete().then(() => showFeedback("Verwijderd", "success"));
}
function toonQrCode(id, naam) {
    const qrUrl = `${window.location.origin}${window.location.pathname}?ladeFilter=${id}`;
    new QRious({ element: qrCanvas, value: qrUrl, size: 250 });
    qrLadeNaam.textContent = naam; showModal(qrModal);
}
btnPrintQr.addEventListener('click', () => window.print());
sluitQrKnop.addEventListener('click', () => hideModal(qrModal));

// --- ACCOUNT & OVERIG ---
switchAccountKnop.addEventListener('click', () => showModal(switchAccountModal));
sluitSwitchAccountKnop.addEventListener('click', () => hideModal(switchAccountModal));
switchTerugKnop.addEventListener('click', () => schakelBeheer(eigenUserId, "Jezelf"));
userSharedLijst.addEventListener('click', (e) => { const li = e.target.closest('li'); if(li) schakelBeheer(li.dataset.id, li.dataset.email); });
if(adminUserLijst) adminUserLijst.addEventListener('click', (e) => { const li = e.target.closest('li'); if(li) schakelBeheer(li.dataset.id, li.dataset.email); });

searchBar.addEventListener('input', updateItemVisibility);
function updateItemVisibility() {
    const term = searchBar.value.toLowerCase();
    document.querySelectorAll('.vriezer-kolom').forEach(kolom => {
        const h2 = kolom.querySelector('h2'); if(!h2) return;
        const vId = alleVriezers.find(v => v.naam === h2.textContent.split('(')[0].trim())?.id; // Split om (X items) te negeren
        if(!vId) return;
        
        const lFilter = document.getElementById(`filter-lade-${vId}`)?.value || 'all';
        const cFilter = document.getElementById(`filter-categorie-${vId}`)?.value || 'all';
        let ladeVisibleCount = {};

        kolom.querySelectorAll('li').forEach(li => {
            const lId = li.dataset.ladeId; const cat = li.dataset.categorie;
            const matchL = (lFilter === 'all' || lFilter === lId);
            const matchC = (cFilter === 'all' || cFilter === cat);
            const matchS = li.querySelector('.item-text strong').textContent.toLowerCase().includes(term);
            if (matchL && matchC && matchS) { li.style.display = 'flex'; ladeVisibleCount[lId] = true; } 
            else { li.style.display = 'none'; }
        });
        kolom.querySelectorAll('.lade-group').forEach(grp => {
            const hasItems = ladeVisibleCount[grp.dataset.ladeId];
            if ((lFilter === 'all' && (hasItems || (term==='' && cFilter==='all'))) || (lFilter === grp.dataset.ladeId)) {
                grp.style.display = 'block';
                if (term !== '' && hasItems) grp.classList.remove('collapsed');
            } else grp.style.display = 'none';
        });
    });
}
btnToggleAlles.addEventListener('click', () => {
    const alle = vriezerLijstenContainer.querySelectorAll('.lade-group');
    if (alle.length===0) return;
    const closed = vriezerLijstenContainer.querySelector('.lade-group.collapsed');
    alle.forEach(l => closed ? l.classList.remove('collapsed') : l.classList.add('collapsed'));
    btnToggleAlles.innerHTML = closed ? '<i class="fas fa-minus-square"></i> Alles Sluiten' : '<i class="fas fa-plus-square"></i> Alles Openen';
});

// Eenheden Beheer Lijst
function renderUnitBeheerLijst() {
    const eenheidBeheerLijst = document.getElementById('eenheid-beheer-lijst'); if(!eenheidBeheerLijst) return;
    eenheidBeheerLijst.innerHTML = '';
    userUnits.forEach(unit => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${unit}</span><div class="item-buttons"><button class="delete-btn" onclick="verwijderEenheid('${unit}')"><i class="fas fa-trash-alt"></i></button></div>`;
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.padding = '8px'; li.style.marginBottom='5px'; li.style.background='#fff'; li.style.border='1px solid #eee';
        eenheidBeheerLijst.appendChild(li);
    });
}
document.getElementById('add-eenheid-form').addEventListener('submit', (e) => {
    e.preventDefault(); const input = document.getElementById('eenheid-naam'); const val = input.value.trim().toLowerCase();
    if(val && !userUnits.includes(val)) {
        const updated = [...userUnits, val].sort();
        usersCollectie.doc(eigenUserId).update({ customUnits: updated }).then(() => { input.value=''; showFeedback("Toegevoegd", "success"); });
    }
});
window.verwijderEenheid = function(unit) {
    if(beheerdeUserId !== eigenUserId) return showFeedback("Alleen eigen account.", "error");
    if(!confirm(`Verwijder '${unit}'?`)) return;
    const updated = userUnits.filter(u => u !== unit);
    usersCollectie.doc(eigenUserId).update({ customUnits: updated });
};

// Rest van de knoppen en logica (zoals eerder gedefinieerd)
printBtn.addEventListener('click', () => { hideModal(profileModal); window.print(); });
logoutBtn.addEventListener('click', () => { if(confirm("Uitloggen?")) auth.signOut(); });
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => { const e = prompt("EAN:"); if(e) fetchProductFromOFF(e.trim()); });
form.addEventListener('click', handleAantalKlik); editModal.addEventListener('click', handleAantalKlik); movePurchasedModal.addEventListener('click', handleAantalKlik);
profileBtn.addEventListener('click', () => showModal(profileModal)); sluitProfileModalKnop.addEventListener('click', () => hideModal(profileModal));
exportDataBtn.addEventListener('click', () => {
    const data = JSON.stringify({ vriezers: alleVriezers, lades: alleLades, items: alleItems.map(i => ({...i, ingevrorenOp: i.ingevrorenOp?.toDate().toISOString()})) }, null, 2);
    const blob = new Blob([data], {type:'application/json'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
});
function checkHoudbaarheidNotificaties() {
    const DAGEN_OUD = 180; const oudeItems = alleItems.filter(item => { if (!item.ingevrorenOp) return false; return Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24)) > DAGEN_OUD; });
    if (oudeItems.length > 0) {
        notificatieLijst.innerHTML = ''; oudeItems.slice(0, 5).forEach(item => { const li = document.createElement('li'); const dagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24)); li.textContent = `${item.naam} (${item.ladeNaam}) - ${dagen} dagen oud`; notificatieLijst.appendChild(li); }); showModal(notificatieModal);
    }
}
sluitNotificatieKnop.addEventListener('click', () => hideModal(notificatieModal));
profileShareBtn.addEventListener('click', () => { hideModal(profileModal); showModal(shareModal); startSharesOwnerListener(); });
sluitShareKnop.addEventListener('click', () => hideModal(shareModal));
shareInviteForm.addEventListener('submit', (e) => { e.preventDefault(); sharesCollectie.add({ ownerId: eigenUserId, ownerEmail: currentUser.email, sharedWithEmail: document.getElementById('share-email').value, role: document.getElementById('share-role').value, status: 'pending' }).then(() => { showFeedback("Uitgenodigd!", "success"); shareInviteForm.reset(); }); });
shareHuidigeLijst.addEventListener('click', (e) => { if(e.target.closest('.delete-btn')) sharesCollectie.doc(e.target.closest('li').dataset.id).delete(); });
sluitAcceptShareKnop.addEventListener('click', () => hideModal(acceptShareModal));
acceptShareLijst.addEventListener('click', (e) => { const btn = e.target.closest('button'); if(!btn) return; const id = btn.closest('li').dataset.id; if(btn.dataset.action === 'accept') sharesCollectie.doc(id).update({ status: 'accepted', sharedWithId: eigenUserId }); else sharesCollectie.doc(id).delete(); });
profileShoppingListBtn.addEventListener('click', () => { hideModal(profileModal); showModal(shoppingListModal); });
sluitShoppingListKnop.addEventListener('click', () => hideModal(shoppingListModal));
function startShoppingListListener() { if (shoppingListListener) shoppingListListener(); shoppingListListener = shoppingListCollectie.where("userId", "==", eigenUserId).orderBy("createdAt", "desc").onSnapshot(snap => { shoppingListUl.innerHTML = ''; snap.docs.forEach(doc => { const i = {id: doc.id, ...doc.data()}; const li = document.createElement('li'); li.dataset.id = i.id; li.dataset.naam = i.naam; if(i.checked) li.classList.add('checked'); li.innerHTML = `<input type="checkbox" class="shopping-item-checkbox" ${i.checked?'checked':''}><span class="shopping-item-name">${i.naam}</span><div class="item-buttons"><button class="btn-purchased"><i class="fas fa-check"></i></button><button class="delete-btn"><i class="fas fa-trash-alt"></i></button></div>`; shoppingListUl.appendChild(li); }); }); }
addShoppingItemForm.addEventListener('submit', (e) => { e.preventDefault(); addShoppingItem(shoppingItemNaam.value); shoppingItemNaam.value=''; });
async function addShoppingItem(naam) { shoppingListCollectie.add({ userId: eigenUserId, naam: naam, checked: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
shoppingListUl.addEventListener('click', (e) => { const li = e.target.closest('li'); if(!li) return; if(e.target.classList.contains('shopping-item-checkbox')) shoppingListCollectie.doc(li.dataset.id).update({ checked: e.target.checked }); else if(e.target.closest('.delete-btn')) shoppingListCollectie.doc(li.dataset.id).delete(); else if(e.target.closest('.btn-purchased')) { movePurchasedTempId.value = li.dataset.id; movePurchasedItemNaam.value = li.dataset.naam; movePurchasedNaamSpan.textContent = li.dataset.naam; movePurchasedVriezer.innerHTML = vriezerSelect.innerHTML; hideModal(shoppingListModal); showModal(movePurchasedModal); } });
clearCheckedShoppingItemsBtn.addEventListener('click', async () => { const q = await shoppingListCollectie.where("userId", "==", eigenUserId).where("checked", "==", true).get(); const b = db.batch(); q.docs.forEach(d => b.delete(d.ref)); b.commit(); });
movePurchasedForm.addEventListener('submit', (e) => { e.preventDefault(); const lNaam = movePurchasedLade.options[movePurchasedLade.selectedIndex].text; itemsCollectieBasis.add({ naam: movePurchasedItemNaam.value, aantal: parseFloat(movePurchasedAantal.value), eenheid: movePurchasedEenheid.value, vriezerId: movePurchasedVriezer.value, ladeId: movePurchasedLade.value, ladeNaam: lNaam, userId: eigenUserId, ingevrorenOp: new Date(), categorie: movePurchasedCategorie.value, emoji: movePurchasedEmoji.value }).then(() => shoppingListCollectie.doc(movePurchasedTempId.value).delete()).then(() => { showFeedback("Opgeborgen!", "success"); hideModal(movePurchasedModal); movePurchasedForm.reset(); }); });
movePurchasedVriezer.addEventListener('change', () => { updateLadeDropdown(movePurchasedVriezer.value, movePurchasedLade, true); updateFormOptions(movePurchasedVriezer, movePurchasedCategorie, movePurchasedEenheid); });
btnCancelMovePurchased.addEventListener('click', () => { hideModal(movePurchasedModal); showModal(shoppingListModal); });
profileWeekmenuBtn.addEventListener('click', () => { hideModal(profileModal); if(!weekmenuDatumInput.value) weekmenuDatumInput.value=new Date().toISOString().split('T')[0]; showModal(weekmenuModal); });
sluitWeekmenuKnop.addEventListener('click', () => hideModal(weekmenuModal));
function startWeekMenuListener() { if (weekMenuListener) weekMenuListener(); weekMenuListener = weekMenuCollectie.where("userId", "==", eigenUserId).orderBy("datum", "asc").onSnapshot(snap => { weekmenuListUl.innerHTML = ''; if (snap.empty) { weekmenuListUl.innerHTML = '<li><i>Niets gepland.</i></li>'; return; } snap.docs.forEach(doc => { const item = {id: doc.id, ...doc.data()}; const li = document.createElement('li'); const datumKort = new Date(item.datum).toLocaleDateString('nl-BE', { weekday: 'short', day: '2-digit', month: '2-digit' }); let linkHtml = ''; if (item.link) { linkHtml = `<a href="${item.link}" target="_blank" class="btn-purchased" style="background-color:#4A90E2; text-decoration:none;"><i class="fas fa-link"></i></a>`; } li.innerHTML = `<div style="display:flex; flex-direction:column; width: 100%;"><small style="color:#888; font-weight:bold;">${datumKort}</small><span class="shopping-item-name">${item.gerecht}</span></div><div class="item-buttons">${linkHtml}<button class="delete-btn"><i class="fas fa-trash-alt"></i></button></div>`; li.querySelector('.delete-btn').addEventListener('click', () => weekMenuCollectie.doc(item.id).delete()); weekmenuListUl.appendChild(li); }); }); }
addWeekmenuForm.addEventListener('submit', (e) => { e.preventDefault(); weekMenuCollectie.add({ userId: eigenUserId, datum: weekmenuDatumInput.value, gerecht: weekmenuGerechtInput.value, link: weekmenuLinkInput.value || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { showFeedback("Ingepland!", "success"); weekmenuGerechtInput.value = ''; weekmenuLinkInput.value = ''; }); });
clearOldWeekmenuBtn.addEventListener('click', async () => { const vandaag = new Date().toISOString().split('T')[0]; const q = await weekMenuCollectie.where("userId", "==", eigenUserId).where("datum", "<", vandaag).get(); const b = db.batch(); q.docs.forEach(d => b.delete(d.ref)); b.commit(); showFeedback("Oude items verwijderd.", "success"); });
profileHistoryBtn.addEventListener('click', () => { hideModal(profileModal); showModal(historyModal); startHistoryListener(); });
sluitHistoryKnop.addEventListener('click', () => hideModal(historyModal));
function startHistoryListener() { if (historyListener) historyListener(); historyListener = historyCollectie.where("userId", "==", eigenUserId).orderBy("timestamp", "desc").limit(50).onSnapshot(snap => { historyListUl.innerHTML = ''; if (snap.empty) { historyListUl.innerHTML = '<li><i>Geen geschiedenis.</i></li>'; return; } snap.docs.forEach(doc => { const data = doc.data(); const time = data.timestamp ? data.timestamp.toDate().toLocaleString('nl-BE') : '?'; const li = document.createElement('li'); li.innerHTML = `<div class="user-info"><span>${data.actie}: ${data.details}</span><small>${time}</small></div>`; historyListUl.appendChild(li); }); }); }
function logHistoryAction(a, d) { historyCollectie.add({ userId: eigenUserId, actie: a, details: d, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); }
btnClearHistory.addEventListener('click', async () => { if(!confirm("Geschiedenis wissen?")) return; const q = await historyCollectie.where("userId", "==", eigenUserId).get(); const b = db.batch(); q.docs.forEach(d => b.delete(d.ref)); b.commit(); });
function renderBulkDropdowns() { bulkTargetVriezer.innerHTML = vriezerSelect.innerHTML; bulkTargetVriezer.value = ""; bulkTargetLade.innerHTML = '<option disabled selected>Kies eerst locatie...</option>'; }
bulkTargetVriezer.addEventListener('change', () => updateLadeDropdown(bulkTargetVriezer.value, bulkTargetLade, true));
btnToggleMode.addEventListener('click', () => { isMoveMode = !isMoveMode; if(isMoveMode) { document.body.classList.add('move-mode'); bulkActionBar.classList.add('visible'); btnToggleMode.classList.add('active'); btnToggleMode.innerHTML = '<i class="fas fa-times"></i> Stop Modus'; selectedItemIds.clear(); } else { document.body.classList.remove('move-mode'); bulkActionBar.classList.remove('visible'); btnToggleMode.classList.remove('active'); btnToggleMode.innerHTML = '<i class="fas fa-bolt"></i> Verplaatsmodus'; document.querySelectorAll('.bulk-checkbox').forEach(c => c.checked = false); } });
btnBulkMove.addEventListener('click', async () => { if(selectedItemIds.size === 0 || !bulkTargetVriezer.value || !bulkTargetLade.value) { return showFeedback("Selecteer items en doel.", "error"); } const ln = bulkTargetLade.options[bulkTargetLade.selectedIndex].text; const b = db.batch(); selectedItemIds.forEach(id => { b.update(itemsCollectieBasis.doc(id), { vriezerId: bulkTargetVriezer.value, ladeId: bulkTargetLade.value, ladeNaam: ln }); }); await b.commit(); showFeedback("Verplaatst!", "success"); btnToggleMode.click(); logHistoryAction("Bulk Verplaatsing", `${selectedItemIds.size} items`); });
