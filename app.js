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
const sharesCollectie = db.collection('shares'); // NIEUWE COLLECTIE

// ---
// GLOBALE VARIABELEN
// ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;

// Listeners (om ze later te kunnen stoppen)
let vriezersListener = null;
let ladesListener = null;
let itemsListener = null; 
let userListListener = null;
let sharesOwnerListener = null; // NIEUW
let pendingSharesListener = null; // NIEUW
let acceptedSharesListener = null; // NIEUW

// Admin & Data Scheiding
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null; 
let alleAcceptedShares = []; // NIEUW

// Notificatie vlag
let isEersteNotificatieCheck = true;

// --- Snelkoppelingen naar elementen ---
const form = document.getElementById('add-item-form');
const vriezerSelect = document.getElementById('item-vriezer'); 
const schuifSelect = document.getElementById('item-schuif'); 
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-item-form');
const editId = document.getElementById('edit-item-id');
const editNaam = document.getElementById('edit-item-naam');
const editAantal = document.getElementById('edit-item-aantal');
const editEenheid = document.getElementById('edit-item-eenheid');
const editVriezer = document.getElementById('edit-item-vriezer');
const editSchuif = document.getElementById('edit-item-schuif');
const editDatum = document.getElementById('edit-item-datum');
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

// AANGEPAST: Wissel Account Modal Elementen (voorheen Admin)
const switchAccountKnop = document.getElementById('switch-account-knop');
const switchAccountModal = document.getElementById('switch-account-modal');
const sluitSwitchAccountKnop = document.getElementById('btn-sluit-switch-account');
const adminUserLijst = document.getElementById('admin-user-lijst');
const userSharedLijst = document.getElementById('user-shared-lijst'); // NIEUW
const adminSwitchSection = document.getElementById('admin-switch-section'); // NIEUW
const userSwitchSection = document.getElementById('user-switch-section'); // NIEUW
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

// Nieuwe Profiel Knoppen
const exportDataBtn = document.getElementById('export-data-btn');
const profileShareBtn = document.getElementById('profile-share-btn');

// Notificatie Modal Elementen
const notificatieModal = document.getElementById('notificatie-modal');
const notificatieLijst = document.getElementById('notificatie-lijst');
const sluitNotificatieKnop = document.getElementById('btn-sluit-notificatie');

// Deel Modal Elementen
const shareModal = document.getElementById('share-modal');
const sluitShareKnop = document.getElementById('btn-sluit-share');
const shareInviteForm = document.getElementById('share-invite-form');
const shareHuidigeLijst = document.getElementById('share-huidige-lijst'); // NIEUW

