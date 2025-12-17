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
const itemsCollectieBasis = db.collection('items');
const ladesCollectieBasis = db.collection('lades');
const vriezersCollectieBasis = db.collection('vriezers');
const usersCollectie = db.collection('users');
const adminsCollectie = db.collection('admins');
const sharesCollectie = db.collection('shares');
const shoppingListCollectie = db.collection('shoppingList'); // Boodschappenlijst
const weekMenuCollectie = db.collection('weekmenu');
// NIEUW: Geschiedenis collectie
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
const defaultUnits = [
    "stuks", "zak", "boterpot", "ijsdoos", 
    "Ikea doos 600ml", "iglodoos 450ml", 
    "iglodoos 1l laag", "iglodoos 1l hoog", 
    "gram", "kilo", "bakje", "portie"
];

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

// Admin & Data Scheiding
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null; 
let alleAcceptedShares = [];

// Notificatie vlag
let isEersteNotificatieCheck = true;

// Bulk Selectie Variabelen
let isMoveMode = false;
let selectedItemIds = new Set();

// --- Snelkoppelingen naar elementen ---
const form = document.getElementById('add-item-form');
const vriezerSelect = document.getElementById('item-vriezer'); 
const schuifSelect = document.getElementById('item-schuif'); 
const itemDatum = document.getElementById('item-datum');
const itemCategorie = document.getElementById('item-categorie');
const itemEmoji = document.getElementById('item-emoji');
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

// Wissel Account Modal Elementen
const switchAccountKnop = document.getElementById('switch-account-knop');
const switchAccountModal = document.getElementById('switch-account-modal');
const sluitSwitchAccountKnop = document.getElementById('btn-sluit-switch-account');
const adminUserLijst = document.getElementById('admin-user-lijst');
const userSharedLijst = document.getElementById('user-shared-lijst');
const adminSwitchSection = document.getElementById('admin-switch-section');
const userSwitchSection = document.getElementById('user-switch-section');
const switchAccountTitel = document.getElementById('switch-account-titel');
const switchTerugKnop = document.getElementById('switch-terug-knop');

// Profiel Modal Elementen
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

// Nieuwe Profiel Knoppen
const exportDataBtn = document.getElementById('export-data-btn');
const profileShareBtn = document.getElementById('profile-share-btn');
const profileHistoryBtn = document.getElementById('profile-history-btn'); 

// Notificatie Modal Elementen
const notificatieModal = document.getElementById('notificatie-modal');
const notificatieLijst = document.getElementById('notificatie-lijst');
const sluitNotificatieKnop = document.getElementById('btn-sluit-notificatie');

// Deel Modal Elementen
const shareModal = document.getElementById('share-modal');
const sluitShareKnop = document.getElementById('btn-sluit-share');
const shareInviteForm = document.getElementById('share-invite-form');
const shareHuidigeLijst = document.getElementById('share-huidige-lijst');

// Acceptatie Modal Elementen
const acceptShareModal = document.getElementById('accept-share-modal');
const acceptShareLijst = document.getElementById('accept-share-lijst');
const sluitAcceptShareKnop = document.getElementById('btn-sluit-accept-share');

// Boodschappenlijst Modal Elementen
const shoppingListModal = document.getElementById('shopping-list-modal');
const sluitShoppingListKnop = document.getElementById('btn-sluit-shopping-list');
const addShoppingItemForm = document.getElementById('add-shopping-item-form');
const shoppingItemNaam = document.getElementById('shopping-item-naam');
const shoppingListUl = document.getElementById('shopping-list');
const clearCheckedShoppingItemsBtn = document.getElementById('btn-clear-checked-shopping-items');

// Weekmenu Elementen
const profileWeekmenuBtn = document.getElementById('profile-weekmenu-btn');
const weekmenuModal = document.getElementById('weekmenu-modal');
const sluitWeekmenuKnop = document.getElementById('btn-sluit-weekmenu');
const addWeekmenuForm = document.getElementById('add-weekmenu-form');
const weekmenuDatumInput = document.getElementById('weekmenu-datum');
const weekmenuGerechtInput = document.getElementById('weekmenu-gerecht');
const weekmenuLinkInput = document.getElementById('weekmenu-link');
const weekmenuListUl = document.getElementById('weekmenu-list');
const clearOldWeekmenuBtn = document.getElementById('btn-clear-old-weekmenu');

// Geschiedenis (Logboek) Elementen
const historyModal = document.getElementById('history-modal');
const sluitHistoryKnop = document.getElementById('btn-sluit-history');
const historyListUl = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');

// Bulk Actie Elementen
const btnToggleMode = document.getElementById('btn-toggle-mode');
const bulkActionBar = document.getElementById('bulk-action-bar');
const bulkCountSpan = document.getElementById('bulk-count');
const btnBulkMove = document.getElementById('btn-bulk-move');
const bulkTargetVriezer = document.getElementById('bulk-target-vriezer');
const bulkTargetLade = document.getElementById('bulk-target-lade');

// QR Code Modal Elementen
const qrModal = document.getElementById('qr-modal');
const sluitQrKnop = document.getElementById('btn-sluit-qr');
const qrCanvas = document.getElementById('qr-canvas');
const qrLadeNaam = document.getElementById('qr-lade-naam');
const btnPrintQr = document.getElementById('btn-print-qr');

// Slimmer Gekocht (Move Purchased) Elementen
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


// ---
// HELPER FUNCTIES (Modal & Aantal)
// ---
function showModal(modalElement) {
    if (modalElement) {
        modalElement.classList.add('show');
    }
}
function hideModal(modalElement) {
    if (modalElement) {
        modalElement.classList.remove('show');
    }
}

function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback';
    feedbackMessage.classList.add(type);
    feedbackMessage.classList.add('show');
    setTimeout(() => {
        feedbackMessage.classList.remove('show');
    }, 3000);
}
function formatAantal(aantal, eenheid) {
    if (!eenheid || eenheid === 'stuks') return `${aantal}x`;
    if (eenheid === 'zak') {
        if (aantal === 1) return "1 zak";
        if (aantal === 0.75) return "3/4 zak";
        if (aantal === 0.5) return "1/2 zak";
        if (aantal === 0.25) return "1/4 zak";
        if (aantal > 1 && (aantal % 1 === 0)) return `${aantal} zakken`;
        return `${aantal} zakken`;
    }
    return `${aantal} ${eenheid}`;
}
function formatDatum(timestamp) {
    if (!timestamp) return 'Onbekende datum';
    return timestamp.toDate().toLocaleDateString('nl-BE');
}
// Helper voor Emoji's
function getEmojiForCategory(categorie) {
    const emojis = {
        "Vlees": "🥩",
        "Vis": "🐟",
        "Groenten": "🥦",
        "Fruit": "🍎",
        "Brood": "🍞",
        "IJs": "🍦",
        "Restjes": "🥡",
        "Saus": "🥫",
        "Friet": "🍟",
        "Ander": "📦",
        "Geen": "❄️"
    };
    return emojis[categorie] || "❄️";
}

// Functie om emoji veld te updaten bij categorie change
function updateEmojiField(selectElement, inputElement) {
    const cat = selectElement.value;
    const emoji = getEmojiForCategory(cat);
    // Vul alleen in als het veld leeg is of als de gebruiker dit waarschijnlijk verwacht
    inputElement.value = emoji;
}

// Helper voor Aantal Knoppen (UX)
function handleAantalKlik(e) {
    const target = e.target.closest('.aantal-btn');
    if (!target) return;

    const wrapper = target.parentElement;
    const input = wrapper.querySelector('input[type="number"]');
    if (!input) return;

    const action = target.dataset.action;
    const step = parseFloat(input.step) || 1;
    let currentValue = parseFloat(input.value) || 0;

    if (action === 'plus') {
        currentValue += step;
    } else if (action === 'minus') {
        currentValue -= step;
    }
    
    const min = parseFloat(input.min) || 0;
    if (currentValue < min) {
        currentValue = min;
    }

    input.value = currentValue;
}


