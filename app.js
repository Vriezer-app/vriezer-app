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

// --- Collectie Referenties ---
const itemsCollectie = db.collection('items');
const ladesCollectie = db.collection('lades');
const vriezersCollectie = db.collection('vriezers');
const usersCollectie = db.collection('users');
const adminsCollectie = db.collection('admins');
const invitesCollectie = db.collection('invites');

// ---
// GLOBALE VARIABELEN
// ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let vriezersListener = null;
let ladesListener = null;
let itemsListener = null; 
let userListListener = null;
let invitesListener = null; 
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null; 
let isEersteNotificatieCheck = true;
let huidigeDelenListener = null;

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
const adminBeheerKnop = document.getElementById('admin-beheer-knop');
const adminBeheerModal = document.getElementById('admin-beheer-modal');
const sluitAdminBeheerKnop = document.getElementById('btn-sluit-admin-beheer');
const adminUserLijst = document.getElementById('admin-user-lijst');
const adminBeheertTitel = document.getElementById('admin-beheert-titel');
const adminTerugKnop = document.getElementById('admin-terug-knop');
const profileBtn = document.getElementById('profile-btn');
const profileImg = document.getElementById('profile-img');
const profileIcon = profileBtn.querySelector('i'); 
const profileModal = document.getElementById('profile-modal');
const sluitProfileModalKnop = document.getElementById('btn-sluit-profile');
const profileModalImg = document.getElementById('profile-modal-img');
const profileModalIcon = profileModal.querySelector('.profile-header i');
const profileEmailEl = document.getElementById('profile-email');
const profileVriezerBeheerBtn = document.getElementById('profile-vriezer-beheer-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const profileShareBtn = document.getElementById('profile-share-btn');
const notificatieModal = document.getElementById('notificatie-modal');
const notificatieLijst = document.getElementById('notificatie-lijst');
const sluitNotificatieKnop = document.getElementById('btn-sluit-notificatie');
const shareModal = document.getElementById('share-modal');
const sluitShareKnop = document.getElementById('btn-sluit-share');
const shareInviteForm = document.getElementById('share-invite-form');
const shareHuidigeLijst = document.getElementById('share-huidige-lijst');
const invitesBtn = document.getElementById('invites-btn');
const invitesBadge = document.getElementById('invites-badge');
const invitesModal = document.getElementById('invites-modal');
const sluitInvitesKnop = document.getElementById('btn-sluit-invites');
const invitesLijst = document.getElementById('invites-lijst');


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
        { fps: 10, qrbox: { width: 250, height: 150 }},
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
function onScanFailure(error) {}
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

        registreerGebruiker(user);
        checkAdminStatus(user.uid);
        
        const userPhoto = user.photoURL;
        const userEmail = user.email || 'Geen e-mailadres';
        if (userPhoto) {
            profileImg.src = userPhoto; profileImg.style.display = 'block'; profileIcon.style.display = 'none';
            profileModalImg.src = userPhoto; profileModalImg.style.display = 'block'; profileModalIcon.style.display = 'none';
        } else {
            profileImg.src = ''; profileImg.style.display = 'none'; profileIcon.style.display = 'block';
            profileModalImg.src = ''; profileModalImg.style.display = 'none'; profileModalIcon.style.display = 'block';
        }
        profileEmailEl.textContent = userEmail;

        startAlleDataListeners();
        startInvitesListener(); 
        
    } else {
        currentUser = null;
        eigenUserId = null;
        beheerdeUserId = null;
        isAdmin = false;
        
        stopAlleDataListeners(); 
        if (invitesListener) { invitesListener(); invitesListener = null; } 
        if (huidigeDelenListener) { huidigeDelenListener(); huidigeDelenListener = null; }
        
        console.log("Niet ingelogd, terug naar index.html");
        
        vriezerLijstenContainer.innerHTML = '';
        dashboard.innerHTML = '';
        vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
        schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        adminBeheerKnop.style.display = 'none';
        hideModal(adminBeheerModal);
        profileImg.src = ''; profileImg.style.display = 'none'; profileIcon.style.display = 'block';
        profileEmailEl.textContent = '';
        profileModalImg.src = ''; profileModalImg.style.display = 'none'; profileModalIcon.style.display = 'block';
        
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

async function checkAdminStatus(uid) {
    try {
        const adminDoc = await adminsCollectie.doc(uid).get();
        if (adminDoc.exists) {
            console.log("ADMIN STATUS: Ja");
            isAdmin = true;
            adminBeheerKnop.style.display = 'inline-flex';
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

    console.log(`Schakelen van beheer... Naar: ${naarUserId}`);
    beheerdeUserId = naarUserId;
    beheerdeUserEmail = naarUserEmail || 'Onbekende Gebruiker';
    isEersteNotificatieCheck = true; 

    stopAlleDataListeners();
    vriezerLijstenContainer.innerHTML = '<i>Data laden...</i>';
    dashboard.innerHTML = '';
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
    
    startAlleDataListeners();
    
    updateAdminUI();
    hideModal(adminBeheerModal);
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
// STAP 3: DATA LISTENERS
// ---
function startAlleDataListeners() {
    if (!currentUser) return; 
    const idVoorQuery = (isAdmin && beheerdeUserId !== eigenUserId) ? beheerdeUserId : eigenUserId;
    const queryMethode = (isAdmin && beheerdeUserId !== eigenUserId) ? 'adminQuery' : 'userQuery';

    console.log(`Start listeners voor: ${idVoorQuery} (Methode: ${queryMethode})`);
    
    if (vriezersListener) vriezersListener(); 
    let vriezersQuery;
    if (queryMethode === 'adminQuery') {
        vriezersQuery = vriezersCollectie.where('ledenUids', 'array-contains', idVoorQuery);
    } else {
        vriezersQuery = vriezersCollectie.where('ledenUids', 'array-contains', idVoorQuery);
    }

    vriezersListener = vriezersQuery
        .onSnapshot(async (snapshot) => {
            let vriezerDocs = snapshot.docs;
            
            if (queryMethode === 'userQuery') { 
                const oudeVriezers = await vriezersCollectie.where('userId', '==', idVoorQuery).get();
                if (!oudeVriezers.empty) {
                    console.log(`Migratie: ${oudeVriezers.size} oude vriezer(s) gevonden...`);
                    const batch = db.batch();
                    oudeVriezers.docs.forEach(doc => {
                        batch.update(doc.ref, {
                            eigenaarUid: doc.data().userId,
                            ledenUids: [doc.data().userId],
                            userId: firebase.firestore.FieldValue.delete() 
                        });
                    });
                    await batch.commit();
                    console.log("Migratie vriezers voltooid.");
                    return; 
                }
            }
            
            alleVriezers = vriezerDocs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Vriezers geladen:", alleVriezers.length);
            startSubListeners(alleVriezers, idVoorQuery, queryMethode);
            vulToevoegVriezerDropdown();
            renderDynamischeLijsten(); 
        }, (err) => console.error("Fout bij vriezers listener:", err.message));
}

function startSubListeners(vriezers, idVoorQuery, queryMethode) {
    if (vriezers.length === 0) {
        alleLades = [];
        alleItems = [];
        renderDynamischeLijsten();
        updateDashboard();
        return;
    }

    const vriezerIds = vriezers.map(v => v.id);

    if (ladesListener) ladesListener();
    let ladesQuery;
    if (vriezerIds.length > 30) {
         console.warn("Te veel vriezers om lades efficiënt op te halen. (Max 30)");
         ladesQuery = ladesCollectie.where('eigenaarUid', '==', idVoorQuery);
    } else if (vriezerIds.length > 0) {
         ladesQuery = ladesCollectie.where('vriezerId', 'in', vriezerIds);
    } else {
         ladesQuery = ladesCollectie.where('vriezerId', '==', 'null');
    }
    

    ladesListener = ladesQuery.onSnapshot(async (snapshot) => {
        if (queryMethode === 'userQuery') { 
            const oudeLades = await ladesCollectie.where('userId', '==', idVoorQuery).get();
            if (!oudeLades.empty) {
                console.log(`Migratie: ${oudeLades.size} oude lade(s) gevonden...`);
                const batch = db.batch();
                oudeLades.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        eigenaarUid: doc.data().userId,
                        userId: firebase.firestore.FieldValue.delete()
                    });
                });
                await batch.commit();
                console.log("Migratie lades voltooid.");
                return; 
            }
        }
        
        alleLades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Lades geladen:", alleLades.length);
        updateLadeDropdown(vriezerSelect.value, schuifSelect, false); 
        renderDynamischeLijsten(); 
    }, (err) => console.error("Fout bij lades listener:", err.message));

    
    if (itemsListener) itemsListener(); 
    let itemsQuery;
    if (vriezerIds.length > 30) {
         console.warn("Te veel vriezers om items efficiënt op te halen. (Max 30)");
         itemsQuery = itemsCollectie.where('eigenaarUid', '==', idVoorQuery);
    } else if (vriezerIds.length > 0) {
         itemsQuery = itemsCollectie.where('vriezerId', 'in', vriezerIds);
    } else {
         itemsQuery = itemsCollectie.where('vriezerId', '==', 'null');
    }
    
    itemsListener = itemsQuery.onSnapshot(async (snapshot) => {
        if (queryMethode === 'userQuery') { 
            const oudeItems = await itemsCollectie.where('userId', '==', idVoorQuery).get();
            if (!oudeItems.empty) {
                console.log(`Migratie: ${oudeItems.size} oude item(s) gevonden...`);
                const batch = db.batch();
                oudeItems.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        eigenaarUid: doc.data().userId,
                        userId: firebase.firestore.FieldValue.delete()
                    });
                });
                await batch.commit();
                console.log("Migratie items voltooid.");
                return; 
            }
        }

        alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Items geladen:", alleItems.length);
        renderDynamischeLijsten(); 
        updateDashboard(); 
        
        if (isEersteNotificatieCheck && alleItems.length > 0) {
            checkHoudbaarheidNotificaties();
            isEersteNotificatieCheck = false; 
        }
    }, (error) => console.error("Fout bij ophalen items: ", error));
}


