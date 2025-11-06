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
const itemsCollectie = db.collection('items');
const ladesCollectie = db.collection('lades');
// NIEUWE COLLECTIE
const vriezersCollectie = db.collection('vriezers');

// ---
// GLOBALE VARIABELEN
// ---
let alleLades = [];
let ladesMap = {};
// NIEUWE GLOBALE VARIABELE
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let ladesBeheerListener = null; // Voor het uitschakelen van de listener

// ---
// Snelkoppelingen naar elementen
// ---
const form = document.getElementById('add-item-form');
// AANGEPAST: Deze selectors gaan we in Stap 3 niet meer gebruiken
const lijstVriezer1 = document.getElementById('lijst-vriezer-1');
const lijstVriezer2 = document.getElementById('lijst-vriezer-2');
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
const btnCancel = document.getElementById('btn-cancel');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn');
const dashTotaal = document.getElementById('dash-totaal');
const dashV1 = document.getElementById('dash-v1');
const dashV2 = document.getElementById('dash-v2');
const feedbackMessage = document.getElementById('feedback-message');
const filterV1 = document.getElementById('filter-v1');
const filterV2 = document.getElementById('filter-v2');
const scanBtn = document.getElementById('scan-btn');
const scanModal = document.getElementById('scan-modal');
const stopScanBtn = document.getElementById('btn-stop-scan');
const scannerContainerId = "barcode-scanner-container";
const manualEanBtn = document.getElementById('manual-ean-btn');
let html5QrCode;

// --- NIEUWE SELECTORS VOOR BEHEER MODAL ---
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const vriezerBeheerKnop = document.getElementById('vriezer-beheer-knop'); // ID aangepast in HTML
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer'); // ID aangepast in HTML
const addVriezerForm = document.getElementById('add-vriezer-form');
const vriezerBeheerLijst = document.getElementById('vriezer-beheer-lijst');
const ladesBeheerTitel = document.getElementById('lades-beheer-titel');
const addLadeForm = document.getElementById('add-lade-form');
const ladesBeheerHr = document.getElementById('lades-beheer-hr');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');


// ---
// HELPER FUNCTIES (blijven hetzelfde)
// ---
function showFeedback(message, type = 'success') { /* ... (je bestaande code) ... */ }
function formatAantal(aantal, eenheid) { /* ... (je bestaande code) ... */ }
function formatDatum(timestamp) { /* ... (je bestaande code) ... */ }
function startScanner() { /* ... (je bestaande code) ... */ }
function sluitScanner() { /* ... (je bestaande code) ... */ }
function onScanSuccess(decodedText, decodedResult) { /* ... (je bestaande code) ... */ }
function onScanFailure(error) { /* ... */ }
async function fetchProductFromOFF(ean) { /* ... (je bestaande code) ... */ }

// ---
// STAP 2: LADES OPHALEN & APP INITIALISEREN (VEROUDERD)
// ---
// Deze functies zijn nu verouderd. We vervangen ze in Stap 2/3.
// async function laadLades() { /* ... */ }
// function vulSchuifDropdowns() { /* ... */ }
// vriezerSelect.addEventListener('change', vulSchuifDropdowns);
// function vulLadeFilterDropdowns() { /* ... */ }

// ---
// STAP 3, 4, 5: CREATE, READ, UPDATE, DELETE (BLIJFT VOOR NU)
// ---
// Deze code blijft, maar zal *stuklopen* omdat het afhankelijk is 
// van de oude datastructuur. We repareren dit in Stap 2 & 3.
form.addEventListener('submit', (e) => { e.preventDefault(); console.log("Form submit (tijdelijk stuk)"); });
function laadItems() { console.log("laadItems (tijdelijk stuk)"); }
function handleItemLijstClick(e) { /* ... (je bestaande code) ... */ }
lijstVriezer1.addEventListener('click', handleItemLijstClick);
lijstVriezer2.addEventListener('click', handleItemLijstClick);
editForm.addEventListener('submit', (e) => { /* ... (je bestaande code) ... */ });
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: LADE BEHEER LOGICA (VOLLEDIG VERVANGEN)
// ---