// --- Scanner functies ---
function startScanner() {
    html5QrCode = new Html5Qrcode(scannerContainerId);
    showModal(scanModal);
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 150 }
        },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.log("Scanner kon niet starten:", err);
        showFeedback("Camera niet gevonden of geen toestemming.", "error");
        sluitScanner();
    });
}
function sluitScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            console.log("Scanner gestopt.");
            hideModal(scanModal);
        }).catch(err => {
            console.log("Fout bij stoppen scanner:", err);
            hideModal(scanModal);
        });
    } else {
        hideModal(scanModal);
    }
}
// *** QR Code ondersteuning ***
function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan succesvol: ${decodedText}`);
    sluitScanner();
    
    if (decodedText.includes("ladeFilter=")) {
        try {
            const url = new URL(decodedText);
            const ladeId = url.searchParams.get("ladeFilter");
            if (ladeId) {
                const gevondenLade = alleLades.find(l => l.id === ladeId);
                
                if (gevondenLade) {
                    showFeedback(`Lade gescand: ${gevondenLade.naam}`, "success");
                    const vriezerId = gevondenLade.vriezerId;
                    
                    searchBar.value = "";
                    
                    const filterSelect = document.getElementById(`filter-lade-${vriezerId}`);
                    if (filterSelect) {
                        filterSelect.value = ladeId;
                        updateItemVisibility();
                        
                        const kolom = filterSelect.closest('.vriezer-kolom');
                        if (kolom) {
                            kolom.scrollIntoView({ behavior: 'smooth' });
                            const ladeGroup = kolom.querySelector(`.lade-group[data-lade-id="${ladeId}"]`);
                            if (ladeGroup) ladeGroup.classList.remove('collapsed');
                        }
                    }
                } else {
                     showFeedback("Lade niet gevonden in huidige account.", "error");
                }
            }
        } catch (e) {
            console.error("Fout bij parsen QR URL:", e);
        }
    } else {
        fetchProductFromOFF(decodedText);
    }
}
function onScanFailure(error) {
    // console.warn(`Scanfout: ${error}`);
}
async function fetchProductFromOFF(ean) {
    if (!ean || ean.length < 8) {
        showFeedback("Ongeldige EAN code gescand.", "error");
        return;
    }
    console.log("Product opzoeken voor EAN:", ean);
    const url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 1 && data.product && data.product.product_name) {
            const productName = data.product.product_name;
            console.log("Product gevonden:", productName);
            document.getElementById('item-naam').value = productName;
            showFeedback(`Product gevonden: ${productName}`, "success");
        } else {
            console.log("Geen product gevonden voor EAN:", ean);
            showFeedback("Product niet gevonden in database.", "error");
        }
    } catch (error) {
        console.error("Fout bij ophalen productinfo:", error);
        showFeedback("Fout bij ophalen productinfo.", "error");
    }
}


// ---
// STAP 2: AUTHENTICATIE & INITIALISATIE
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.email);
        currentUser = user;
        eigenUserId = user.uid; 
        
        beheerdeUserId = user.uid;
        beheerdeUserEmail = user.email || "Jezelf";
        isEersteNotificatieCheck = true; 
        alleAcceptedShares = [];

        registreerGebruiker(user);
        checkAdminStatus(user.uid);
        
        // Profiel Knop & Modal Info Instellen
        const userPhoto = user.photoURL;
        const userEmail = user.email || 'Geen e-mailadres';
        
        if (userPhoto) {
            profileImg.src = userPhoto;
            profileImg.style.display = 'block';
            profileIcon.style.display = 'none';
            profileModalImg.src = userPhoto;
            profileModalImg.style.display = 'block';
            profileModalIcon.style.display = 'none';
        } else {
            profileImg.src = '';
            profileImg.style.display = 'none';
            profileIcon.style.display = 'block';
            profileModalImg.src = '';
            profileModalImg.style.display = 'none';
            profileModalIcon.style.display = 'block';
        }
        profileEmailEl.textContent = userEmail;

        // Zet datumveld op vandaag
        const vandaag = new Date().toISOString().split('T')[0];
        itemDatum.value = vandaag;

        // Start de data listeners
        startAlleDataListeners();
        startPendingSharesListener();
        
        // Check voor QR URL parameters bij laden (als de pagina opent via QR scan)
        checkUrlForLadeFilter();

    } else {
        // --- UITLOGGEN ---
        currentUser = null;
        eigenUserId = null;
        beheerdeUserId = null;
        isAdmin = false;
        
        stopAlleDataListeners(); 
        console.log("Niet ingelogd, terug naar index.html");
        
        // UI leegmaken
        vriezerLijstenContainer.innerHTML = '';
        dashboard.innerHTML = '';
        vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
        schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        
        // Knoppen resetten/verbergen
        switchAccountKnop.style.display = 'none';
        hideModal(switchAccountModal);
        
        // Profiel Knop Resetten
        profileImg.src = '';
        profileImg.style.display = 'none';
        profileIcon.style.display = 'block';
        profileEmailEl.textContent = '';
        profileModalImg.src = '';
        profileModalImg.style.display = 'none';
        profileModalIcon.style.display = 'block';
        
        window.location.replace('index.html');
    }
});

// AANGEPASTE LOGICA VOOR QR FILTER
function checkUrlForLadeFilter() {
    // Haal de query string parameters op
    const urlParams = new URLSearchParams(window.location.search);
    const ladeId = urlParams.get('ladeFilter');
    
    if (ladeId) {
        console.log("QR Filter gevonden in URL:", ladeId);
        // Sla de lade ID op in een globale variabele om te gebruiken zodra de data geladen is
        window.pendingLadeFilter = ladeId;
    }
}

async function registreerGebruiker(user) {
    try {
        await usersCollectie.doc(user.uid).set({
            email: user.email || 'Onbekend',
            displayName: user.displayName || user.email,
            laatstGezien: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); 
    } catch (err) {
        console.warn("Kon gebruiker niet registreren in 'users' collectie:", err.message);
    }
}

async function checkAdminStatus(uid) {
    try {
        const adminDoc = await adminsCollectie.doc(uid).get();
        if (adminDoc.exists) {
            console.log("ADMIN STATUS: Ja");
            isAdmin = true;
            
            switchAccountKnop.style.display = 'inline-flex';
            adminSwitchSection.style.display = 'block';
            userSwitchSection.style.display = 'none';
            
            startAdminUserListener();
            
        } else {
            console.log("ADMIN STATUS: Nee");
            isAdmin = false;
            
            adminSwitchSection.style.display = 'none';
            userSwitchSection.style.display = 'block';
            
            startAcceptedSharesListener();
        }
    } catch (err) {
        console.error("Fout bij checken admin status:", err);
        isAdmin = false;
        switchAccountKnop.style.display = 'none';
    }
    updateSwitchAccountUI();
}

function schakelBeheer(naarUserId, naarUserEmail) {
    if (beheerdeUserId === naarUserId) return; 

    console.log(`Schakelen van beheer... Naar: ${naarUserId}`);
    beheerdeUserId = naarUserId;
    beheerdeUserEmail = naarUserEmail || 'Onbekende Gebruiker';
    isEersteNotificatieCheck = true; 

    stopAlleDataListeners(); 

    vriezerLijstenContainer.innerHTML = '';
    dashboard.innerHTML = '';
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
    
    startAlleDataListeners();
    
    updateSwitchAccountUI();
    
    hideModal(switchAccountModal);
    showFeedback(`Je beheert nu de vriezers van: ${beheerdeUserEmail}`, 'success');
}

function updateSwitchAccountUI() {
    if (beheerdeUserId === eigenUserId) {
        switchAccountTitel.textContent = 'Je beheert je eigen vriezers.';
        switchAccountTitel.style.color = '#555';
        switchTerugKnop.style.display = 'none';
        
        startPendingSharesListener();
        if(isAdmin) startAdminUserListener();
        else startAcceptedSharesListener();
        startShoppingListListener(); 
        
    } else {
        switchAccountTitel.textContent = `LET OP: Je beheert nu de vriezers van ${beheerdeUserEmail}!`;
        switchAccountTitel.style.color = '#FF6B6B';
        switchTerugKnop.style.display = 'block';
        
        if (pendingSharesListener) pendingSharesListener();
        if (acceptedSharesListener) acceptedSharesListener();
        if (shoppingListListener) shoppingListListener(); 
    }
}

// ---
// STAP 3: DATA LISTENERS
// ---
function startAlleDataListeners() {
    if (!beheerdeUserId) return; 
    console.log(`Start listeners voor: ${beheerdeUserId}`);
    
    stopAlleDataListeners(); 

    // Listener voor User Settings (Eenheden)
    usersCollectie.doc(beheerdeUserId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.customUnits && Array.isArray(data.customUnits)) {
                userUnits = data.customUnits;
            } else {
                userUnits = [...defaultUnits];
                if (beheerdeUserId === eigenUserId) {
                    usersCollectie.doc(eigenUserId).set({ customUnits: defaultUnits }, { merge: true });
                }
            }
        } else {
            userUnits = [...defaultUnits];
        }
        renderUnitDropdowns(); 
        renderUnitBeheerLijst(); 
    });
    // 1. Vriezers Listener
    vriezersListener = vriezersCollectieBasis
        .where('userId', '==', beheerdeUserId)
        .orderBy('naam')
        .onSnapshot((snapshot) => {
            alleVriezers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Vriezers geladen:", alleVriezers.length);
            vulToevoegVriezerDropdown();
            renderBulkDropdowns();
            renderDynamischeLijsten(); 
        }, (err) => console.error("Fout bij vriezers listener:", err.message));

    // 2. Lades Listener
    ladesListener = ladesCollectieBasis
        .where('userId', '==', beheerdeUserId)
        .orderBy('naam')
        .onSnapshot((snapshot) => {
            alleLades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Lades geladen:", alleLades.length);
            updateLadeDropdown(vriezerSelect.value, schuifSelect, false); 
            renderDynamischeLijsten(); 
        }, (err) => console.error("Fout bij lades listener:", err.message));

    // 3. Items Listener
    itemsListener = itemsCollectieBasis
        .where("userId", "==", beheerdeUserId)
        .onSnapshot((snapshot) => {
            alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Items geladen:", alleItems.length);
            renderDynamischeLijsten(); 
            updateDashboard(); 
            
            if (isEersteNotificatieCheck && alleItems.length > 0 && beheerdeUserId === eigenUserId) {
                checkHoudbaarheidNotificaties();
                isEersteNotificatieCheck = false; 
            }
        }, (error) => {
            console.error("Fout bij ophalen items: ", error);
            showFeedback(error.message, "error");
        });
        
    // 4. Start boodschappenlijst listener (alleen als we onszelf beheren)
    if (beheerdeUserId === eigenUserId) {
        startShoppingListListener();
        startWeekMenuListener();
    }
}

function stopAlleDataListeners() {
    console.log("Stoppen alle data/share listeners...");
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

function startAdminUserListener() {
    if (userListListener) userListListener(); 
    
    userListListener = usersCollectie.orderBy("email")
        .onSnapshot((snapshot) => {
            adminUserLijst.innerHTML = ''; 
            snapshot.docs.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                if (user.id === eigenUserId) return; 

                const li = document.createElement('li');
                li.dataset.id = user.id;
                li.dataset.email = user.email || user.displayName;
                
                li.innerHTML = `
                    <div class="user-info">
                        <span>${user.displayName || user.email}</span>
                        <small>${user.email}</small>
                    </div>
                `;
                
                li.addEventListener('click', () => {
                    schakelBeheer(li.dataset.id, li.dataset.email);
                });
                
                adminUserLijst.appendChild(li);
            });
        }, (err) => console.error("Fout bij laden gebruikerslijst:", err.message));
}

function startAcceptedSharesListener() {
    if (acceptedSharesListener) acceptedSharesListener();
    
    acceptedSharesListener = sharesCollectie
        .where("sharedWithId", "==", eigenUserId)
        .where("status", "==", "accepted")
        .onSnapshot((snapshot) => {
            alleAcceptedShares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Geaccepteerde shares:", alleAcceptedShares.length);
            
            userSharedLijst.innerHTML = '';
            if (alleAcceptedShares.length > 0) {
                if (!isAdmin) {
                    switchAccountKnop.style.display = 'inline-flex';
                }
                alleAcceptedShares.forEach(share => {
                    const li = document.createElement('li');
                    li.dataset.id = share.ownerId;
                    li.dataset.email = share.ownerEmail;
                    
                    li.innerHTML = `
                        <div class="user-info">
                            <span>${share.ownerEmail}</span>
                            <small>Rol: ${share.role}</small>
                        </div>
                    `;
                    li.addEventListener('click', () => {
                        schakelBeheer(li.dataset.id, li.dataset.email);
                    });
                    userSharedLijst.appendChild(li);
                });
            } else {
                if (!isAdmin) {
                    switchAccountKnop.style.display = 'none';
                }
                userSharedLijst.innerHTML = '<li><i>Niemand heeft vriezers met jou gedeeld.</i></li>';
            }
        }, (err) => console.error("Fout bij laden accepted shares:", err.message));
}

function startPendingSharesListener() {
    if (pendingSharesListener) pendingSharesListener();
    
    pendingSharesListener = sharesCollectie
        .where("sharedWithEmail", "==", currentUser.email)
        .where("status", "==", "pending")
        .onSnapshot((snapshot) => {
            const pendingShares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Pending shares:", pendingShares.length);
            
            acceptShareLijst.innerHTML = '';
            if (pendingShares.length > 0) {
                pendingShares.forEach(share => {
                    const li = document.createElement('li');
                    li.dataset.id = share.id;
                    li.innerHTML = `
                        <div class="invite-info">
                            <strong>${share.ownerEmail}</strong>
                            <small>wil vriezers met je delen (Rol: ${share.role}).</small>
                        </div>
                        <div class="invite-buttons">
                            <button class="btn-accept" data-action="accept">Accepteren</button>
                            <button class="btn-decline" data-action="decline">Weigeren</button>
                        </div>
                    `;
                    acceptShareLijst.appendChild(li);
                });
                showModal(acceptShareModal);
            } else {
                hideModal(acceptShareModal);
            }
        }, (err) => console.error("Fout bij laden pending shares:", err.message));
}

function startSharesOwnerListener() {
    if (sharesOwnerListener) sharesOwnerListener();
    
    shareHuidigeLijst.innerHTML = '<li><i>Laden...</i></li>';
    sharesOwnerListener = sharesCollectie
        .where("ownerId", "==", eigenUserId)
        .onSnapshot((snapshot) => {
            const ownerShares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            shareHuidigeLijst.innerHTML = '';
            
            if (ownerShares.length > 0) {
                ownerShares.forEach(share => {
                    const li = document.createElement('li');
                    li.dataset.id = share.id;
                    li.innerHTML = `
                        <div class="user-info">
                            <span>${share.sharedWithEmail}</span>
                            <small>Status: ${share.status} (Rol: ${share.role})</small>
                        </div>
                        <div class="item-buttons">
                            <button class="delete-btn" title="Delen stoppen"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    `;
                    shareHuidigeLijst.appendChild(li);
                });
            } else {
                shareHuidigeLijst.innerHTML = '<li><i>Je deelt je vriezers nog met niemand.</i></li>';
            }
        }, (err) => console.error("Fout bij laden owner shares:", err.message));
}


// ---
// STAP 4: UI RENDERING (Dropdowns & Lijsten)
// ---
function vulToevoegVriezerDropdown() {
    const geselecteerdeId = vriezerSelect.value;
    vriezerSelect.innerHTML = '<option value="" disabled>Kies een vriezer...</option>';
    alleVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam; 
        vriezerSelect.appendChild(option);
    });
    
    if (geselecteerdeId && alleVriezers.some(v => v.id === geselecteerdeId)) {
        vriezerSelect.value = geselecteerdeId;
    } else {
        vriezerSelect.value = ""; 
    }
    updateLadeDropdown(vriezerSelect.value, schuifSelect, false);
}

vriezerSelect.addEventListener('change', () => {
    updateLadeDropdown(vriezerSelect.value, schuifSelect, true);
});

function updateLadeDropdown(vriezerId, ladeSelectElement, resetSelectie) {
    const geselecteerdeLadeId = resetSelectie ? "" : ladeSelectElement.value;
    
    ladeSelectElement.innerHTML = '<option value="" disabled>Kies een schuif...</option>';
    if (!vriezerId) {
        ladeSelectElement.innerHTML = '<option value="" disabled>Kies eerst vriezer...</option>';
        ladeSelectElement.value = "";
        return;
    }
    
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === vriezerId);
    gefilterdeLades.sort((a, b) => a.naam.localeCompare(b.naam));
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id; 
        option.textContent = lade.naam; 
        ladeSelectElement.appendChild(option);
    });
    
    if (geselecteerdeLadeId && gefilterdeLades.some(l => l.id === geselecteerdeLadeId)) {
        ladeSelectElement.value = geselecteerdeLadeId;
    } else {
        ladeSelectElement.value = ""; 
    }
}

// *** renderDynamischeLijsten ***
function renderDynamischeLijsten() {
    
    const openLadeIds = new Set();
    document.querySelectorAll('.lade-group:not(.collapsed)').forEach(group => {
        openLadeIds.add(group.dataset.ladeId);
    });
    
    if (window.pendingLadeFilter) {
        console.log("Pending filter actief in render:", window.pendingLadeFilter);
        openLadeIds.add(window.pendingLadeFilter);
    }
    
    const isFirstRender = (vriezerLijstenContainer.children.length === 0);
    
    vriezerLijstenContainer.innerHTML = ''; 
    
    alleVriezers.sort((a, b) => a.naam.localeCompare(b.naam));

    alleVriezers.forEach(vriezer => {
        const kolomDiv = document.createElement('div');
        kolomDiv.className = 'vriezer-kolom';
        kolomDiv.innerHTML = `<h2>${vriezer.naam}</h2>`;

        const vriezerLades = alleLades
            .filter(lade => lade.vriezerId === vriezer.id)
            .sort((a, b) => a.naam.localeCompare(b.naam));

        // --- Filter container ---
        const filterContainer = document.createElement('div');
        filterContainer.className = 'lade-filter-container';
            
        // 1. Lade Filter
        const ladeFilterGroup = document.createElement('div');
        ladeFilterGroup.className = 'filter-group';
        
        const ladeFilterLabel = document.createElement('label');
        ladeFilterLabel.htmlFor = `filter-lade-${vriezer.id}`;
        ladeFilterLabel.textContent = 'Toon Lade:';
        ladeFilterGroup.appendChild(ladeFilterLabel);
        
        const ladeFilterSelect = document.createElement('select');
        ladeFilterSelect.id = `filter-lade-${vriezer.id}`;
        ladeFilterSelect.className = 'lade-filter-select';
        ladeFilterSelect.innerHTML = '<option value="all">Alle lades</option>';
        vriezerLades.forEach(lade => {
            ladeFilterSelect.innerHTML += `<option value="${lade.id}">${lade.naam}</option>`;
        });
        
        // AANGEPAST: Pas de pending filter ook toe op de dropdown
        if (window.pendingLadeFilter) {
             const checkLade = vriezerLades.find(l => l.id === window.pendingLadeFilter);
             if (checkLade) {
                 console.log("Lade filter toegepast op dropdown:", window.pendingLadeFilter);
                 ladeFilterSelect.value = window.pendingLadeFilter;
                 // Scroll pas na rendering met kleine vertraging
                 setTimeout(() => {
                     kolomDiv.scrollIntoView({ behavior: 'smooth' });
                 }, 300);
             }
        }

        ladeFilterSelect.addEventListener('change', updateItemVisibility); 
        ladeFilterGroup.appendChild(ladeFilterSelect);
        filterContainer.appendChild(ladeFilterGroup);

        // 2. Categorie Filter
        const catFilterGroup = document.createElement('div');
        catFilterGroup.className = 'filter-group';
        
        const catFilterLabel = document.createElement('label');
        catFilterLabel.htmlFor = `filter-categorie-${vriezer.id}`;
        catFilterLabel.textContent = 'Toon Categorie:';
        catFilterGroup.appendChild(catFilterLabel);
        
        const catFilterSelect = document.createElement('select');
        catFilterSelect.id = `filter-categorie-${vriezer.id}`;
        catFilterSelect.className = 'lade-filter-select';
        catFilterSelect.innerHTML = `
            <option value="all">Alle categorieën</option>
            <option value="Geen">Geen categorie</option>
            <option value="Groenten">Groenten</option>
            <option value="Vlees">Vlees</option>
            <option value="Vis">Vis</option>
            <option value="Restjes">Restjes</option>
            <option value="Brood">Brood</option>
            <option value="Fruit">Fruit</option>
            <option value="IJs">IJs</option>
            <option value="Saus">Saus</option>
            <option value="Friet">Friet</option>
            <option value="Ander">Ander</option>
        `;
        catFilterSelect.addEventListener('change', updateItemVisibility); 
        catFilterGroup.appendChild(catFilterSelect);
        filterContainer.appendChild(catFilterGroup);
        
        kolomDiv.appendChild(filterContainer);
        // --- Einde Filter container ---
        
        
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        
        vriezerLades.forEach(lade => {
            const ladeGroup = document.createElement('div');
            
            ladeGroup.className = 'lade-group'; 
            ladeGroup.dataset.ladeId = lade.id; 

            if (isFirstRender && !window.pendingLadeFilter) {
                ladeGroup.classList.add('collapsed');
            } else {
                if (!openLadeIds.has(lade.id)) {
                    ladeGroup.classList.add('collapsed');
                } else {
                    console.log("Lade opengehouden:", lade.naam);
                    ladeGroup.classList.remove('collapsed'); // Zeker weten open
                }
            }
            
            const ladeHeader = document.createElement('button');
            ladeHeader.className = 'lade-header';
            ladeHeader.dataset.ladeId = lade.id;
            ladeHeader.dataset.ladeNaam = lade.naam;
            ladeHeader.innerHTML = `<h3>${lade.naam}</h3> <i class="fas fa-chevron-down chevron"></i>`;

            const ladeContent = document.createElement('div');
            ladeContent.className = 'lade-content';

            const ladeUl = document.createElement('ul');
            ladeUl.dataset.vriezerId = vriezer.id; 
            
            const ladeItems = vriezerItems
                .filter(item => item.ladeId === lade.id)
                .sort((a, b) => a.naam.localeCompare(b.naam));
                
            ladeItems.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id;
                li.dataset.ladeId = item.ladeId; 
                li.dataset.vriezerId = item.vriezerId;
                li.dataset.categorie = item.categorie || 'Geen';
                
                let diffDagen = 0;
                if (item.ingevrorenOp) {
                    diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                    if (diffDagen > 180) { li.classList.add('item-old'); }
                    else if (diffDagen > 90) { li.classList.add('item-medium'); }
                    else { li.classList.add('item-fresh'); }
                }
                
                li.dataset.dagen = diffDagen; 
                
                const emoji = item.emoji || getEmojiForCategory(item.categorie || 'Geen');

                const isChecked = selectedItemIds.has(item.id) ? 'checked' : '';

                li.innerHTML = `
                    <input type="checkbox" class="bulk-checkbox" data-id="${item.id}" ${isChecked}>
                    <div class="item-text">
                        <strong><span class="emoji-icon">${emoji}</span>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small class="item-categorie">Categorie: ${item.categorie || 'Geen'}</small>
                        <small class="item-datum">Ingevroren op: ${formatDatum(item.ingevrorenOp)} (${diffDagen}d)</small>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-btn" title="Bewerken"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                
                const checkbox = li.querySelector('.bulk-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) selectedItemIds.add(item.id);
                    else selectedItemIds.delete(item.id);
                    updateBulkActionBar();
                });

                ladeUl.appendChild(li);
            });
            
            ladeContent.appendChild(ladeUl);
            ladeGroup.appendChild(ladeHeader);
            ladeGroup.appendChild(ladeContent);
            
            kolomDiv.appendChild(ladeGroup);
        });
        
        vriezerLijstenContainer.appendChild(kolomDiv);
    });
    
    // AANGEPAST: Reset pas na een timeout zodat de filter daadwerkelijk werkt
    if (window.pendingLadeFilter) {
        setTimeout(() => {
            console.log("Update visibility voor pending filter");
            updateItemVisibility(); // Forceer update
            window.pendingLadeFilter = null; // Reset daarna pas
        }, 100);
    } else {
        const kanBewerken = (beheerdeUserId === eigenUserId) || 
                           (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));
                           
        if (kanBewerken) {
            initDragAndDrop();
        }
        updateItemVisibility(); 
    }
    
    if (isMoveMode) {
        document.body.classList.add('move-mode');
        bulkActionBar.classList.add('visible');
    }
}


