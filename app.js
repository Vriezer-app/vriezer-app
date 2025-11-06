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
const vriezersCollectie = db.collection('vriezers');

// ---
// GLOBALE VARIABELEN
// ---
// AANGEPAST: We slaan nu alle stamdata hier op
let alleVriezers = [];
let alleLades = [];
let currentUser = null; // Sla de huidige gebruiker op

let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let ladesBeheerListener = null; 

// ---
// Snelkoppelingen naar elementen
// ---
const form = document.getElementById('add-item-form');
// Verwijderd: lijstVriezer1 en lijstVriezer2
// NIEUW: De hoofdcontainer voor alle vriezerlijsten
const vriezerLijstenContainer = document.getElementById('vriezer-lijsten-container'); 
const vriezerSelect = document.getElementById('item-vriezer'); // Toevoeg-formulier vriezer
const schuifSelect = document.getElementById('item-schuif'); // Toevoeg-formulier lade
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

// --- Selectors voor Beheer Modal (uit Stap 1) ---
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const vriezerBeheerKnop = document.getElementById('vriezer-beheer-knop');
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer');
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
// STAP 2: APP INITIALISATIE (NIEUW)
// ---
// Deze functie laadt alle Vriezers en Lades bij de start
async function laadStamdata() {
    if (!currentUser) return;

    try {
        // 1. Haal alle vriezers
        const vriezersSnapshot = await vriezersCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleVriezers = vriezersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Haal alle lades
        const ladesSnapshot = await ladesCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleLades = ladesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Stamdata geladen:", alleVriezers.length, "vriezers,", alleLades.length, "lades");

        // 3. Vul het TOEVOEG-formulier
        vulToevoegVriezerDropdown();
        
        // 4. Start het laden van de (nu nog kapotte) items
        laadItems(); 

    } catch (err) {
        console.error("Fout bij laden stamdata:", err);
        showFeedback(err.message, "error");
    }
}

// NIEUW: Vult de 'Kies vriezer' dropdown in het TOEVOEG formulier
function vulToevoegVriezerDropdown() {
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    alleVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; // Gebruik de ID
        option.textContent = vriezer.naam; // Toon de naam
        vriezerSelect.appendChild(option);
    });
}

// NIEUW: Listener voor het TOEVOEG formulier
vriezerSelect.addEventListener('change', () => {
    const geselecteerdeVriezerId = vriezerSelect.value;
    
    // Vul de lade-selectie
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    
    // Filter de globale 'alleLades' array
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id; // Gebruik de ID
        option.textContent = lade.naam; // Toon de naam
        schuifSelect.appendChild(option);
    });
});