function stopAlleDataListeners() {
    console.log("Stoppen alle data listeners...");
    if (vriezersListener) { vriezersListener(); vriezersListener = null; }
    if (ladesListener) { ladesListener(); ladesListener = null; }
    if (itemsListener) { itemsListener(); itemsListener = null; }
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
                li.innerHTML = `<span>${user.displayName || user.email}</span><small>${user.email}</small>`;
                li.addEventListener('click', () => {
                    schakelBeheer(li.dataset.id, li.dataset.email);
                });
                adminUserLijst.appendChild(li);
            });
        }, (err) => console.error("Fout bij laden gebruikerslijst:", err.message));
}

// Invites Listener
function startInvitesListener() {
    if (invitesListener) invitesListener();
    if (!currentUser) return;
    
    invitesListener = invitesCollectie
        .where('gastEmail', '==', currentUser.email)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                console.log("Geen openstaande uitnodigingen.");
                invitesBtn.style.display = 'none';
                invitesBadge.style.display = 'none';
                invitesBadge.textContent = '0';
                invitesLijst.innerHTML = '<li><i>Geen openstaande uitnodigingen.</i></li>';
            } else {
                console.log(`Je hebt ${snapshot.size} nieuwe uitnodiging(en).`);
                invitesBtn.style.display = 'inline-flex';
                invitesBadge.style.display = 'flex';
                invitesBadge.textContent = snapshot.size;
                
                invitesLijst.innerHTML = '';
                snapshot.docs.forEach(doc => {
                    const invite = doc.data();
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>Je bent uitgenodigd door <strong>${invite.eigenaarEmail}</strong>.</span>
                        <div class="invite-buttons">
                            <button class="invite-accept-btn" data-id="${doc.id}">Accepteren</button>
                            <button class="invite-decline-btn" data-id="${doc.id}">Weigeren</button>
                        </div>
                    `;
                    invitesLijst.appendChild(li);
                });
            }
        }, (err) => {
            console.error("Fout bij invites listener:", err);
            invitesBtn.style.display = 'none';
        });
}

// Accept/Decline functies
async function acceptInvite(inviteId) {
    if (!currentUser) return;
    try {
        const inviteRef = invitesCollectie.doc(inviteId);
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists) throw new Error("Uitnodiging niet gevonden.");
        
        const eigenaarUid = inviteDoc.data().eigenaarUid;

        await inviteRef.update({
            status: 'accepted',
            gastUid: currentUser.uid,
            geaccepteerdOp: firebase.firestore.FieldValue.serverTimestamp()
        });

        const vriezersQuery = await vriezersCollectie.where('eigenaarUid', '==', eigenaarUid).get();
        if (vriezersQuery.empty) {
            console.warn("Eigenaar heeft geen vriezers om te delen.");
            showFeedback("Uitnodiging geaccepteerd!", "success");
            return;
        }

        const batch = db.batch();
        vriezersQuery.docs.forEach(doc => {
            batch.update(doc.ref, {
                ledenUids: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        });
        await batch.commit();
        
        showFeedback("Uitnodiging geaccepteerd! Je hebt nu toegang.", "success");
        if (invitesBadge.textContent === '1') {
            hideModal(invitesModal);
        }
        
    } catch (err) {
        console.error("Fout bij accepteren uitnodiging:", err);
        showFeedback(err.message, "error");
    }
}

async function declineInvite(inviteId) {
     try {
        await invitesCollectie.doc(inviteId).update({
            status: 'declined',
            gastUid: currentUser.uid
        });
        showFeedback("Uitnodiging geweigerd.", "success");
        if (invitesBadge.textContent === '1') {
            hideModal(invitesModal);
        }
     } catch (err) {
        console.error("Fout bij weigeren uitnodiging:", err);
        showFeedback(err.message, "error");
     }
}


// ---
// STAP 4: UI RENDERING (Dropdowns & Lijsten)
// ---
function vulToevoegVriezerDropdown() {
    const geselecteerdeId = vriezerSelect.value;
    const eigenVriezers = alleVriezers.filter(v => v.eigenaarUid === beheerdeUserId);
    
    vriezerSelect.innerHTML = '<option value="" disabled>Kies een vriezer...</option>';
    eigenVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam; 
        vriezerSelect.appendChild(option);
    });
    
    if (geselecteerdeId && eigenVriezers.some(v => v.id === geselecteerdeId)) {
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

// --- AANGEPAST: renderDynamischeLijsten (DE FIX) ---
async function renderDynamischeLijsten() {
    const openLadeIds = new Set();
    document.querySelectorAll('.lade-group:not(.collapsed)').forEach(group => {
        openLadeIds.add(group.dataset.ladeId);
    });
    const isFirstRender = (vriezerLijstenContainer.children.length === 0);
    
    // Stap 1: Sorteer vriezers
    alleVriezers.sort((a, b) => a.naam.localeCompare(b.naam));

    // Stap 2: Groepeer vriezers
    const vriezersPerEigenaar = alleVriezers.reduce((acc, vriezer) => {
        const eigenaarId = vriezer.eigenaarUid;
        if (!acc[eigenaarId]) {
            acc[eigenaarId] = { vriezers: [], eigenaarNaam: 'Laden...' };
        }
        acc[eigenaarId].vriezers.push(vriezer);
        return acc;
    }, {});
    
    // Stap 3: Haal eigenaar-namen op
    const eigenaarIds = Object.keys(vriezersPerEigenaar);
    const userPromises = eigenaarIds.map(id => usersCollectie.doc(id).get());
    const userDocs = await Promise.all(userPromises);
    
    // --- DE FIX: Container hier leegmaken ---
    // Nadat alle 'await' operaties (data ophalen) klaar zijn,
    // maken we de container leeg. Dit voorkomt de race condition.
    vriezerLijstenContainer.innerHTML = '';
    // --- EINDE FIX ---
    
    // Stap 4: Vul eigenaar-namen in
    userDocs.forEach(doc => {
        if (doc.exists && vriezersPerEigenaar[doc.id]) {
            vriezersPerEigenaar[doc.id].eigenaarNaam = doc.data().displayName || doc.data().email;
        } else if (vriezersPerEigenaar[doc.id]) {
             vriezersPerEigenaar[doc.id].eigenaarNaam = 'Gedeelde Gebruiker';
        }
    });

    // Stap 5: Splits in "eigen" en "gedeelde" groepen
    const idSpil = beheerdeUserId; 
    const eigenGroep = vriezersPerEigenaar[idSpil] ? vriezersPerEigenaar[idSpil].vriezers : [];
    const gedeeldeGroepen = Object.entries(vriezersPerEigenaar)
        .filter(([eigenaarId, data]) => eigenaarId !== idSpil);

    // Stap 6: Render de groepen
    if (eigenGroep.length > 0) {
        const titel = document.createElement('h2');
        titel.textContent = (isAdmin && beheerdeUserId !== eigenUserId) 
            ? `Vriezers van ${beheerdeUserEmail}` 
            : "Mijn Vriezers";
        vriezerLijstenContainer.appendChild(titel);
        eigenGroep.forEach(vriezer => renderVriezerKolom(vriezer, openLadeIds, isFirstRender));
    }
    
    if (gedeeldeGroepen.length > 0) {
        const titel = document.createElement('h2');
        titel.textContent = "Gedeelde Vriezers";
        titel.style.marginTop = "30px";
        vriezerLijstenContainer.appendChild(titel);
        
        gedeeldeGroepen.forEach(([eigenaarId, data]) => {
            data.vriezers.forEach(vriezer => {
                 renderVriezerKolom(vriezer, openLadeIds, isFirstRender, `(van ${data.eigenaarNaam})`);
            });
        });
    }

    // Stap 7: Render leeg-bericht indien nodig
    if (alleVriezers.length === 0) {
        vriezerLijstenContainer.innerHTML = '<p>Nog geen vriezers gevonden.</p>';
        if (isAdmin && beheerdeUserId !== eigenUserId) {
            vriezerLijstenContainer.innerHTML = `<p>${beheerdeUserEmail} heeft nog geen vriezers.</p>`;
        } else if (!isAdmin) {
             vriezerLijstenContainer.innerHTML = '<p>Je hebt nog geen vriezers. Voeg er een toe via "Mijn Profiel" > "Mijn Vriezers Beheren".</p>';
        }
    }
    
    // Stap 8: Finaliseer UI
    initDragAndDrop();
    updateItemVisibility(); 
}
// --- EINDE AANPASSING ---

function renderVriezerKolom(vriezer, openLadeIds, isFirstRender, subtitel = '', container = vriezerLijstenContainer) {
    const kolomDiv = document.createElement('div');
    kolomDiv.className = 'vriezer-kolom';
    kolomDiv.innerHTML = `<h2>${vriezer.naam} <small style="font-weight: normal; color: #777;">${subtitel}</small></h2>`;

    const vriezerLades = alleLades
        .filter(lade => lade.vriezerId === vriezer.id)
        .sort((a, b) => a.naam.localeCompare(b.naam));

    if (vriezerLades.length > 0) {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'lade-filter-container';
        filterContainer.innerHTML = `<label for="filter-${vriezer.id}">Toon:</label>`;
        const filterSelect = document.createElement('select');
        filterSelect.id = `filter-${vriezer.id}`;
        filterSelect.className = 'lade-filter-select';
        filterSelect.innerHTML = '<option value="all">Alle schuiven</option>';
        vriezerLades.forEach(lade => {
            const ladeOption = document.createElement('option');
            ladeOption.value = lade.id;
            ladeOption.textContent = lade.naam;
            filterSelect.appendChild(ladeOption);
        });
        filterSelect.addEventListener('change', updateItemVisibility); 
        filterContainer.appendChild(filterSelect);
        kolomDiv.appendChild(filterContainer);
    }
    
    const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
    
    vriezerLades.forEach(lade => {
        const ladeGroup = document.createElement('div');
        ladeGroup.className = 'lade-group'; 
        ladeGroup.dataset.ladeId = lade.id; 
        if (isFirstRender || !openLadeIds.has(lade.id)) {
            ladeGroup.classList.add('collapsed');
        }
        
        const ladeHeader = document.createElement('button');
        ladeHeader.className = 'lade-header';
        ladeHeader.dataset.ladeId = lade.id;
        ladeHeader.dataset.ladeNaam = lade.naam;
        ladeHeader.dataset.eigenaarUid = vriezer.eigenaarUid;
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
            li.dataset.eigenaarUid = item.eigenaarUid; 
            
            let diffDagen = 0;
            if (item.ingevrorenOp) {
                diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                if (diffDagen > 180) { li.classList.add('item-old'); }
                else if (diffDagen > 90) { li.classList.add('item-medium'); }
                else { li.classList.add('item-fresh'); }
            }
            li.dataset.dagen = diffDagen; 

            const isEigenaar = (item.eigenaarUid === eigenUserId);
            
            li.innerHTML = `
                <div class="item-text">
                    <strong>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                    <small style="display: block; color: #555;">Ingevroren op: ${formatDatum(item.ingevrorenOp)} (${diffDagen}d)</small>
                </div>
                <div class="item-buttons">
                    ${isEigenaar || (isAdmin && beheerdeUserId !== eigenUserId) ? `
                    <button class="edit-btn" title="Bewerken"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    ` : `
                    <button class="edit-btn" title="Bewerken niet toegestaan" disabled><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn" title="Verwijderen niet toegestaan" disabled><i class="fas fa-trash-alt"></i></button>
                    `}
                </div>
            `;
            ladeUl.appendChild(li);
        });
        
        ladeContent.appendChild(ladeUl);
        ladeGroup.appendChild(ladeHeader);
        ladeGroup.appendChild(ladeContent);
        kolomDiv.appendChild(ladeGroup);
    });
    
    container.appendChild(kolomDiv);
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
        const itemEigenaarUid = itemEl.dataset.eigenaarUid;
        
        const newUL = event.to; 
        const newVriezerId = newUL.dataset.vriezerId; 
        const ladeContentDiv = newUL.parentElement;
        const ladeHeaderBtn = ladeContentDiv.previousElementSibling;
        const newLadeId = ladeHeaderBtn.dataset.ladeId;
        const newLadeNaam = ladeHeaderBtn.dataset.ladeNaam;
        const newEigenaarUid = ladeHeaderBtn.dataset.eigenaarUid;

        if (itemEigenaarUid !== newEigenaarUid) {
            showFeedback("Je kunt items niet naar een vriezer van een andere gebruiker slepen.", "error");
            return; 
        }
        if (oldLadeId === newLadeId) return; 
        
        itemsCollectie.doc(itemId).update({
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
    itemsCollectie.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp(),
        eigenaarUid: beheerdeUserId, 
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
        ladeHeader.parentElement.classList.toggle('collapsed');
        return; 
    }
    const li = e.target.closest('li');
    if (!li) return; 
    const id = li.dataset.id;
    const item = alleItems.find(i => i.id === id);
    if (!item) return;
    const deleteButton = e.target.closest('.delete-btn');
    if (deleteButton && !deleteButton.disabled) {
        if (confirm(`Weet je zeker dat je '${item.naam}' wilt verwijderen?`)) {
            itemsCollectie.doc(id).delete()
                .then(() => showFeedback('Item verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
        return;
    }
    const editButton = e.target.closest('.edit-btn');
    if (editButton && !editButton.disabled) {
        editId.value = id;
        editNaam.value = item.naam;
        editAantal.value = item.aantal;
        editEenheid.value = item.eenheid || 'stuks';
        const eigenaarVriezers = alleVriezers.filter(v => v.eigenaarUid === item.eigenaarUid);
        editVriezer.innerHTML = '';
        eigenaarVriezers.forEach(vriezer => {
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
    if (!geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een lade.", "error");
        return;
    }
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    const nieuweDatum = new Date(editDatum.value + "T00:00:00");
    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: new Date(nieuweDatum)
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
    if (vriezerBeheerListener) { vriezerBeheerListener(); vriezerBeheerListener = null; }
    if (ladeBeheerListener) { ladeBeheerListener(); ladeBeheerListener = null; }
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
    vriezersCollectie.add({ 
        naam: naam, 
        eigenaarUid: beheerdeUserId, 
        ledenUids: [beheerdeUserId]  
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
    vriezerBeheerListener = vriezersCollectie.where("eigenaarUid", "==", beheerdeUserId).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            if (snapshot.empty) {
                vriezerBeheerLijst.innerHTML = '<i>Je hebt nog geen vriezers aangemaakt.</i>';
            }
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
    ladesCollectie.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, 
        eigenaarUid: beheerdeUserId 
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
    ladeBeheerListener = ladesCollectie.where("vriezerId", "==", vriezerId).orderBy("naam")
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
    else if (editBtn) handleHernoem(li, vriezersCollectie);
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
    else if (editBtn) handleHernoem(li, ladesCollectie);
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
    const ladesCheck = await ladesCollectie.where("vriezerId", "==", id).limit(1).get();
    if (!ladesCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: maak eerst alle lades leeg.", "error");
        return;
    }
    const itemsCheck = await itemsCollectie.where("vriezerId", "==", id).limit(1).get();
     if (!itemsCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: er zijn nog items in gekoppeld.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je vriezer "${naam}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
        vriezersCollectie.doc(id).delete()
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
    const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
    if (!itemsCheck.empty) {
        showFeedback("Kan lade niet verwijderen: verplaats eerst alle items.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je lade "${naam}" wilt verwijderen?`)) {
        ladesCollectie.doc(id).delete()
            .then(() => {
                showFeedback(`Lade "${naam}" verwijderd.`, "success");
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: ADMIN BEHEER LOGICA
// ---
adminBeheerKnop.addEventListener('click', () => { showModal(adminBeheerModal); });
sluitAdminBeheerKnop.addEventListener('click', () => { hideModal(adminBeheerModal); });
adminTerugKnop.addEventListener('click', () => { schakelBeheer(eigenUserId, "Jezelf"); });


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
                if (heeftItems) { toonGroup = true; } 
                else if (!isSearching) { toonGroup = true; }
            } else {
                if (geselecteerdeLadeId === groupLadeId) { toonGroup = true; }
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
printBtn.addEventListener('click', () => { hideModal(profileModal); window.print(); });
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        hideModal(profileModal); 
        auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
    }
});
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});
form.addEventListener('click', handleAantalKlik);
editModal.addEventListener('click', handleAantalKlik);
profileBtn.addEventListener('click', () => { showModal(profileModal); });
sluitProfileModalKnop.addEventListener('click', () => { hideModal(profileModal); });
profileVriezerBeheerBtn.addEventListener('click', () => {
    hideModal(profileModal); 
    showModal(vriezerBeheerModal); 
    laadVriezersBeheer(); 
});
exportDataBtn.addEventListener('click', () => {
    const vriezers = alleVriezers.filter(v => v.eigenaarUid === beheerdeUserId);
    const lades = alleLades.filter(l => l.eigenaarUid === beheerdeUserId);
    const items = alleItems.filter(i => i.eigenaarUid === beheerdeUserId);
    if (items.length === 0 && vriezers.length === 0) {
        showFeedback("Er is geen data om te exporteren.", "error");
        return;
    }
    const backupData = {
        exportDatum: new Date().toISOString(),
        vriezers: vriezers, lades: lades,
        items: items.map(item => ({
            ...item,
            ingevrorenOp: item.ingevrorenOp ? item.ingevrorenOp.toDate().toISOString() : null
        }))
    };
    const jsonData = JSON.stringify(backupData, null, 2); 
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vriezer_backup_${beheerdeUserEmail}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback("Data geëxporteerd!", "success");
    hideModal(profileModal);
});
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
sluitNotificatieKnop.addEventListener('click', () => { hideModal(notificatieModal); });