function updateDashboard() {
    dashboard.innerHTML = '';
    let totaal = alleItems.length;
    let totaalSpan = document.createElement('strong');
    totaalSpan.textContent = `Totaal: ${totaal}`;
    dashboard.appendChild(totaalSpan);

    alleVriezers.forEach(vriezer => {
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        let vriezerSpan = document.createElement('span');
        vriezerSpan.textContent = `${vriezer.naam}: ${vriezerItems.length}`;
        dashboard.appendChild(vriezerSpan);
    });
}

function initDragAndDrop() {
    const lijsten = document.querySelectorAll('.lade-content ul');
    
    const onDragEnd = (event) => {
        const itemEl = event.item; 
        const itemId = itemEl.dataset.id;
        const oldLadeId = itemEl.dataset.ladeId;
        
        const newUL = event.to; 
        const newVriezerId = newUL.dataset.vriezerId; 

        const ladeContentDiv = newUL.parentElement;
        const ladeHeaderBtn = ladeContentDiv.previousElementSibling;
        
        const newLadeId = ladeHeaderBtn.dataset.ladeId;
        const newLadeNaam = ladeHeaderBtn.dataset.ladeNaam;

        if (oldLadeId === newLadeId) return; 
        
        itemsCollectieBasis.doc(itemId).update({
            vriezerId: newVriezerId,
            ladeId: newLadeId,
            ladeNaam: newLadeNaam
        })
        .then(() => {
            showFeedback('Item verplaatst!', 'success');
            const itemNaam = itemEl.querySelector('strong').innerText;
            logHistoryAction("Verplaatst (Sleep)", `${itemNaam} naar ${newLadeNaam}`);
        })
        .catch((err) => showFeedback(`Fout bij verplaatsen: ${err.message}`, 'error'));
    };
    
    lijsten.forEach(lijst => {
        new Sortable(lijst, {
            animation: 150,
            group: 'vriezer-items', 
            handle: '.item-text',   
            ghostClass: 'sortable-ghost', 
            chosenClass: 'sortable-chosen', 
            onEnd: onDragEnd
        });
    });
}