// NIEUW: Acceptatie Modal Elementen
const acceptShareModal = document.getElementById('accept-share-modal');
const acceptShareLijst = document.getElementById('accept-share-lijst');
const sluitAcceptShareKnop = document.getElementById('btn-sluit-accept-share');


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
function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan succesvol: ${decodedText}`);
    sluitScanner();
    fetchProductFromOFF(decodedText);
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
        alleAcceptedShares = []; // Reset

        registreerGebruiker(user);
        checkAdminStatus(user.uid); // Deze start nu ook de share listeners
        
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

        // Start de data listeners
        startAlleDataListeners();
        startPendingSharesListener(); // Check op openstaande uitnodigingen
        
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

// AANGEPAST: Checkt admin status en stelt 'Wissel Account' modal in
async function checkAdminStatus(uid) {
    try {
        const adminDoc = await adminsCollectie.doc(uid).get();
        if (adminDoc.exists) {
            console.log("ADMIN STATUS: Ja");
            isAdmin = true;
            
            // Stel 'Wissel Account' modal in voor ADMIN
            switchAccountKnop.style.display = 'inline-flex';
            adminSwitchSection.style.display = 'block';
            userSwitchSection.style.display = 'none';
            
            startAdminUserListener(); // Start listener voor ALLE users
            
        } else {
            console.log("ADMIN STATUS: Nee");
            isAdmin = false;
            
            // Stel 'Wissel Account' modal in voor GEWONE USER
            adminSwitchSection.style.display = 'none';
            userSwitchSection.style.display = 'block';
            
            startAcceptedSharesListener(); // Start listener voor GEDEELDE users
        }
    } catch (err) {
        console.error("Fout bij checken admin status:", err);
        isAdmin = false;
        switchAccountKnop.style.display = 'none';
    }
    // **** DE FIX IS HIER ****
    updateSwitchAccountUI(); // Hernoemd
}

// AANGEPAST: Hernoemd en aangepast voor beide rollen
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
    updateSwitchAccountUI(); // Hernoemd
    
    hideModal(switchAccountModal);
    showFeedback(`Je beheert nu de vriezers van: ${beheerdeUserEmail}`, 'success');
}

// AANGEPAST: Hernoemd van updateAdminUI
function updateSwitchAccountUI() {
    if (beheerdeUserId === eigenUserId) {
        switchAccountTitel.textContent = 'Je beheert je eigen vriezers.';
        switchAccountTitel.style.color = '#555';
        switchTerugKnop.style.display = 'none';
    } else {
        switchAccountTitel.textContent = `LET OP: Je beheert nu de vriezers van ${beheerdeUserEmail}!`;
        switchAccountTitel.style.color = '#FF6B6B';
        switchTerugKnop.style.display = 'block';
    }
}

// ---
// STAP 3: DATA LISTENERS
// ---
function startAlleDataListeners() {
    if (!beheerdeUserId) return; 
    console.log(`Start listeners voor: ${beheerdeUserId}`);
    
    // Stop eventuele oude listeners
    stopAlleDataListeners();
    
    // 1. Vriezers Listener
    vriezersListener = vriezersCollectieBasis
        .where('userId', '==', beheerdeUserId)
        .orderBy('naam')
        .onSnapshot((snapshot) => {
            alleVriezers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Vriezers geladen:", alleVriezers.length);
            vulToevoegVriezerDropdown();
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
}

function stopAlleDataListeners() {
    console.log("Stoppen alle data listeners...");
    if (vriezersListener) { vriezersListener(); vriezersListener = null; }
    if (ladesListener) { ladesListener(); ladesListener = null; }
    if (itemsListener) { itemsListener(); itemsListener = null; }
    if (userListListener) { userListListener(); userListListener = null; } // Admin
    if (sharesOwnerListener) { sharesOwnerListener(); sharesOwnerListener = null; } // Deel modal
    if (pendingSharesListener) { pendingSharesListener(); pendingSharesListener = null; } // Acceptatie modal
    if (acceptedSharesListener) { acceptedSharesListener(); acceptedSharesListener = null; } // Wissel account
}

// AANGEPAST: Vult de admin-lijst in de 'Wissel Account' modal
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

// NIEUW: Vult de user-lijst in de 'Wissel Account' modal
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
                    li.dataset.id = share.ownerId; // We willen wisselen naar de EIGENAAR
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

// NIEUW: Checkt op openstaande uitnodigingen
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

// NIEUW: Vult de lijst in de 'Deel' modal
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

function renderDynamischeLijsten() {
    
    const openLadeIds = new Set();
    document.querySelectorAll('.lade-group:not(.collapsed)').forEach(group => {
        openLadeIds.add(group.dataset.ladeId);
    });
    
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

        if (vriezerLades.length > 0) {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'lade-filter-container';
            
            const filterLabel = document.createElement('label');
            filterLabel.htmlFor = `filter-${vriezer.id}`;
            filterLabel.textContent = 'Toon:';
            
            const filterSelect = document.createElement('select');
            filterSelect.id = `filter-${vriezer.id}`;
            filterSelect.className = 'lade-filter-select';
            
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Alle schuiven';
            filterSelect.appendChild(allOption);

            vriezerLades.forEach(lade => {
                const ladeOption = document.createElement('option');
                ladeOption.value = lade.id;
                ladeOption.textContent = lade.naam;
                filterSelect.appendChild(ladeOption);
            });

            filterSelect.addEventListener('change', updateItemVisibility); 
            
            filterContainer.appendChild(filterLabel);
            filterContainer.appendChild(filterSelect);
            kolomDiv.appendChild(filterContainer);
        }
        
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        
        vriezerLades.forEach(lade => {
            const ladeGroup = document.createElement('div');
            
            ladeGroup.className = 'lade-group'; 
            ladeGroup.dataset.ladeId = lade.id; 

            if (isFirstRender) {
                ladeGroup.classList.add('collapsed');
            } else {
                if (!openLadeIds.has(lade.id)) {
                    ladeGroup.classList.add('collapsed');
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
                
                let diffDagen = 0;
                if (item.ingevrorenOp) {
                    diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                    if (diffDagen > 180) { li.classList.add('item-old'); }
                    else if (diffDagen > 90) { li.classList.add('item-medium'); }
                    else { li.classList.add('item-fresh'); }
                }
                
                li.dataset.dagen = diffDagen; 

                // AANGEPAST: consume-btn verwijderd
                li.innerHTML = `
                    <div class="item-text">
                        <strong>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small style="display: block; color: #555;">Ingevroren op: ${formatDatum(item.ingevrorenOp)} (${diffDagen}d)</small>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-btn" title="Bewerken"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                ladeUl.appendChild(li);
            });
            
            ladeContent.appendChild(ladeUl);
            ladeGroup.appendChild(ladeHeader);
            ladeGroup.appendChild(ladeContent);
            
            kolomDiv.appendChild(ladeGroup);
        });
        
        vriezerLijstenContainer.appendChild(kolomDiv);
    });
    
    // Alleen drag-and-drop toestaan als we ons EIGEN account beheren
    // OF als we een account beheren met 'editor' rechten
    const kanBewerken = (beheerdeUserId === eigenUserId) || 
                       (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));
                       
    if (kanBewerken) {
        initDragAndDrop();
    }
    updateItemVisibility(); 
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
        .then(() => showFeedback('Item verplaatst!', 'success'))
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
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    // Check of we rechten hebben om toe te voegen
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

    itemsCollectieBasis.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: beheerdeUserId, // Belangrijk: item wordt toegevoegd aan het beheerde account
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam 
    })
    .then(() => {
        showFeedback(`'${itemNaam}' toegevoegd!`, 'success');
        const rememberCheck = document.getElementById('remember-drawer-check');
        if (rememberCheck.checked) {
            document.getElementById('item-naam').value = '';
            document.getElementById('item-aantal').value = 1;
            document.getElementById('item-eenheid').value = "stuks";
            document.getElementById('item-naam').focus();
        } else {
            form.reset();
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

    // Check of we rechten hebben om te wijzigen
    const kanBewerken = (beheerdeUserId === eigenUserId) || 
                       (alleAcceptedShares.find(s => s.ownerId === beheerdeUserId && s.role === 'editor'));

    if (!kanBewerken) {
        // Indien geen rechten, negeer alle knop-kliks behalve lade-toggle
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
        if (confirm(`Weet je zeker dat je '${item.naam}' wilt verwijderen?`)) {
            itemsCollectieBasis.doc(id).delete()
                .then(() => showFeedback('Item verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
        return;
    }
    
    // 2. Check voor Edit Knop
    const editButton = e.target.closest('.edit-btn');
    if (editButton) {
        editId.value = id;
        editNaam.value = item.naam;
        editAantal.value = item.aantal;
        editEenheid.value = item.eenheid || 'stuks';
        
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

// AANGEPAST: consume-btn logica verwijderd

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
    
    itemsCollectieBasis.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: new Date (nieuweDatum)
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
    if (beheerdeUserId !== eigenUserId) return showFeedback("Je kunt dit niet doen op een gedeeld account", "error");
    
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
    if (beheerdeUserId !== eigenUserId) return showFeedback("Je kunt dit niet doen op een gedeeld account", "error");
    
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
    
    if (deleteBtn) handleVerwijderLade(ladeId, ladeNaam);
    else if (editBtn) handleHernoem(li, ladesCollectieBasis);
});

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
// STAP 7: WISSEL ACCOUNT LOGICA (voorheen Admin)
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
// NIEUW: Listener voor de user-lijst (gedeelde accounts)
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
        
        const ladeFilter = kolom.querySelector('.lade-filter-select');
        const geselecteerdeLadeId = ladeFilter ? ladeFilter.value : 'all';
        const ladeHeeftZichtbareItems = {}; 

        kolom.querySelectorAll('li').forEach(item => {
            const itemLadeId = item.dataset.ladeId;
            const matchesLade = (geselecteerdeLadeId === 'all' || geselecteerdeLadeId === itemLadeId);
            const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
            const matchesSearch = itemText.includes(searchTerm);

            if (matchesLade && matchesSearch) {
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
                } else if (!isSearching) {
                    toonGroup = true; 
                }
            } else {
                if (geselecteerdeLadeId === groupLadeId) {
                    toonGroup = true;
                }
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

// Profiel Modal
profileBtn.addEventListener('click', () => {
    showModal(profileModal);
});
sluitProfileModalKnop.addEventListener('click', () => {
    hideModal(profileModal);
});
profileVriezerBeheerBtn.addEventListener('click', () => {
    if (beheerdeUserId !== eigenUserId) {
        showFeedback("Je kunt alleen je eigen vriezers beheren.", "error");
        return;
    }
    hideModal(profileModal); 
    showModal(vriezerBeheerModal); 
    laadVriezersBeheer(); 
});

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

    // Sorteer op dagen, oudste eerst
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

// --- NIEUW: DEEL LOGICA ---
profileShareBtn.addEventListener('click', () => {
    hideModal(profileModal);
    showModal(shareModal);
    startSharesOwnerListener(); // Start de listener die de 'huidige shares' laadt
});

sluitShareKnop.addEventListener('click', () => {
    hideModal(shareModal);
    if (sharesOwnerListener) sharesOwnerListener(); // Stop listener bij sluiten
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
        // 1. Zoek de gebruiker op e-mail
        const userQuery = await usersCollectie.where("email", "==", email).limit(1).get();
        
        if (userQuery.empty) {
            showFeedback("Fout: Geen gebruiker gevonden met dit e-mailadres.", "error");
            return;
        }
        
        // 2. Check of er al een uitnodiging is
        const existingShareQuery = await sharesCollectie
            .where("ownerId", "==", eigenUserId)
            .where("sharedWithEmail", "==", email)
            .limit(1).get();
            
        if (!existingShareQuery.empty) {
            showFeedback("Je deelt al met deze gebruiker of hebt een uitnodiging gestuurd.", "error");
            return;
        }

        // 3. Maak de share aan
        await sharesCollectie.add({
            ownerId: eigenUserId,
            ownerEmail: currentUser.email,
            sharedWithEmail: email,
            sharedWithId: null, // Wordt gevuld na acceptatie
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

// Stopzetten van delen
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


// --- NIEUW: ACCEPTATIE LOGICA ---
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
            sharedWithId: eigenUserId // Koppel ons ID aan de share
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
