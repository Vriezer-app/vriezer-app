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

// Admin & Data Scheiding
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null; 

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
const logoutBtn = document.getElementById('logout-btn'); // Zit nu in profiel modal
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
// const vriezerBeheerKnop = document.getElementById('vriezer-beheer-knop'); // VERWIJDERD
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer');
const addVriezerForm = document.getElementById('add-vriezer-form');
const vriezerBeheerLijst = document.getElementById('vriezer-beheer-lijst');
const ladesBeheerTitel = document.getElementById('lades-beheer-titel');
const addLadeForm = document.getElementById('add-lade-form');
const ladesBeheerHr = document.getElementById('lades-beheer-hr');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');
const btnToggleAlles = document.getElementById('btn-toggle-alles');

// Admin Modal Elementen
const adminBeheerKnop = document.getElementById('admin-beheer-knop');
const adminBeheerModal = document.getElementById('admin-beheer-modal');
const sluitAdminBeheerKnop = document.getElementById('btn-sluit-admin-beheer');
const adminUserLijst = document.getElementById('admin-user-lijst');
const adminBeheertTitel = document.getElementById('admin-beheert-titel');
const adminTerugKnop = document.getElementById('admin-terug-knop');

// --- NIEUW: Profiel Modal Elementen ---
const profileBtn = document.getElementById('profile-btn');
const profileImg = document.getElementById('profile-img');
const profileIcon = profileBtn.querySelector('i'); // Het 'fa-user-circle' icoon
const profileModal = document.getElementById('profile-modal');
const sluitProfileModalKnop = document.getElementById('btn-sluit-profile');
const profileModalImg = document.getElementById('profile-modal-img');
const profileModalIcon = profileModal.querySelector('.profile-header i');
const profileEmailEl = document.getElementById('profile-email');
const profileVriezerBeheerBtn = document.getElementById('profile-vriezer-beheer-btn');


// ---
// HELPER FUNCTIES (Onveranderd)
// ---
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
// Scanner functies (onveranderd)
function startScanner() {
    html5QrCode = new Html5Qrcode(scannerContainerId);
    scanModal.style.display = 'flex';
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
            scanModal.style.display = 'none';
        }).catch(err => {
            console.log("Fout bij stoppen scanner:", err);
            scanModal.style.display = 'none';
        });
    } else {
        scanModal.style.display = 'none';
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
// STAP 2: AUTHENTICATIE & INITIALISATIE (AANGEPAST)
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.email);
        currentUser = user;
        eigenUserId = user.uid; 
        
        beheerdeUserId = user.uid;
        beheerdeUserEmail = user.email || "Jezelf";

        registreerGebruiker(user);
        checkAdminStatus(user.uid);
        
        // --- NIEUW: Profiel Knop & Modal Info Instellen ---
        const userPhoto = user.photoURL;
        const userEmail = user.email || 'Geen e-mailadres';
        
        // 1. Header Profiel Knop
        if (userPhoto) {
            profileImg.src = userPhoto;
            profileImg.style.display = 'block';
            profileIcon.style.display = 'none';
        } else {
            profileImg.style.display = 'none';
            profileIcon.style.display = 'block';
        }
        
        // 2. Profiel Modal Header
        if (userPhoto) {
            profileModalImg.src = userPhoto;
            profileModalImg.style.display = 'block';
            profileModalIcon.style.display = 'none';
        } else {
            profileModalImg.style.display = 'none';
            profileModalIcon.style.display = 'block';
        }
        profileEmailEl.textContent = userEmail;
        // --- EINDE NIEUW ---

        // Start de data listeners
        startAlleDataListeners();
        
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
        adminBeheerKnop.style.display = 'none';
        adminBeheerModal.style.display = 'none';
        
        // --- NIEUW: Profiel Knop Resetten ---
        profileImg.src = '';
        profileImg.style.display = 'none';
        profileIcon.style.display = 'block';
        profileEmailEl.textContent = '';
        profileModalImg.src = '';
        profileModalImg.style.display = 'none';
        profileModalIcon.style.display = 'block';
        // --- EINDE NIEUW ---
        
        window.location.replace('index.html');
    }
});