// ---
// STAP 5: Items CRUD
// ---

itemCategorie.addEventListener('change', () => updateEmojiField(itemCategorie, itemEmoji));
editCategorie.addEventListener('change', () => updateEmojiField(editCategorie, editEmoji));
movePurchasedCategorie.addEventListener('change', () => updateEmojiField(movePurchasedCategorie, movePurchasedEmoji));


form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    const kanBewerken = (beheerdeUserId === eigenUserId) || 
                       (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));

    if (!kanBewerken) {
        showFeedback("Je kunt geen items toevoegen aan dit account.", "error");
        return;
    }
    
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
    
    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }
    
    const geselecteerdeLadeNaam = schuifSelect.options[schuifSelect.selectedIndex].text;
    const itemNaam = document.getElementById('item-naam').value;
    const ingevrorenOpDatum = new Date(itemDatum.value + "T00:00:00");

    const gekozenEmoji = itemEmoji.value || getEmojiForCategory(itemCategorie.value);

    itemsCollectieBasis.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: ingevrorenOpDatum,
        categorie: itemCategorie.value,
        emoji: gekozenEmoji, 
        userId: beheerdeUserId,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam 
    })
    .then(() => {
        showFeedback(`'${itemNaam}' toegevoegd!`, 'success');
        const rememberCheck = document.getElementById('remember-drawer-check');
        const vandaag = new Date().toISOString().split('T')[0];
        if (rememberCheck.checked) {
            document.getElementById('item-naam').value = '';
            document.getElementById('item-aantal').value = 1;
            document.getElementById('item-eenheid').value = "stuks";
            itemDatum.value = vandaag;
            itemCategorie.value = "Geen"; 
            itemEmoji.value = ""; 
            document.getElementById('item-naam').focus();
        } else {
            form.reset();
            itemDatum.value = vandaag;
            itemCategorie.value = "Geen"; 
            itemEmoji.value = ""; 
            document.getElementById('item-eenheid').value = "stuks";
            document.getElementById('item-aantal').value = 1; 
            vriezerSelect.value = "";
            schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        }
    })
    .catch((err) => {
        console.error("Fout bij toevoegen: ", err);
        showFeedback(`Fout bij toevoegen: ${err.message}`, 'error');
    });
});