// NIEUW: Open/Sluit de nieuwe beheer modal
vriezerBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'flex';
    laadVriezersBeheer(); // Start het laden van de vriezers
});
sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
    
    // Stop de lade-listener om onnodige database-reads te voorkomen
    if (ladesBeheerListener) {
        ladesBeheerListener(); // Roept de 'unsubscribe' functie aan
        ladesBeheerListener = null;
    }
    
    // Reset de modal
    ladeBeheerLijst.innerHTML = '';
    ladesBeheerTitel.textContent = 'Selecteer een vriezer...';
    addLadeForm.style.display = 'none';
    ladesBeheerHr.style.display = 'none';
    geselecteerdeVriezerId = null;
    geselecteerdeVriezerNaam = null;
});

// NIEUW: Formulier om een VRIEZER toe te voegen
addVriezerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('vriezer-naam').value;
    if (!auth.currentUser) return showFeedback("Je bent niet ingelogd", "error");

    vriezersCollectie.add({
        naam: naam,
        userId: auth.currentUser.uid // Koppel aan gebruiker
    })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
    })
    .catch(err => showFeedback(err.message, "error"));
});

// NIEUW: Laadt de lijst met vriezers in de modal
function laadVriezersBeheer() {
    if (!auth.currentUser) return;
    
    vriezersCollectie.where("userId", "==", auth.currentUser.uid).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;

                // Markeer de geselecteerde vriezer
                if (vriezer.id === geselecteerdeVriezerId) {
                    li.classList.add('selected');
                }

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

// NIEUW: Formulier om een LADE toe te voegen (aangepast)
addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    if (!geselecteerdeVriezerId) {
        return showFeedback("Selecteer eerst een vriezer", "error");
    }

    ladesCollectie.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, // Koppel aan de geselecteerde vriezer
        userId: auth.currentUser.uid // Koppel ook aan gebruiker
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
    })
    .catch(err => showFeedback(err.message, "error"));
});

// NIEUW: Laadt de lades voor de geselecteerde vriezer
function laadLadesBeheer(vriezerId) {
    // Stop de vorige listener (als die bestond)
    if (ladesBeheerListener) {
        ladesBeheerListener();
    }
    
    ladeBeheerLijst.innerHTML = '<i>Lades laden...</i>';

    // Start een nieuwe listener voor de lades van DEZE vriezer
    ladesBeheerListener = ladesCollectie.where("vriezerId", "==", vriezerId).orderBy("naam")
        .onSnapshot(snapshot => {
            ladeBeheerLijst.innerHTML = '';
            if (snapshot.empty) {
                ladeBeheerLijst.innerHTML = '<i>Nog geen lades in deze vriezer.</i>';
            }
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

// NIEUW: Klik-handler voor de VRIEZER-lijst
vriezerBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return; // Klik was niet op een LI

    const vriezerId = li.dataset.id;
    const vriezerNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        handleVerwijderVriezer(vriezerId, vriezerNaam);
    } else if (editBtn) {
        handleHernoem(li, vriezersCollectie);
    } else {
        // Klik was op het LI-item zelf. Selecteer het.
        geselecteerdeVriezerId = vriezerId;
        geselecteerdeVriezerNaam = vriezerNaam;
        
        // Update UI
        ladesBeheerTitel.textContent = `Lades voor: ${vriezerNaam}`;
        addLadeForm.style.display = 'grid';
        ladesBeheerHr.style.display = 'block';
        
        // Verwijder 'selected' van alle andere
        document.querySelectorAll('#vriezer-beheer-lijst li').forEach(el => el.classList.remove('selected'));
        // Voeg 'selected' toe aan deze
        li.classList.add('selected');
        
        // Laad de lades voor deze vriezer
        laadLadesBeheer(vriezerId);
    }
});