// (Functies 'registreerGebruiker', 'checkAdminStatus', 'schakelBeheer', 'updateAdminUI' 
// zijn onveranderd en blijven hier)
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
            adminBeheerKnop.style.display = 'inline-flex'; // 'inline-flex' gebruiken ipv 'inline-block'
            startAdminUserListener(); 
        } else {
            console.log("ADMIN STATUS: Nee");
            isAdmin = false;
            adminBeheerKnop.style.display = 'none';
        }
    } catch (err) {
        console.error("Fout bij checken admin status:", err);
        isAdmin = false;
        adminBeheerKnop.style.display = 'none';
    }
    updateAdminUI();
}

function schakelBeheer(naarUserId, naarUserEmail) {
    if (beheerdeUserId === naarUserId) return; 

    console.log(`Schakelen van beheer...
    Van: ${beheerdeUserId}
    Naar: ${naarUserId} (${naarUserEmail})`);

    beheerdeUserId = naarUserId;
    beheerdeUserEmail = naarUserEmail || 'Onbekende Gebruiker';

    stopAlleDataListeners();

    vriezerLijstenContainer.innerHTML = '';
    dashboard.innerHTML = '';
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
    
    startAlleDataListeners();
    updateAdminUI();
    
    adminBeheerModal.style.display = 'none';
    showFeedback(`Je beheert nu de vriezers van: ${beheerdeUserEmail}`, 'success');
}

function updateAdminUI() {
    if (isAdmin) {
        if (beheerdeUserId === eigenUserId) {
            adminBeheertTitel.textContent = 'Je beheert je eigen vriezers.';
            adminBeheertTitel.style.color = '#555';
            adminTerugKnop.style.display = 'none';
        } else {
            adminBeheertTitel.textContent = `LET OP: Je beheert nu de vriezers van ${beheerdeUserEmail}!`;
            adminBeheertTitel.style.color = '#FF6B6B';
            adminTerugKnop.style.display = 'block';
        }
    }
}

// ---
// STAP 3: DATA LISTENERS (Onveranderd)
// ---
function startAlleDataListeners() {
    if (!beheerdeUserId) return; 
    console.log(`Start listeners voor: ${beheerdeUserId}`);
    
    // 1. Vriezers Listener
    if (vriezersListener) vriezersListener(); 
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
    if (ladesListener) ladesListener(); 
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
    if (itemsListener) itemsListener(); 
    itemsListener = itemsCollectieBasis
        .where("userId", "==", beheerdeUserId)
        .onSnapshot((snapshot) => {
            alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Items geladen:", alleItems.length);
            renderDynamischeLijsten(); 
            updateDashboard(); 
        }, (error) => {
            console.error("Fout bij ophalen items: ", error);
            showFeedback(error.message, "error");
        });
}