vriezerLijstenContainer.addEventListener('click', (e) => {
    
    const ladeHeader = e.target.closest('.lade-header');
    if (ladeHeader) {
        const ladeGroup = ladeHeader.parentElement;
        ladeGroup.classList.toggle('collapsed');
        return; 
    }

    const kanBewerken = (beheerdeUserId === eigenUserId) || 
                       (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));

    if (!kanBewerken && beheerdeUserId !== eigenUserId) {
        return;
    }

    const li = e.target.closest('li');
    if (!li) return; 
    
    const id = li.dataset.id;
    const item = alleItems.find(i => i.id === id);
    if (!item) return;

    // 1. Check voor Delete Knop
    const deleteButton = e.target.closest('.delete-btn');
    if (deleteButton) {
        if (!kanBewerken) {
             showFeedback("Je hebt geen rechten om dit item te verwijderen.", "error");
             return;
        }
        
        const verwijderBericht = `Weet je zeker dat je '${item.naam}' wilt verwijderen?`;
        const voegToeBericht = `\n\nWil je '${item.naam}' toevoegen aan je boodschappenlijst?`;
        
        const isLaatste = parseFloat(item.aantal) <= 1;
        const confirmBericht = (isLaatste && beheerdeUserId === eigenUserId) ? `${verwijderBericht}${voegToeBericht}` : verwijderBericht;

        if (confirm(confirmBericht)) {
            if (isLaatste && beheerdeUserId === eigenUserId) {
                addShoppingItem(item.naam);
            }
            
            itemsCollectieBasis.doc(id).delete()
                .then(() => {
                    showFeedback('Item verwijderd.', 'success');
                    logHistoryAction("Verwijderd", `${item.naam} (${item.aantal} ${item.eenheid}) uit ${item.ladeNaam}`);
                })
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
        return;
    }
    
    // 2. Check voor Edit Knop
    const editButton = e.target.closest('.edit-btn');
    if (editButton) {
        if (!kanBewerken) {
             showFeedback("Je hebt geen rechten om dit item te bewerken.", "error");
             return;
        }
        
        editId.value = id;
    editNaam.value = item.naam;
    editAantal.value = item.aantal;
    
    const eenheidSelect = document.getElementById('edit-item-eenheid');
    if (!userUnits.includes(item.eenheid)) {
        const tempOption = document.createElement('option');
        tempOption.value = item.eenheid;
        tempOption.textContent = item.eenheid + " (Archief)";
        eenheidSelect.appendChild(tempOption);
    }
    eenheidSelect.value = item.eenheid || 'stuks';

    editCategorie.value = item.categorie || 'Geen';
    
    editEmoji.value = item.emoji || getEmojiForCategory(item.categorie || 'Geen');
        
        editVriezer.innerHTML = '';
        alleVriezers.forEach(vriezer => {
            const option = document.createElement('option');
            option.value = vriezer.id;
            option.textContent = vriezer.naam;
            if (vriezer.id === item.vriezerId) option.selected = true;
            editVriezer.appendChild(option);
        });
        
        updateLadeDropdown(item.vriezerId, editSchuif, false);
        editSchuif.value = item.ladeId; 
        
        const jsDate = item.ingevrorenOp ? item.ingevrorenOp.toDate() : new Date();
        const year = jsDate.getFullYear();
        const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
        const day = jsDate.getDate().toString().padStart(2, '0');
        editDatum.value = `${year}-${month}-${day}`;
        
        showModal(editModal);
        return;
    }
});


editVriezer.addEventListener('change', () => {
    updateLadeDropdown(editVriezer.value, editSchuif, true); 
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    
    const nieuweDatum = new Date(editDatum.value + "T00:00:00");
    
    const gekozenEmoji = editEmoji.value || getEmojiForCategory(editCategorie.value);

    itemsCollectieBasis.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: new Date (nieuweDatum),
        categorie: editCategorie.value,
        emoji: gekozenEmoji 
    })
    .then(() => {
        sluitItemModal();
        showFeedback('Item bijgewerkt!', 'success');
    })
    .catch((err) => showFeedback(`Fout bij bijwerken: ${err.message}`, 'error'));
});
function sluitItemModal() { hideModal(editModal); }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: VRIEZER BEHEER LOGICA
// ---
let vriezerBeheerListener = null; 
let ladeBeheerListener = null; 

sluitBeheerKnop.addEventListener('click', () => {
    hideModal(vriezerBeheerModal);
    if (vriezerBeheerListener) { 
        vriezerBeheerListener();
        vriezerBeheerListener = null;
    }
    if (ladeBeheerListener) { 
        ladeBeheerListener(); 
        ladeBeheerListener = null;
    }
    ladeBeheerLijst.innerHTML = '';
    ladesBeheerTitel.textContent = 'Selecteer een vriezer...';
    addLadeForm.style.display = 'none';
    ladesBeheerHr.style.display = 'none';
    geselecteerdeVriezerId = null;
    geselecteerdeVriezerNaam = null;
});

addVriezerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('vriezer-naam').value;
    
    vriezersCollectieBasis.add({ 
        naam: naam, 
        userId: beheerdeUserId 
    })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
    })
    .catch(err => showFeedback(err.message, "error"));
});

function laadVriezersBeheer() {
    if (beheerdeUserId !== eigenUserId) {
        showFeedback("Je kunt alleen je eigen vriezers beheren.", "error");
        hideModal(vriezerBeheerModal);
        return;
    }
    if (vriezerBeheerListener) vriezerBeheerListener(); 
    
    vriezerBeheerListener = vriezersCollectieBasis.where("userId", "==", beheerdeUserId).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;
                if (vriezer.id === geselecteerdeVriezerId) li.classList.add('selected');
                li.innerHTML = `
                    <span>${vriezer.naam}</span>
                    <input type="text" value="${vriezer.naam}" class="beheer-naam-input">
                    <div class="item-buttons">
                        <button class="edit-btn" title="Hernoem"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                vriezerBeheerLijst.appendChild(li);
            });
        });
}

addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    if (!geselecteerdeVriezerId) return showFeedback("Selecteer eerst een vriezer", "error");
    
    ladesCollectieBasis.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, 
        userId: beheerdeUserId 
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
    })
    .catch(err => showFeedback(err.message, "error"));
});

function laadLadesBeheer(vriezerId) {
    if (ladeBeheerListener) ladeBeheerListener(); 
    
    ladeBeheerLijst.innerHTML = '<i>Lades laden...</i>';
    ladeBeheerListener = ladesCollectieBasis.where("vriezerId", "==", vriezerId).orderBy("naam")
        .onSnapshot(snapshot => {
            ladeBeheerLijst.innerHTML = '';
            if (snapshot.empty) ladeBeheerLijst.innerHTML = '<i>Nog geen lades in deze vriezer.</i>';
            snapshot.docs.forEach(doc => {
                const lade = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = lade.id;
                li.dataset.naam = lade.naam;
                
                li.innerHTML = `
                    <span>${lade.naam}</span>
                    <input type="text" value="${lade.naam}" class="beheer-naam-input">
                    <div class="item-buttons">
                        <button class="qr-btn" title="QR Code"><i class="fas fa-qrcode"></i></button>
                        <button class="edit-btn" title="Hernoem"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                ladeBeheerLijst.appendChild(li);
            });
        });
}

vriezerBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const vriezerId = li.dataset.id;
    const vriezerNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) handleVerwijderVriezer(vriezerId, vriezerNaam);
    else if (editBtn) handleHernoem(li, vriezersCollectieBasis);
    else {
        geselecteerdeVriezerId = vriezerId;
        geselecteerdeVriezerNaam = vriezerNaam;
        ladesBeheerTitel.textContent = `Lades voor: ${vriezerNaam}`;
        addLadeForm.style.display = 'grid';
        ladesBeheerHr.style.display = 'block';
        document.querySelectorAll('#vriezer-beheer-lijst li').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected');
        laadLadesBeheer(vriezerId); 
    }
});

ladeBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const ladeId = li.dataset.id;
    const ladeNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    const qrBtn = e.target.closest('.qr-btn'); 
    
    if (deleteBtn) handleVerwijderLade(ladeId, ladeNaam);
    else if (editBtn) handleHernoem(li, ladesCollectieBasis);
    else if (qrBtn) toonQrCode(ladeId, ladeNaam); 
});

function toonQrCode(ladeId, ladeNaam) {
    if (!ladeId) return;
    
    const appUrl = window.location.origin + window.location.pathname;
    const qrUrl = `${appUrl}?ladeFilter=${ladeId}`;
    
    console.log("QR URL:", qrUrl);
    
    const qr = new QRious({
        element: qrCanvas,
        value: qrUrl,
        size: 250,
        level: 'H'
    });
    
    qrLadeNaam.textContent = `Lade: ${ladeNaam}`;
    showModal(qrModal);
}

btnPrintQr.addEventListener('click', () => {
    window.print();
});
sluitQrKnop.addEventListener('click', () => hideModal(qrModal));


function handleHernoem(liElement, collectie) {
    const id = liElement.dataset.id;
    const input = liElement.querySelector('.beheer-naam-input');
    const saveBtn = liElement.querySelector('.edit-btn');
    
    if (liElement.classList.contains('edit-mode')) {
        const nieuweNaam = input.value;
        collectie.doc(id).update({ naam: nieuweNaam })
            .then(() => {
                liElement.classList.remove('edit-mode');
                saveBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                showFeedback("Naam bijgewerkt!", "success");
            })
            .catch(err => showFeedback(err.message, "error"));
    } else {
        liElement.classList.add('edit-mode');
        input.focus();
        saveBtn.innerHTML = '<i class="fas fa-save"></i>';
    }
}