// NIEUW: Klik-handler voor de LADE-lijst
ladeBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;

    const ladeId = li.dataset.id;
    const ladeNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        handleVerwijderLade(ladeId, ladeNaam);
    } else if (editBtn) {
        handleHernoem(li, ladesCollectie);
    }
});

// NIEUW: Generieke functie voor hernoemen (werkt voor lades en vriezers)
function handleHernoem(liElement, collectie) {
    const id = liElement.dataset.id;
    const input = liElement.querySelector('.beheer-naam-input');
    const saveBtn = liElement.querySelector('.edit-btn');

    if (liElement.classList.contains('edit-mode')) {
        // We zijn in edit-mode, dus nu OPSLAAN
        const nieuweNaam = input.value;
        collectie.doc(id).update({ naam: nieuweNaam })
            .then(() => {
                liElement.classList.remove('edit-mode');
                saveBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Icoon terugzetten
                showFeedback("Naam bijgewerkt!", "success");
            })
            .catch(err => showFeedback(err.message, "error"));
    } else {
        // We gaan naar edit-mode
        liElement.classList.add('edit-mode');
        input.focus();
        saveBtn.innerHTML = '<i class="fas fa-save"></i>'; // Verander naar 'Opslaan' icoon
    }
}

// NIEUW: Logica voor verwijderen
async function handleVerwijderVriezer(id, naam) {
    if (!confirm(`Weet je zeker dat je vriezer "${naam}" wilt verwijderen? ALLE lades en items in deze vriezer worden ook permanent verwijderd!`)) return;

    // TODO: Dit is een complexe 'cascading delete'. 
    // Voor nu doen we alleen de vriezer zelf, maar lades/items blijven 'wees'.
    // Een volledige oplossing vereist een Cloud Function.
    
    // Eerst checken of er lades in zitten
    const ladesCheck = await ladesCollectie.where("vriezerId", "==", id).limit(1).get();
    if (!ladesCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: maak eerst alle lades leeg.", "error");
        return;
    }

    vriezersCollectie.doc(id).delete()
        .then(() => showFeedback(`Vriezer "${naam}" verwijderd.`, "success"))
        .catch(err => showFeedback(err.message, "error"));
}

async function handleVerwijderLade(id, naam) {
    // Eerst checken of er items in zitten
    const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
    if (!itemsCheck.empty) {
        showFeedback("Kan lade niet verwijderen: verplaats eerst alle items.", "error");
        return;
    }

    if (confirm(`Weet je zeker dat je lade "${naam}" wilt verwijderen?`)) {
        ladesCollectie.doc(id).delete()
            .then(() => showFeedback(`Lade "${naam}" verwijderd.`, "success"))
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: UITLOGGEN LOGICA (blijft hetzelfde)
// ---
logoutBtn.addEventListener('click', () => { /* ... (je bestaande code) ... */ });

// ---
// STAP 8: ZOEKBALK & FILTER LOGICA (blijft, maar is stuk)
// ---
searchBar.addEventListener('input', updateItemVisibility);
filterV1.addEventListener('change', updateItemVisibility);
filterV2.addEventListener('change', updateItemVisibility);
function updateItemVisibility() { console.log("Filters (tijdelijk stuk)"); }
function checkLadesInLijst(lijstElement) { /* ... */ }

// ---
// STAP 9: PRINT LOGICA (blijft hetzelfde)
// ---
printBtn.addEventListener('click', () => window.print());

// --- Scanner Listeners (blijft hetzelfde) ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => { /* ... (je bestaande code) ... */ });

// --- Drag-and-Drop Logica (blijft, maar is stuk) ---
function initDragAndDrop() { console.log("Drag/Drop (tijdelijk stuk)"); }

// ---
// ALLES STARTEN
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        // We laden de app niet meer volledig, alleen de (kapotte) functies
        initDragAndDrop(); 
        laadItems(); 
    } else {
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