// ---
// STAP 3: Items Opslaan (Create) - (VOLLEDIG HERSCHREVEN)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    // Haal de ID's op
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
    
    // Check of alles is geselecteerd
    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }

    // Haal de ladeNaam op voor sortering (optioneel maar handig)
    const geselecteerdeLadeNaam = schuifSelect.options[schuifSelect.selectedIndex].text;
    const itemNaam = document.getElementById('item-naam').value;

    itemsCollectie.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp(),
        
        // --- DE NIEUWE DATASTRUCTUUR ---
        userId: currentUser.uid,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam // Voor sorteren in Stap 3
        // ---------------------------------
    })
    .then(() => {
        showFeedback(`'${itemNaam}' toegevoegd!`, 'success');
        
        // Reset-logica (blijft hetzelfde)
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

// ---
// STAP 4: Items Tonen (Read) - (VOLLEDIG HERSCHREVEN)
// ---

// NIEUWE helper-functie om één item-LI te bouwen
function renderItem(doc) {
    const item = doc.data();
    const li = document.createElement('li');
    li.dataset.id = doc.id;
    
    // Data-attributen voor zoeken/filteren (wordt later gebruikt)
    li.dataset.naam = item.naam.toLowerCase();
    li.dataset.vriezer = item.vriezerId;
    li.dataset.lade = item.ladeId;

    const ingevrorenDatum = item.ingevrorenOp ? formatDatum(item.ingevrorenOp) : 'Onbekend';
    
    li.innerHTML = `
        <div class="item-info">
            <span class="item-naam">${item.naam}</span>
            <span class="item-details">
                ${formatAantal(item.aantal, item.eenheid)} | ${ingevrorenDatum}
            </span>
        </div>
        <div class="item-buttons">
            <button class="edit-btn" title="Bewerk"><i class="fas fa-pencil-alt"></i></button>
            <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    return li;
}

// HERSCHREVEN: laadItems()
function laadItems() { 
    if (!currentUser) return;

    // We gebruiken onSnapshot voor real-time updates!
    itemsCollectie.where('userId', '==', currentUser.uid)
        .orderBy('ladeNaam') // Sorteer op lade (zoals ingesteld bij 'add')
        .orderBy('naam')     // Daarbinnen op naam
        .onSnapshot(snapshot => {
            
            // Leeg de container
            vriezerLijstenContainer.innerHTML = '';
            
            // 1. Loop door de globale 'alleVriezers' (uit stap 2)
            alleVriezers.forEach(vriezer => {
                // Maak een container voor deze vriezer
                const vriezerDiv = document.createElement('div');
                vriezerDiv.className = 'vriezer-container';
                // Tel alle items in deze vriezer (snapshot is alle items van de gebruiker)
const itemsInVriezer = snapshot.docs.filter(doc => doc.data().vriezerId === vriezer.id);

vriezerDiv.innerHTML = `
    <h2>
        <i class="fas fa-snowflake"></i> ${vriezer.naam} 
        <span class="item-count">(${itemsInVriezer.length})</span>
    </h2>
`;


                // 2. Filter de globale 'alleLades' voor deze vriezer
                const ladesInVriezer = alleLades.filter(l => l.vriezerId === vriezer.id);
                
                if (ladesInVriezer.length === 0) {
                     vriezerDiv.innerHTML += `<p class="empty-lade-msg"><i>Voeg lades toe via 'Beheer Vriezers' om items te zien.</i></p>`;
                }

                // 3. Loop door de lades van deze vriezer
                ladesInVriezer.forEach(lade => {
                    // Maak een container voor deze lade
                    const ladeDiv = document.createElement('div');
                    ladeDiv.className = 'lade-container';
                    // We geven de UL de ID van de lade, handig voor drag-and-drop later
                    // 4. Filter de items (uit de snapshot) voor deze lade
// (Deze regel heb je al, we verplaatsen hem VOOR de innerHTML)
const itemsInLade = snapshot.docs.filter(doc => doc.data().ladeId === lade.id);

ladeDiv.innerHTML = `
    <h3>
        ${lade.naam}
        <span class="item-count">(${itemsInLade.length})</span>
    </h3>
    <ul class="item-lijst" id="lijst-${lade.id}" data-lade-id="${lade.id}"></ul>
`;

                    const ul = ladeDiv.querySelector('.item-lijst');
                    
                    if (itemsInLade.length === 0) {
                        ul.innerHTML = `<li class="empty-lade-msg"><i>Leeg</i></li>`;
                    } else {
                        itemsInLade.forEach(doc => {
                            ul.appendChild(renderItem(doc));
                        });
                    }
                    // Voeg de lade toe aan de vriezer-div
                    vriezerDiv.appendChild(ladeDiv);
                });
                
                // Voeg de complete vriezer-div toe aan de pagina
                vriezerLijstenContainer.appendChild(vriezerDiv);
            });
            
            // Update het dashboard (Stap 8, maar we kunnen de totalen al tellen)
            dashTotaal.textContent = snapshot.size;
            // NIEUW: Zorg dat de filtering klopt bij het laden
            updateItemVisibility();

        }, err => {
            console.error("Fout bij laden items: ", err);
            showFeedback(err.message, "error");
        });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (VOLLEDIG HERSCHREVEN)
// ---

// NIEUWE GEDELEGEERDE LISTENER:
// Deze ene listener vangt alle clicks op binnen de container
vriezerLijstenContainer.addEventListener('click', handleItemLijstClick);

// VERWIJDER DEZE OUDE REGELS:
// lijstVriezer1.addEventListener('click', handleItemLijstClick);
// lijstVriezer2.addEventListener('click', handleItemLijstClick);


// HERSCHREVEN: handleItemLijstClick
async function handleItemLijstClick(e) {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        const naam = li.querySelector('.item-naam').textContent;

        if (confirm(`Weet je zeker dat je '${naam}' wilt verwijderen?`)) {
            try {
                await itemsCollectie.doc(id).delete();
                showFeedback(`'${naam}' verwijderd.`, 'success');
            } catch (err) {
                showFeedback(err.message, 'error');
            }
        }
    } 
    
    else if (editBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        
        try {
            const doc = await itemsCollectie.doc(id).get();
            if (!doc.exists) {
                showFeedback("Item niet gevonden", "error");
                return;
            }
            const item = doc.data();
            
            // 1. Vul de simpele velden
            editId.value = doc.id;
            editNaam.value = item.naam;
            editAantal.value = item.aantal;
            editEenheid.value = item.eenheid;
            
            // 2. Vul de 'Vriezer' dropdown (met 'alleVriezers')
            editVriezer.innerHTML = ''; // Maak leeg
            alleVriezers.forEach(vriezer => {
                const option = document.createElement('option');
                option.value = vriezer.id;
                option.textContent = vriezer.naam;
                if (vriezer.id === item.vriezerId) {
                    option.selected = true; // Selecteer de huidige vriezer
                }
                editVriezer.appendChild(option);
            });
            
            // 3. Vul de 'Lade' dropdown
            // We roepen een *nieuwe* helper-functie aan (zie hieronder)
            // We geven de vriezer-ID én de huidige lade-ID mee
            vulEditLadeDropdown(item.vriezerId, item.ladeId);

            // 4. Toon de modal
            editModal.style.display = 'flex';
            
        } catch (err) {
            showFeedback(err.message, 'error');
        }
    }
}

// NIEUWE HELPER: Vult de 'lade' dropdown in de EDIT modal
function vulEditLadeDropdown(geselecteerdeVriezerId, selecteerLadeId = null) {
    editSchuif.innerHTML = '<option value="" disabled>Kies een schuif...</option>';
    
    // Filter de globale 'alleLades' array
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.id === selecteerLadeId) {
            option.selected = true; // Selecteer de huidige lade
        }
        editSchuif.appendChild(option);
    });
}

// NIEUWE LISTENER: Als de VRIEZER *in de modal* verandert...
editVriezer.addEventListener('change', () => {
    // ...vul dan de lade-dropdown opnieuw, maar zonder een lade te selecteren
    vulEditLadeDropdown(editVriezer.value);
});


// HERSCHREVEN: Het opslaan van het bewerk-formulier
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;

    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }

    // Haal de ladeNaam op (voor sortering)
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    const nieuweNaam = editNaam.value;

    try {
        await itemsCollectie.doc(id).update({
            naam: nieuweNaam,
            aantal: parseFloat(editAantal.value),
            eenheid: editEenheid.value,
            vriezerId: geselecteerdeVriezerId,
            ladeId: geselecteerdeLadeId,
            ladeNaam: geselecteerdeLadeNaam // Heel belangrijk voor sortering!
        });
        
        showFeedback(`'${nieuweNaam}' bijgewerkt!`, 'success');
        sluitItemModal();
        
    } catch (err) {
        console.error("Fout bij bijwerken: ", err);
        showFeedback(err.message, 'error');
    }
});

// (sluitItemModal en btnCancel blijven hetzelfde)
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);

// ---
// STAP 5: Items Verwijderen & Bewerken (VOLLEDIG HERSCHREVEN)
// ---

// NIEUWE GEDELEGEERDE LISTENER:
// Deze ene listener vangt alle clicks op binnen de container
vriezerLijstenContainer.addEventListener('click', handleItemLijstClick);

// VERWIJDER DEZE OUDE REGELS:
// lijstVriezer1.addEventListener('click', handleItemLijstClick);
// lijstVriezer2.addEventListener('click', handleItemLijstClick);


// HERSCHREVEN: handleItemLijstClick
async function handleItemLijstClick(e) {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        const naam = li.querySelector('.item-naam').textContent;

        if (confirm(`Weet je zeker dat je '${naam}' wilt verwijderen?`)) {
            try {
                await itemsCollectie.doc(id).delete();
                showFeedback(`'${naam}' verwijderd.`, 'success');
            } catch (err) {
                showFeedback(err.message, 'error');
            }
        }
    } 
    
    else if (editBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        
        try {
            const doc = await itemsCollectie.doc(id).get();
            if (!doc.exists) {
                showFeedback("Item niet gevonden", "error");
                return;
            }
            const item = doc.data();
            
            // 1. Vul de simpele velden
            editId.value = doc.id;
            editNaam.value = item.naam;
            editAantal.value = item.aantal;
            editEenheid.value = item.eenheid;
            
            // 2. Vul de 'Vriezer' dropdown (met 'alleVriezers')
            editVriezer.innerHTML = ''; // Maak leeg
            alleVriezers.forEach(vriezer => {
                const option = document.createElement('option');
                option.value = vriezer.id;
                option.textContent = vriezer.naam;
                if (vriezer.id === item.vriezerId) {
                    option.selected = true; // Selecteer de huidige vriezer
                }
                editVriezer.appendChild(option);
            });
            
            // 3. Vul de 'Lade' dropdown
            // We roepen een *nieuwe* helper-functie aan (zie hieronder)
            // We geven de vriezer-ID én de huidige lade-ID mee
            vulEditLadeDropdown(item.vriezerId, item.ladeId);

            // 4. Toon de modal
            editModal.style.display = 'flex';
            
        } catch (err) {
            showFeedback(err.message, 'error');
        }
    }
}

// NIEUWE HELPER: Vult de 'lade' dropdown in de EDIT modal
function vulEditLadeDropdown(geselecteerdeVriezerId, selecteerLadeId = null) {
    editSchuif.innerHTML = '<option value="" disabled>Kies een schuif...</option>';
    
    // Filter de globale 'alleLades' array
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.id === selecteerLadeId) {
            option.selected = true; // Selecteer de huidige lade
        }
        editSchuif.appendChild(option);
    });
}

// NIEUWE LISTENER: Als de VRIEZER *in de modal* verandert...
editVriezer.addEventListener('change', () => {
    // ...vul dan de lade-dropdown opnieuw, maar zonder een lade te selecteren
    vulEditLadeDropdown(editVriezer.value);
});


// HERSCHREVEN: Het opslaan van het bewerk-formulier
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;

    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }

    // Haal de ladeNaam op (voor sortering)
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    const nieuweNaam = editNaam.value;

    try {
        await itemsCollectie.doc(id).update({
            naam: nieuweNaam,
            aantal: parseFloat(editAantal.value),
            eenheid: editEenheid.value,
            vriezerId: geselecteerdeVriezerId,
            ladeId: geselecteerdeLadeId,
            ladeNaam: geselecteerdeLadeNaam // Heel belangrijk voor sortering!
        });
        
        showFeedback(`'${nieuweNaam}' bijgewerkt!`, 'success');
        sluitItemModal();
        
    } catch (err) {
        console.error("Fout bij bijwerken: ", err);
        showFeedback(err.message, 'error');
    }
});

// (sluitItemModal en btnCancel blijven hetzelfde)
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);

// ---
// STAP 6: VRIEZER BEHEER LOGICA (Functioneert - uit Stap 1)
// ---
vriezerBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'flex';
    laadVriezersBeheer(); 
});
sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
    if (ladesBeheerListener) {
        ladesBeheerListener(); 
        ladesBeheerListener = null;
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
    if (!currentUser) return showFeedback("Je bent niet ingelogd", "error");

    vriezersCollectie.add({
        naam: naam,
        userId: currentUser.uid 
    })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
        laadStamdata(); // NIEUW: Herlaad de stamdata zodat de dropdowns updaten
    })
    .catch(err => showFeedback(err.message, "error"));
});

function laadVriezersBeheer() {
    if (!currentUser) return;
    
    vriezersCollectie.where("userId", "==", currentUser.uid).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;
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

addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    if (!geselecteerdeVriezerId) return showFeedback("Selecteer eerst een vriezer", "error");

    ladesCollectie.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, 
        userId: currentUser.uid 
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
        laadStamdata(); // NIEUW: Herlaad de stamdata
    })
    .catch(err => showFeedback(err.message, "error"));
});

function laadLadesBeheer(vriezerId) {
    if (ladesBeheerListener) ladesBeheerListener();
    ladeBeheerLijst.innerHTML = '<i>Lades laden...</i>';
    ladesBeheerListener = ladesCollectie.where("vriezerId", "==", vriezerId).orderBy("naam")
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

    if (deleteBtn) {
        handleVerwijderVriezer(vriezerId, vriezerNaam);
    } else if (editBtn) {
        handleHernoem(li, vriezersCollectie, true); // true = vriezer
    } else {
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

    if (deleteBtn) {
        handleVerwijderLade(ladeId, ladeNaam);
    } else if (editBtn) {
        handleHernoem(li, ladesCollectie, false); // false = lade
    }
});

function handleHernoem(liElement, collectie, isVriezer) {
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
                laadStamdata(); // Herlaad alles
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
    if (confirm(`Weet je zeker dat je vriezer "${naam}" wilt verwijderen?`)) {
        vriezersCollectie.doc(id).delete()
            .then(() => {
                showFeedback(`Vriezer "${naam}" verwijderd.`, "success");
                laadStamdata(); // Herlaad alles
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
                laadStamdata(); // Herlaad alles
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: UITLOGGEN LOGICA (blijft hetzelfde)
// ---
logoutBtn.addEventListener('click', () => { /* ... (je bestaande code) ... */ });

// ---
// STAP 8: ZOEKBALK & FILTER LOGICA (HERSCHREVEN)
// ---

// De listeners blijven, maar we verwijderen de oude, statische filters
searchBar.addEventListener('input', updateItemVisibility);
// VERWIJDER DEZE REGELS (deze filters bestaan niet meer):
// filterV1.addEventListener('change', updateItemVisibility);
// filterV2.addEventListener('change', updateItemVisibility);


// HERSCHREVEN: updateItemVisibility
// Deze functie filtert nu de items op basis van de zoekbalk
function updateItemVisibility() {
    const zoekTerm = searchBar.value.toLowerCase().trim();

    // 1. Loop door alle items (li) op de pagina
    const alleItems = document.querySelectorAll('.item-lijst li');
    
    alleItems.forEach(item => {
        // Sla 'empty-lade-msg' over
        if (item.classList.contains('empty-lade-msg')) return; 

        const itemNaam = item.dataset.naam; // We gebruiken het data-attribuut!
        
        // Verberg/toon op basis van de zoekterm
        if (itemNaam.includes(zoekTerm)) {
            item.style.display = 'flex'; // 'flex' (of 'list-item')
        } else {
            item.style.display = 'none';
        }
    });

    // 2. Na het filteren, check welke lades/vriezers leeg zijn
    checkLegeContainers();
}

// HERSCHREVEN: Deze functie heette 'checkLadesInLijst'
// Verbergt nu lege lades én lege vriezers
function checkLegeContainers() {
    // Loop door alle lade-containers
    document.querySelectorAll('.lade-container').forEach(ladeDiv => {
        const ul = ladeDiv.querySelector('.item-lijst');
        const legeMsg = ladeDiv.querySelector('.empty-lade-msg');
        
        // Zoek naar ZICHTBARE items (display != 'none')
        const zichtbareItems = ul.querySelectorAll('li[style*="display: flex"]');
        
        // Als er geen lege-boodschap is (dus er waren items)
        if (!legeMsg) {
            if (zichtbareItems.length === 0) {
                // Alle items zijn weggefilterd, verberg de lade-titel
                ladeDiv.querySelector('h3').style.display = 'none';
                ul.style.display = 'none'; // Verberg de hele UL
            } else {
                // Er zijn items, toon de titel en lijst
                ladeDiv.querySelector('h3').style.display = 'block';
                ul.style.display = 'block';
            }
        }
    });

    // Loop door alle vriezer-containers
    document.querySelectorAll('.vriezer-container').forEach(vriezerDiv => {
        // Zoek naar ZICHTBARE lade-titels
        const zichtbareLades = vriezerDiv.querySelectorAll('h3[style*="display: block"]');
        
        if (zichtbareLades.length === 0) {
            // Geen zichtbare lades, verberg de vriezer-titel
            vriezerDiv.querySelector('h2').style.display = 'none';
        } else {
            // Er zijn lades, toon de vriezer-titel
            vriezerDiv.querySelector('h2').style.display = 'flex'; // 'flex' (of 'block')
        }
    });
}

// ---
// STAP 9: PRINT LOGICA (blijft hetzelfde)
// ---
printBtn.addEventListener('click', () => window.print());

// --- Scanner Listeners (blijft hetzelfde) ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => { /* ... (je bestaande code) ... */ });

// --- Drag-and-Drop Logica (TIJDELIJK STUK) ---
function initDragAndDrop() { console.log("Drag/Drop (tijdelijk stuk)"); }

// ---
// ALLES STARTEN (AANGEPAST)
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        currentUser = user; // Sla de gebruiker globaal op
        laadStamdata(); // NIEUWE STARTFUNCTIE
        initDragAndDrop(); // (Wordt aangeroepen, maar doet nog niets)
    } else {
        currentUser = null;
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