async function handleVerwijderVriezer(id, naam) {
    const ladesCheck = await ladesCollectieBasis.where("vriezerId", "==", id).limit(1).get();
    if (!ladesCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: maak eerst alle lades leeg.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je vriezer "${naam}" wilt verwijderen?`)) {
        vriezersCollectieBasis.doc(id).delete()
            .then(() => {
                showFeedback(`Vriezer "${naam}" verwijderd.`, "success");
                if (id === geselecteerdeVriezerId) {
                    if (ladeBeheerListener) ladeBeheerListener();
                    ladeBeheerLijst.innerHTML = '';
                    ladesBeheerTitel.textContent = 'Selecteer een vriezer...';
                    addLadeForm.style.display = 'none';
                    ladesBeheerHr.style.display = 'none';
                    geselecteerdeVriezerId = null;
                }
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

async function handleVerwijderLade(id, naam) {
    const itemsCheck = await itemsCollectieBasis.where("ladeId", "==", id).limit(1).get();
    if (!itemsCheck.empty) {
        showFeedback("Kan lade niet verwijderen: verplaats eerst alle items.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je lade "${naam}" wilt verwijderen?`)) {
        ladesCollectieBasis.doc(id).delete()
            .then(() => {
                showFeedback(`Lade "${naam}" verwijderd.`, "success");
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: WISSEL ACCOUNT LOGICA
// ---
switchAccountKnop.addEventListener('click', () => {
    showModal(switchAccountModal);
});
sluitSwitchAccountKnop.addEventListener('click', () => {
    hideModal(switchAccountModal);
});
switchTerugKnop.addEventListener('click', () => {
    schakelBeheer(eigenUserId, "Jezelf");
});
userSharedLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    schakelBeheer(li.dataset.id, li.dataset.email);
});


// ---
// STAP 8: ZOEKBALK & FILTERS
// ---
searchBar.addEventListener('input', updateItemVisibility);
function updateItemVisibility() {
    const searchTerm = searchBar.value.toLowerCase();
    const isSearching = searchTerm.length > 0;

    document.querySelectorAll('.vriezer-kolom').forEach(kolom => {
        
        const ladeFilter = kolom.querySelector(`#filter-lade-${alleVriezers.find(v => v.naam === kolom.querySelector('h2').textContent)?.id}`);
        const catFilter = kolom.querySelector(`#filter-categorie-${alleVriezers.find(v => v.naam === kolom.querySelector('h2').textContent)?.id}`);
        
        const geselecteerdeLadeId = ladeFilter ? ladeFilter.value : 'all';
        const geselecteerdeCategorie = catFilter ? catFilter.value : 'all';
        
        const ladeHeeftZichtbareItems = {}; 

        kolom.querySelectorAll('li').forEach(item => {
            const itemLadeId = item.dataset.ladeId;
            const itemCategorie = item.dataset.categorie || 'Geen';
            
            const matchesLade = (geselecteerdeLadeId === 'all' || geselecteerdeLadeId === itemLadeId);
            const matchesCategorie = (geselecteerdeCategorie === 'all' || geselecteerdeCategorie === itemCategorie);
            
            const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
            const matchesSearch = itemText.includes(searchTerm);

            if (matchesLade && matchesSearch && matchesCategorie) {
                item.style.display = 'flex';
                ladeHeeftZichtbareItems[itemLadeId] = true; 
            } else {
                item.style.display = 'none';
            }
        });

        kolom.querySelectorAll('.lade-group').forEach(group => {
            const groupLadeId = group.dataset.ladeId;
            const heeftItems = ladeHeeftZichtbareItems[groupLadeId] === true;
            let toonGroup = false;

            if (geselecteerdeLadeId === 'all') {
                if (heeftItems) {
                    toonGroup = true;
                } else if (!isSearching && geselecteerdeCategorie === 'all') { 
                    toonGroup = true; 
                }
            } else {
                if (geselecteerdeLadeId === groupLadeId) {
                    toonGroup = true;
                }
            }
            
            if (geselecteerdeCategorie !== 'all' && !heeftItems) {
                toonGroup = false;
            }

            group.style.display = toonGroup ? 'block' : 'none';

            if (isSearching && toonGroup && heeftItems) { 
                group.classList.remove('collapsed');
            }
        });
    });
}


// ---
// STAP 9: ALLES OPENEN / SLUITEN
// ---
btnToggleAlles.addEventListener('click', () => {
    const alleLades = vriezerLijstenContainer.querySelectorAll('.lade-group');
    if (alleLades.length === 0) return; 

    const minstensEénGesloten = vriezerLijstenContainer.querySelector('.lade-group.collapsed');

    if (minstensEénGesloten) {
        alleLades.forEach(lade => lade.classList.remove('collapsed'));
        btnToggleAlles.innerHTML = '<i class="fas fa-minus-square"></i> Alles Sluiten';
    } else {
        alleLades.forEach(lade => lade.classList.add('collapsed'));
        btnToggleAlles.innerHTML = '<i class="fas fa-plus-square"></i> Alles Openen';
    }
});

// ---
// STAP 10: NIEUWE FUNCTIES & LISTENERS
// ---

// Print knop
printBtn.addEventListener('click', () => {
    hideModal(profileModal); 
    window.print();
});

// Logout
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        hideModal(profileModal); 
        auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
    }
});

// Scanner
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});

// Aantal knoppen (UX)
form.addEventListener('click', handleAantalKlik);
editModal.addEventListener('click', handleAantalKlik);
movePurchasedModal.addEventListener('click', handleAantalKlik); 

// Profiel Modal
profileBtn.addEventListener('click', () => {
    showModal(profileModal);
});
sluitProfileModalKnop.addEventListener('click', () => {
    hideModal(profileModal);
});
function laadVriezersBeheer() {
    
    if (vriezerBeheerListener) vriezerBeheerListener(); 
    
    vriezerBeheerListener = vriezersCollectieBasis
        .where("userId", "==", beheerdeUserId) 
        .orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;
                if (vriezer.id === geselecteerdeVriezerId) li.classList.add('selected');
                li.innerHTML = `
                    <span>${vriezer.naam}</span>
                    <input type="text" value="${vriezer.naam}" class="beheer-naam-input">
                    <div class="item-buttons">
                        <button class="edit-btn" title="Hernoem"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                vriezerBeheerLijst.appendChild(li);
            });
        });
}
profileVriezerBeheerBtn.addEventListener('click', () => {
    hideModal(profileModal);
    showModal(vriezerBeheerModal);
    laadVriezersBeheer();
});
// ----------------------
// Export
exportDataBtn.addEventListener('click', () => {
    if (alleItems.length === 0 && alleVriezers.length === 0) {
        showFeedback("Er is geen data om te exporteren.", "error");
        return;
    }
    
    const backupData = {
        exportDatum: new Date().toISOString(),
        vriezers: alleVriezers,
        lades: alleLades,
        items: alleItems.map(item => {
            return {
                ...item,
                ingevrorenOp: item.ingevrorenOp ? item.ingevrorenOp.toDate().toISOString() : null
            };
        })
    };
    
    const jsonData = JSON.stringify(backupData, null, 2); 
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vriezer_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showFeedback("Data geëxporteerd!", "success");
    hideModal(profileModal);
});

// Notificatie Modal
function checkHoudbaarheidNotificaties() {
    const DAGEN_OUD = 180; 
    const oudeItems = alleItems
        .filter(item => {
            if (!item.ingevrorenOp) return false;
            const diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
            return diffDagen > DAGEN_OUD;
        })

    oudeItems.sort((a, b) => {
        const dagenA = Math.ceil(Math.abs(new Date() - a.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
        const dagenB = Math.ceil(Math.abs(new Date() - b.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
        return dagenB - dagenA;
    });


    if (oudeItems.length > 0) {
        notificatieLijst.innerHTML = ''; 
        oudeItems.slice(0, 5).forEach(item => { 
            const li = document.createElement('li');
            const dagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
            li.textContent = `${item.naam} (${item.ladeNaam}) - ${dagen} dagen oud`;
            notificatieLijst.appendChild(li);
        });
        showModal(notificatieModal);
    }
}
sluitNotificatieKnop.addEventListener('click', () => {
    hideModal(notificatieModal);
});

// --- DEEL LOGICA ---
profileShareBtn.addEventListener('click', () => {
    hideModal(profileModal);
    showModal(shareModal);
    startSharesOwnerListener();
});

sluitShareKnop.addEventListener('click', () => {
    hideModal(shareModal);
    if (sharesOwnerListener) sharesOwnerListener();
});

shareInviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('share-email').value;
    const role = document.getElementById('share-role').value;
    
    if (email === currentUser.email) {
        showFeedback("Je kunt niet met jezelf delen.", "error");
        return;
    }
    
    try {
        const userQuery = await usersCollectie.where("email", "==", email).limit(1).get();
        
        if (userQuery.empty) {
            showFeedback("Fout: Geen gebruiker gevonden met dit e-mailadres.", "error");
            return;
        }
        
        const existingShareQuery = await sharesCollectie
            .where("ownerId", "==", eigenUserId)
            .where("sharedWithEmail", "==", email)
            .limit(1).get();
            
        if (!existingShareQuery.empty) {
            showFeedback("Je deelt al met deze gebruiker of hebt een uitnodiging gestuurd.", "error");
            return;
        }

        await sharesCollectie.add({
            ownerId: eigenUserId,
            ownerEmail: currentUser.email,
            sharedWithEmail: email,
            sharedWithId: null,
            role: role,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showFeedback("Uitnodiging succesvol verzonden!", "success");
        shareInviteForm.reset();
        
    } catch (err) {
        showFeedback(`Fout: ${err.message}`, "error");
        console.error("Fout bij uitnodigen:", err);
    }
});

shareHuidigeLijst.addEventListener('click', (e) => {
    const deleteButton = e.target.closest('.delete-btn');
    if (!deleteButton) return;
    
    const li = deleteButton.closest('li');
    const shareId = li.dataset.id;
    
    if (confirm("Weet je zeker dat je het delen met deze gebruiker wilt stoppen?")) {
        sharesCollectie.doc(shareId).delete()
            .then(() => showFeedback("Delen gestopt.", "success"))
            .catch(err => showFeedback(`Fout: ${err.message}`, "error"));
    }
});


// --- ACCEPTATIE LOGICA ---
sluitAcceptShareKnop.addEventListener('click', () => {
    hideModal(acceptShareModal);
});

acceptShareLijst.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    const li = button.closest('li');
    const shareId = li.dataset.id;
    const action = button.dataset.action;
    
    if (action === 'accept') {
        sharesCollectie.doc(shareId).update({
            status: "accepted",
            sharedWithId: eigenUserId
        })
        .then(() => showFeedback("Uitnodiging geaccepteerd!", "success"))
        .catch(err => showFeedback(`Fout: ${err.message}`, "error"));
    }
    
    if (action === 'decline') {
        sharesCollectie.doc(shareId).delete()
        .then(() => showFeedback("Uitnodiging geweigerd.", "success"))
        .catch(err => showFeedback(`Fout: ${err.message}`, "error"));
    }
});

// --- BOODSCHAPPENLIJST LOGICA ---
profileShoppingListBtn.addEventListener('click', () => {
    hideModal(profileModal);
    showModal(shoppingListModal);
});

sluitShoppingListKnop.addEventListener('click', () => {
    hideModal(shoppingListModal);
});

// Listener voor Boodschappenlijst
function startShoppingListListener() {
    if (shoppingListListener) shoppingListListener();
    
    shoppingListListener = shoppingListCollectie
        .where("userId", "==", eigenUserId)
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            shoppingListUl.innerHTML = '';
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (items.length === 0) {
                shoppingListUl.innerHTML = '<li><i>Je boodschappenlijst is leeg.</i></li>';
                return;
            }
            
            items.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id;
                li.dataset.naam = item.naam;
                if (item.checked) li.classList.add('checked');
                
                li.innerHTML = `
                    <input type="checkbox" class="shopping-item-checkbox" ${item.checked ? 'checked' : ''}>
                    <span class="shopping-item-name">${item.naam}</span>
                    <div class="item-buttons">
                        <button class="btn-purchased" title="Gekocht & Toevoegen aan Vriezer">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="delete-btn" title="Verwijder van lijst">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                shoppingListUl.appendChild(li);
            });
        }, (err) => console.error("Fout bij laden boodschappenlijst:", err.message));
}