function stopAlleDataListeners() {
    console.log("Stoppen alle data listeners...");
    if (vriezersListener) {
        vriezersListener();
        vriezersListener = null;
    }
    if (ladesListener) {
        ladesListener();
        ladesListener = null;
    }
    if (itemsListener) {
        itemsListener();
        itemsListener = null;
    }
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
                    <span>${user.displayName || user.email}</span>
                    <small>${user.email}</small>
                `;
                
                li.addEventListener('click', () => {
                    schakelBeheer(li.dataset.id, li.dataset.email);
                });
                
                adminUserLijst.appendChild(li);
            });
        }, (err) => console.error("Fout bij laden gebruikerslijst:", err.message));
}

function stopAdminUserListener() {
    if (userListListener) {
        userListListener();
        userListListener = null;
    }
}

// ---
// STAP 4: UI RENDERING (Dropdowns & Lijsten) (Onveranderd)
// (functies 'vulToevoegVriezerDropdown', 'updateLadeDropdown', 'renderDynamischeLijsten', 
// 'updateDashboard', 'initDragAndDrop' zijn onveranderd)
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

// AANGEPAST in vorige stap (onthoudt open lades)
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
                
                if (item.ingevrorenOp) {
                    const diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                    if (diffDagen > 180) { li.classList.add('item-old'); }
                    else if (diffDagen > 90) { li.classList.add('item-medium'); }
                    else { li.classList.add('item-fresh'); }
                }

                li.innerHTML = `
                    <div class="item-text">
                        <strong>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small style="display: block; color: #555;">Ingevroren op: ${formatDatum(item.ingevrorenOp)}</small>
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
    
    initDragAndDrop();
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
// STAP 5: Items CRUD (Onveranderd)
// (functies 'form.addEventListener', 'vriezerLijstenContainer.addEventListener', 
// 'editVriezer.addEventListener', 'editForm.addEventListener', 'sluitItemModal', 'btnCancel.addEventListener')
// zijn onveranderd.
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
    
    if (!beheerdeUserId) {
        showFeedback("Fout: Geen gebruiker geselecteerd.", "error");
        return;
    }
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
        userId: beheerdeUserId, 
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

    const deleteButton = e.target.closest('.delete-btn');
    const li = e.target.closest('li');
    if (!li) return; 

    if (deleteButton) {
        const id = li.dataset.id;
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            itemsCollectieBasis.doc(id).delete()
                .then(() => showFeedback('Item verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
    }
    
    const editButton = e.target.closest('.edit-btn');
    if (editButton) {
        const id = li.dataset.id;
        const item = alleItems.find(i => i.id === id);
        if (!item) return;
        
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
        
        editModal.style.display = 'flex';
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
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: VRIEZER BEHEER LOGICA (AANGEPAST)
// ---

// --- DE OUDE LISTENER IS VERWIJDERD ---
// vriezerBeheerKnop.addEventListener('click', ...);

// De knop om de modal te *openen* zit nu in de Profiel Modal listeners (zie STAP 10)

// De rest van de Vriezer Beheer logica (functies 'sluitBeheerKnop.addEventListener', 
// 'addVriezerForm.addEventListener', 'laadVriezersBeheer', 'addLadeForm.addEventListener',
// 'laadLadesBeheer', 'vriezerBeheerLijst.addEventListener', 'ladeBeheerLijst.addEventListener',
// 'handleHernoem', 'handleVerwijderVriezer', 'handleVerwijderLade') is onveranderd.

let vriezerBeheerListener = null; 
let ladeBeheerListener = null; 

sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
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
    if (!beheerdeUserId) return showFeedback("Geen gebruiker geselecteerd", "error");
    
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
    if (!beheerdeUserId) return;
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
// STAP 7: ADMIN BEHEER LOGICA (Onveranderd)
// ---
adminBeheerKnop.addEventListener('click', () => {
    adminBeheerModal.style.display = 'flex';
});
sluitAdminBeheerKnop.addEventListener('click', () => {
    adminBeheerModal.style.display = 'none';
});
adminTerugKnop.addEventListener('click', () => {
    schakelBeheer(eigenUserId, "Jezelf");
});


// ---
// STAP 8: ZOEKBALK & FILTERS (Onveranderd)
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
// STAP 9: ALLES OPENEN / SLUITEN (Onveranderd)
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
// STAP 10: OVERIGE FUNCTIES (Print, Logout, Scanner) & NIEUWE LISTENERS
// ---
printBtn.addEventListener('click', () => window.print());

// De 'logoutBtn' bevindt zich nu in de profiel modal, maar de listener werkt nog steeds
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        // Sluit eerst de modal voor een soepele overgang
        profileModal.style.display = 'none'; 
        auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
    }
});

// Scanner listeners (onveranderd)
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});

// --- NIEUW: Profiel Modal Listeners ---
profileBtn.addEventListener('click', () => {
    profileModal.style.display = 'flex';
});

sluitProfileModalKnop.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

// Link de "Vriezer Beheer" knop *in het profiel* naar de vriezer beheer modal
profileVriezerBeheerBtn.addEventListener('click', () => {
    profileModal.style.display = 'none'; // Sluit profiel modal
    vriezerBeheerModal.style.display = 'flex'; // Open vriezer beheer modal
    laadVriezersBeheer(); // Zorg dat de data laadt
});