// Deel Modal
profileShareBtn.addEventListener('click', () => {
    hideModal(profileModal);
    if (beheerdeUserId !== eigenUserId) {
        showFeedback("Je kunt alleen je eigen vriezers delen. Schakel eerst terug naar je eigen account via Admin Beheer.", "error");
        return;
    }
    laadHuidigeDelen(); 
    showModal(shareModal);
});
sluitShareKnop.addEventListener('click', () => {
    hideModal(shareModal);
    if (huidigeDelenListener) {
        huidigeDelenListener();
        huidigeDelenListener = null;
    }
});
shareInviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const emailInput = document.getElementById('share-email');
    const gastEmail = emailInput.value.trim().toLowerCase();
    const eigenaarEmail = currentUser.email.toLowerCase();
    const eigenaarUid = currentUser.uid;
    if (gastEmail === eigenaarEmail) {
        showFeedback("Je kunt niet jezelf uitnodigen.", "error");
        return;
    }
    try {
        const userQuery = await usersCollectie.where('email', '==', gastEmail).limit(1).get();
        if (userQuery.empty) {
            showFeedback("Fout: Geen gebruiker gevonden met dit e-mailadres.", "error");
            return;
        }
        const inviteQuery = await invitesCollectie
            .where('eigenaarUid', '==', eigenaarUid)
            .where('gastEmail', '==', gastEmail)
            .get();
        let alUitgenodigd = false;
        inviteQuery.docs.forEach(doc => {
            if (doc.data().status === 'pending' || doc.data().status === 'accepted') {
                alUitgenodigd = true;
            }
        });
        if (alUitgenodigd) {
            showFeedback("Je hebt deze gebruiker al uitgenodigd of deelt al met hen.", "error");
            return;
        }
        await invitesCollectie.add({
            eigenaarUid: eigenaarUid,
            eigenaarEmail: eigenaarEmail,
            gastEmail: gastEmail,
            status: 'pending',
            aangemaaktOp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showFeedback("Uitnodiging succesvol verstuurd!", "success");
        emailInput.value = '';
    } catch (err) {
        console.error("Fout bij versturen uitnodiging:", err);
        showFeedback(`Fout: ${err.message}`, 'error');
    }
});
function laadHuidigeDelen() {
    if (huidigeDelenListener) huidigeDelenListener(); 
    shareHuidigeLijst.innerHTML = '<li><i>Laden...</i></li>';
    huidigeDelenListener = invitesCollectie
        .where('eigenaarUid', '==', eigenUserId)
        .orderBy('aangemaaktOp', 'desc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                shareHuidigeLijst.innerHTML = '<li><i>Je deelt je vriezers nog met niemand.</i></li>';
                return;
            }
            shareHuidigeLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const invite = doc.data();
                const inviteId = doc.id;
                const li = document.createElement('li');
                if (invite.status === 'accepted') {
                    li.innerHTML = `
                        <span>${invite.gastEmail}</span>
                        <small style="color: green;">Actief</small>
                        <button class="delete-btn" title="Toegang intrekken" data-invite-id="${inviteId}" data-status="accepted">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `;
                } else if (invite.status === 'pending') {
                    li.innerHTML = `
                        <span>${invite.gastEmail}</span>
                        <small style="color: orange;">In afwachting</small>
                        <button class="delete-btn" title="Uitnodiging annuleren" data-invite-id="${inviteId}" data-status="pending">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                }
                if (li.innerHTML) {
                    shareHuidigeLijst.appendChild(li);
                }
            });
        });
}
shareHuidigeLijst.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    const inviteId = deleteBtn.dataset.inviteId;
    const status = deleteBtn.dataset.status;
    if (!inviteId || !status) return;
    if (status === 'pending') {
        if (!confirm("Weet je zeker dat je deze uitnodiging wilt annuleren?")) return;
        try {
            await invitesCollectie.doc(inviteId).delete();
            showFeedback("Uitnodiging geannuleerd.", "success");
        } catch (err) {
            console.error("Fout bij annuleren:", err);
            showFeedback(err.message, "error");
        }
    } else if (status === 'accepted') {
        if (!confirm("Weet je zeker dat je de toegang voor deze gebruiker wilt intrekken?")) return;
        try {
            const inviteRef = invitesCollectie.doc(inviteId);
            const inviteDoc = await inviteRef.get();
            if (!inviteDoc.exists) throw new Error("Uitnodiging niet gevonden.");
            const gastUid = inviteDoc.data().gastUid;
            const eigenaarUid = inviteDoc.data().eigenaarUid; 
            if (!gastUid) throw new Error("Fout: gast gebruiker ID niet gevonden in uitnodiging.");
            if (eigenaarUid !== eigenUserId) throw new Error("Je kunt geen uitnodigingen van anderen intrekken.");
            const vriezersQuery = await vriezersCollectie.where('eigenaarUid', '==', eigenaarUid).get();
            const batch = db.batch();
            vriezersQuery.docs.forEach(doc => {
                batch.update(doc.ref, {
                    ledenUids: firebase.firestore.FieldValue.arrayRemove(gastUid)
                });
            });
            batch.delete(inviteRef);
            await batch.commit();
            showFeedback("Toegang ingetrokken.", "success");
        } catch (err) {
            console.error("Fout bij intrekken toegang:", err);
            showFeedback(err.message, "error");
        }
    }
});

// Invites Modal Listeners
invitesBtn.addEventListener('click', () => {
    showModal(invitesModal);
});

sluitInvitesKnop.addEventListener('click', () => {
    hideModal(invitesModal);
});

invitesLijst.addEventListener('click', (e) => {
    const acceptBtn = e.target.closest('.invite-accept-btn');
    if (acceptBtn) {
        const inviteId = acceptBtn.dataset.id;
        acceptBtn.disabled = true;
        acceptBtn.textContent = '...';
        acceptInvite(inviteId);
        return;
    }
    
    const declineBtn = e.target.closest('.invite-decline-btn');
    if (declineBtn) {
        const inviteId = declineBtn.dataset.id;
        declineBtn.disabled = true;
        declineBtn.textContent = '...';
        declineInvite(inviteId);
        return;
    }
});