// Item toevoegen aan boodschappenlijst (formulier)
addShoppingItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = shoppingItemNaam.value;
    if (!naam) return;
    
    addShoppingItem(naam);
    shoppingItemNaam.value = '';
});

// Item toevoegen aan boodschappenlijst (logica)
async function addShoppingItem(naam) {
    if (!eigenUserId) return;
    
    // Check of item al op lijst staat
    const query = await shoppingListCollectie
        .where("userId", "==", eigenUserId)
        .where("naam", "==", naam)
        .limit(1).get();

    if (!query.empty) {
        showFeedback(`'${naam}' staat al op je lijst.`, "error");
        return;
    }
    
    shoppingListCollectie.add({
        userId: eigenUserId,
        naam: naam,
        checked: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => showFeedback(`'${naam}' toegevoegd aan boodschappenlijst!`, "success"))
    .catch(err => showFeedback(err.message, "error"));
}

// Klik-events op de boodschappenlijst zelf
shoppingListUl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    const naam = li.dataset.naam;

    // Checkbox
    if (e.target.classList.contains('shopping-item-checkbox')) {
        const isChecked = e.target.checked;
        shoppingListCollectie.doc(id).update({ checked: isChecked });
        return;
    }
    
    // Verwijder knop
    if (e.target.closest('.delete-btn')) {
        shoppingListCollectie.doc(id).delete();
        return;
    }
    
    // "Gekocht" knop -> NIEUWE FLOW
    if (e.target.closest('.btn-purchased')) {
        // Bereid de nieuwe modal voor
        movePurchasedTempId.value = id;
        movePurchasedItemNaam.value = naam;
        movePurchasedNaamSpan.textContent = naam;
        
        // Vul dropdowns
        movePurchasedVriezer.innerHTML = vriezerSelect.innerHTML;
        // Eenheden vullen (zelfde als main)
        movePurchasedEenheid.innerHTML = '';
        userUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
            movePurchasedEenheid.appendChild(option);
        });
        
        hideModal(shoppingListModal);
        showModal(movePurchasedModal);
        return;
    }
});

// "Slimmer Gekocht" Submit
movePurchasedForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const naam = movePurchasedItemNaam.value;
    const vriezerId = movePurchasedVriezer.value;
    const ladeId = movePurchasedLade.value;
    const ladeNaam = movePurchasedLade.options[movePurchasedLade.selectedIndex].text;
    const aantal = parseFloat(movePurchasedAantal.value);
    const eenheid = movePurchasedEenheid.value;
    const categorie = movePurchasedCategorie.value;
    const listId = movePurchasedTempId.value;
    const emoji = movePurchasedEmoji.value; // NIEUW: Emoji meegeven
    
    if(!vriezerId || !ladeId) {
        showFeedback("Kies a.u.b. een vriezer en lade.", "error");
        return;
    }
    
    // 1. Toevoegen aan vriezer
    itemsCollectieBasis.add({
        naam: naam,
        aantal: aantal,
        eenheid: eenheid,
        categorie: categorie,
        emoji: emoji, // NIEUW
        vriezerId: vriezerId,
        ladeId: ladeId,
        ladeNaam: ladeNaam,
        userId: eigenUserId, // Gekocht is altijd voor jezelf
        ingevrorenOp: new Date()
    })
    .then(() => {
        // 2. Verwijderen uit boodschappenlijst
        return shoppingListCollectie.doc(listId).delete();
    })
    .then(() => {
        showFeedback(`${naam} opgeborgen in ${ladeNaam}!`, "success");
        hideModal(movePurchasedModal);
        movePurchasedForm.reset();
    })
    .catch(err => {
        console.error(err);
        showFeedback("Fout bij verplaatsen.", "error");
    });
});
movePurchasedVriezer.addEventListener('change', () => {
    updateLadeDropdown(movePurchasedVriezer.value, movePurchasedLade, true);
});
btnCancelMovePurchased.addEventListener('click', () => {
    hideModal(movePurchasedModal);
    showModal(shoppingListModal); // Terug naar lijst
});


// "Vinkjes wissen" knop
clearCheckedShoppingItemsBtn.addEventListener('click', async () => {
    if (!confirm("Weet je zeker dat je alle AANGEVINKTE items van de lijst wilt verwijderen?")) return;
    
    const query = await shoppingListCollectie
        .where("userId", "==", eigenUserId)
        .where("checked", "==", true)
        .get();
        
    const batch = db.batch();
    query.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    showFeedback("Afgevinkte items verwijderd.", "success");
});

// ---
// WEEKMENU LOGICA
// ---

// Open Modal vanuit Profiel
profileWeekmenuBtn.addEventListener('click', () => {
    hideModal(profileModal);
    
    // Zet datum standaard op vandaag als hij leeg is
    if(!weekmenuDatumInput.value) {
        weekmenuDatumInput.value = new Date().toISOString().split('T')[0];
    }
    
    showModal(weekmenuModal);
});

sluitWeekmenuKnop.addEventListener('click', () => {
    hideModal(weekmenuModal);
});

// Listener voor Weekmenu data
function startWeekMenuListener() {
    if (weekMenuListener) weekMenuListener();
    
    weekMenuListener = weekMenuCollectie
        .where("userId", "==", eigenUserId)
        .orderBy("datum", "asc") 
        .onSnapshot((snapshot) => {
            weekmenuListUl.innerHTML = '';
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (items.length === 0) {
                weekmenuListUl.innerHTML = '<li><i>Nog niets ingepland.</i></li>';
                return;
            }
            
            items.forEach(item => {
                const li = document.createElement('li');
                
                const dateObj = new Date(item.datum);
                const dagNaam = dateObj.toLocaleDateString('nl-BE', { weekday: 'short' });
                const datumKort = dateObj.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' });
                
                let linkHtml = '';
                if (item.link) {
                    linkHtml = `<a href="${item.link}" target="_blank" class="btn-purchased" style="text-decoration:none; display:flex; align-items:center; justify-content:center; background-color:#4A90E2;" title="Open Recept">
                        <i class="fas fa-link"></i>
                    </a>`;
                }

                li.innerHTML = `
                    <div style="display:flex; flex-direction:column; width: 100%;">
                        <small style="color:#888; font-weight:bold;">${dagNaam} ${datumKort}</small>
                        <span class="shopping-item-name" style="font-size:1.1em;">${item.gerecht}</span>
                    </div>
                    <div class="item-buttons">
                        ${linkHtml}
                        <button class="delete-btn" title="Verwijder uit menu" data-id="${item.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                weekmenuListUl.appendChild(li);
            });
        }, (err) => console.error("Fout bij laden weekmenu:", err.message));
}

addWeekmenuForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const datum = weekmenuDatumInput.value;
    const gerecht = weekmenuGerechtInput.value;
    const link = weekmenuLinkInput.value; 

    if (!datum || !gerecht || !eigenUserId) return;
    
    weekMenuCollectie.add({
        userId: eigenUserId,
        datum: datum,
        gerecht: gerecht,
        link: link || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showFeedback(`'${gerecht}' ingepland!`, "success");
        weekmenuGerechtInput.value = '';
        weekmenuLinkInput.value = '';
        weekmenuGerechtInput.focus();
    })
    .catch(err => showFeedback(err.message, "error"));
});

weekmenuListUl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if(confirm("Wil je dit gerecht uit de planning verwijderen?")) {
            weekMenuCollectie.doc(id).delete()
                .catch(err => showFeedback(err.message, "error"));
        }
    }
});

clearOldWeekmenuBtn.addEventListener('click', async () => {
    if (!confirm("Alle gerechten van GISTEREN en ouder verwijderen?")) return;
    
    const vandaag = new Date().toISOString().split('T')[0];
    
    const query = await weekMenuCollectie
        .where("userId", "==", eigenUserId)
        .where("datum", "<", vandaag)
        .get();
        
    const batch = db.batch();
    if (query.empty) {
        showFeedback("Geen oude gerechten gevonden.", "success");
        return;
    }

    query.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    showFeedback("Oude gerechten verwijderd.", "success");
});

// --- NIEUW: GESCHIEDENIS (LOGBOEK) ---
function logHistoryAction(actie, details) {
    if (!eigenUserId) return;
    
    historyCollectie.add({
        userId: eigenUserId,
        actie: actie,
        details: details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error("Kon log niet opslaan:", err));
}

profileHistoryBtn.addEventListener('click', () => {
    hideModal(profileModal);
    showModal(historyModal);
    startHistoryListener();
});
sluitHistoryKnop.addEventListener('click', () => hideModal(historyModal));

function startHistoryListener() {
    if (historyListener) historyListener();
    
    // Laatste 50 acties
    historyListener = historyCollectie
        .where("userId", "==", eigenUserId)
        .orderBy("timestamp", "desc")
        .limit(50)
        .onSnapshot(snapshot => {
            historyListUl.innerHTML = '';
            if (snapshot.empty) {
                historyListUl.innerHTML = '<li><i>Geen geschiedenis gevonden.</i></li>';
                return;
            }
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const time = data.timestamp ? data.timestamp.toDate().toLocaleString('nl-BE') : 'Zonet';
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="user-info">
                        <span>${data.actie}: ${data.details}</span>
                        <small>${time}</small>
                    </div>
                `;
                historyListUl.appendChild(li);
            });
        });
}

btnClearHistory.addEventListener('click', async () => {
    if (!confirm("Geschiedenis wissen? Dit kan niet ongedaan worden gemaakt.")) return;
    
    const snapshot = await historyCollectie.where("userId", "==", eigenUserId).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    showFeedback("Geschiedenis gewist.", "success");
});

// --- NIEUW: BULK ACTIES & MOVE MODE ---
// Render de dropdowns in de bulk bar (eenzelfde als main form)
function renderBulkDropdowns() {
    bulkTargetVriezer.innerHTML = vriezerSelect.innerHTML;
    // Zet default op 'kies vriezer'
    bulkTargetVriezer.value = "";
    bulkTargetLade.innerHTML = '<option value="" disabled selected>Kies eerst vriezer...</option>';
}
bulkTargetVriezer.addEventListener('change', () => {
    updateLadeDropdown(bulkTargetVriezer.value, bulkTargetLade, true);
});

btnToggleMode.addEventListener('click', () => {
    isMoveMode = !isMoveMode;
    
    if (isMoveMode) {
        document.body.classList.add('move-mode'); // CSS toont checkboxes
        bulkActionBar.classList.add('visible');
        btnToggleMode.classList.add('active');
        btnToggleMode.innerHTML = '<i class="fas fa-times"></i> Stop Modus';
        selectedItemIds.clear(); // Reset selectie bij start
        updateBulkActionBar();
    } else {
        document.body.classList.remove('move-mode');
        bulkActionBar.classList.remove('visible');
        btnToggleMode.classList.remove('active');
        btnToggleMode.innerHTML = '<i class="fas fa-bolt"></i> Verplaatsmodus';
        
        // Uncheck alle checkboxes in UI
        document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    }
});

function updateBulkActionBar() {
    const count = selectedItemIds.size;
    bulkCountSpan.textContent = `${count} item${count !== 1 ? 's' : ''} geselecteerd`;
    
    if (count > 0) {
        btnBulkMove.disabled = false;
        btnBulkMove.style.opacity = "1";
    } else {
        btnBulkMove.disabled = true;
        btnBulkMove.style.opacity = "0.6";
    }
}

btnBulkMove.addEventListener('click', async () => {
    if (selectedItemIds.size === 0) return;
    
    const targetVriezerId = bulkTargetVriezer.value;
    const targetLadeId = bulkTargetLade.value;
    
    if (!targetVriezerId || !targetLadeId) {
        showFeedback("Kies eerst een doel-lade.", "error");
        return;
    }
    
    const targetLadeNaam = bulkTargetLade.options[bulkTargetLade.selectedIndex].text;
    
    // Uitvoeren in batch
    const batch = db.batch();
    let count = 0;
    
    selectedItemIds.forEach(itemId => {
        const ref = itemsCollectieBasis.doc(itemId);
        batch.update(ref, {
            vriezerId: targetVriezerId,
            ladeId: targetLadeId,
            ladeNaam: targetLadeNaam
        });
        count++;
    });
    
    try {
        await batch.commit();
        showFeedback(`${count} items verplaatst naar ${targetLadeNaam}!`, "success");
        
        // Log in geschiedenis
        logHistoryAction("Bulk Verplaatsing", `${count} items naar ${targetLadeNaam}`);
        
        // Reset mode
        btnToggleMode.click(); // Zet modus uit
        
    } catch (err) {
        console.error(err);
        showFeedback("Fout bij bulk verplaatsen.", "error");
    }
});


// --- EENHEDEN FUNCTIES ---

// 1. Vul de Select Dropdowns (Toevoegen & Bewerken)
function renderUnitDropdowns() {
    const selects = [document.getElementById('item-eenheid'), document.getElementById('edit-item-eenheid'), document.getElementById('move-purchased-eenheid')];
    
    selects.forEach(select => {
        if(!select) return;
        const hudigeWaarde = select.value; 
        
        select.innerHTML = '';
        userUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
            select.appendChild(option);
        });

        if (userUnits.includes(hudigeWaarde)) {
            select.value = hudigeWaarde;
        }
    });
}

// 2. Vul de Beheer Lijst in de Modal
const eenheidBeheerLijst = document.getElementById('eenheid-beheer-lijst');
const addEenheidForm = document.getElementById('add-eenheid-form');

function renderUnitBeheerLijst() {
    if (!eenheidBeheerLijst) return;
    eenheidBeheerLijst.innerHTML = '';
    
    userUnits.forEach(unit => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${unit}</span>
            <div class="item-buttons">
                <button class="delete-btn" onclick="verwijderEenheid('${unit}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.padding = '8px';
        li.style.marginBottom = '5px';
        li.style.background = '#fff';
        li.style.border = '1px solid #eee';
        
        eenheidBeheerLijst.appendChild(li);
    });
}

// 3. Eenheid Toevoegen
if (addEenheidForm) {
    addEenheidForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('eenheid-naam');
        const nieuweEenheid = input.value.trim().toLowerCase(); 
        
        if (!nieuweEenheid) return;
        if (userUnits.includes(nieuweEenheid)) {
            showFeedback("Deze eenheid bestaat al.", "error");
            return;
        }
        
        if (beheerdeUserId !== eigenUserId) {
            showFeedback("Je kunt alleen eenheden aanpassen in je eigen account.", "error");
            return;
        }

        const updatedUnits = [...userUnits, nieuweEenheid].sort();
        
        usersCollectie.doc(eigenUserId).update({
            customUnits: updatedUnits
        })
        .then(() => {
            showFeedback("Eenheid toegevoegd!", "success");
            input.value = '';
        })
        .catch(err => showFeedback(err.message, "error"));
    });
}

// 4. Eenheid Verwijderen (Global scope nodig voor onclick)
window.verwijderEenheid = function(unitToDelete) {
    if (beheerdeUserId !== eigenUserId) {
        showFeedback("Je kunt alleen eenheden aanpassen in je eigen account.", "error");
        return;
    }

    if (!confirm(`Wil je "${unitToDelete}" verwijderen uit je lijst? Items die dit gebruiken blijven bestaan, maar de eenheid verdwijnt uit de keuzelijst.`)) return;

    const updatedUnits = userUnits.filter(u => u !== unitToDelete);
    
    usersCollectie.doc(eigenUserId).update({
        customUnits: updatedUnits
    })
    .then(() => showFeedback("Eenheid verwijderd.", "success"))
    .catch(err => showFeedback(err.message, "error"));
};
