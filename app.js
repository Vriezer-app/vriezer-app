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
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let ladesBeheerListener = null; 
let itemsListener = null; 

// ---
// Snelkoppelingen naar elementen
// ---
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
function startScanner() { /* ... (je bestaande code) ... */ }
function sluitScanner() { /* ... (je bestaande code) ... */ }
function onScanSuccess(decodedText, decodedResult) { /* ... (je bestaande code) ... */ }
function onScanFailure(error) { /* ... */ }
async function fetchProductFromOFF(ean) { /* ... (je bestaande code uit Stap 2) ... */ }

// ---
// STAP 2: APP INITIALISATIE (AANGEPAST)
// ---
async function laadStamdata() {
    if (!currentUser) return;
    try {
        const vriezersSnapshot = await vriezersCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleVriezers = vriezersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const ladesSnapshot = await ladesCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleLades = ladesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Stamdata geladen:", alleVriezers.length, "vriezers,", alleLades.length, "lades");
        
        vulToevoegVriezerDropdown();
        
        // --- DIT IS DE FIX (DEEL 1) ---
        // Nu de vriezers en lades bekend zijn, mogen we de items pas ophalen.
        startItemsListener(); 
        // -----------------------------

    } catch (err) {
        console.error("Fout bij laden stamdata:", err);
        showFeedback(err.message, "error");
    }
}

function vulToevoegVriezerDropdown() {
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    alleVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam; 
        vriezerSelect.appendChild(option);
    });
}

vriezerSelect.addEventListener('change', () => {
    const geselecteerdeVriezerId = vriezerSelect.value;
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id; 
        option.textContent = lade.naam; 
        schuifSelect.appendChild(option);
    });
});


// ---
// STAP 3: Items Opslaan (Create) - (uit Stap 2)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
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
        userId: currentUser.uid,
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

// ---
// STAP 3 & 4: DYNAMISCH RENDEREN, FILTERS, DRAG-DROP (uit Stap 3/4)
// ---
function startItemsListener() {
    if (itemsListener) itemsListener(); 
    
    itemsListener = itemsCollectie.where("userId", "==", currentUser.uid)
        .onSnapshot((snapshot) => {
            alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Items bijgewerkt:", alleItems.length);
            // BELANGRIJK: renderDynamischeLijsten() wordt nu HIER aangeroepen,
            // nadat vriezers/lades al geladen zijn.
            renderDynamischeLijsten();
        }, (error) => {
            console.error("Fout bij ophalen items: ", error);
            showFeedback(error.message, "error");
        });
}

function renderDynamischeLijsten() {
    vriezerLijstenContainer.innerHTML = ''; 
    
    alleVriezers.sort((a, b) => a.naam.localeCompare(b.naam));

    alleVriezers.forEach(vriezer => {
        const kolomDiv = document.createElement('div');
        kolomDiv.className = 'vriezer-kolom';
        kolomDiv.innerHTML = `<h2>${vriezer.naam}</h2>`;

        // --- NIEUW: Filter Dropdown Toevoegen ---
        const vriezerLades = alleLades
            .filter(lade => lade.vriezerId === vriezer.id)
            .sort((a, b) => a.naam.localeCompare(b.naam));

        // Maak de filter container alleen als er lades zijn
        if (vriezerLades.length > 0) {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'lade-filter-container';
            
            const filterLabel = document.createElement('label');
            filterLabel.htmlFor = `filter-${vriezer.id}`;
            filterLabel.textContent = 'Toon:';
            
            const filterSelect = document.createElement('select');
            filterSelect.id = `filter-${vriezer.id}`;
            filterSelect.className = 'lade-filter-select';
            
            // Optie "Alles"
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Alle schuiven';
            filterSelect.appendChild(allOption);

            // Vul opties voor elke lade
            vriezerLades.forEach(lade => {
                const ladeOption = document.createElement('option');
                ladeOption.value = lade.id;
                ladeOption.textContent = lade.naam;
                filterSelect.appendChild(ladeOption);
            });

            // Koppel de filterfunctie aan deze dropdown
            filterSelect.addEventListener('change', updateItemVisibility); 
            
            filterContainer.appendChild(filterLabel);
            filterContainer.appendChild(filterSelect);
            kolomDiv.appendChild(filterContainer); // Voeg filter toe aan kolom
        }
        // --- EINDE NIEUW ---
        
        const ul = document.createElement('ul');
        ul.id = `vriezer-${vriezer.id}`; 
            
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        
        vriezerLades.forEach(lade => {
            const titel = document.createElement('h3');
            titel.className = 'schuif-titel';
            titel.textContent = lade.naam;
            titel.dataset.ladeId = lade.id; // Belangrijk voor de filter!
            ul.appendChild(titel);
            
            const ladeItems = vriezerItems
                .filter(item => item.ladeId === lade.id)
                .sort((a, b) => a.naam.localeCompare(b.naam));
                
            ladeItems.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id;
                li.dataset.ladeId = item.ladeId; // Belangrijk voor de filter!
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
                ul.appendChild(li);
            });
        });
        
        kolomDiv.appendChild(ul);
        vriezerLijstenContainer.appendChild(kolomDiv);
    });
    
    initDragAndDrop();
    updateItemVisibility(); 
    updateDashboard(); 
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
    const lijsten = document.querySelectorAll('.vriezer-kolom ul');
    const onDragEnd = (event) => {
        const itemEl = event.item; 
        const itemId = itemEl.dataset.id;
        const oldLadeId = itemEl.dataset.ladeId;
        const newVriezerUL = event.to;
        const newVriezerId = newVriezerUL.id.replace('vriezer-', ''); 
        let currentElement = itemEl.previousElementSibling;
        let ladeTitelElement = null;
        while (currentElement) {
            if (currentElement.tagName === 'H3' && currentElement.classList.contains('schuif-titel')) {
                ladeTitelElement = currentElement;
                break;
            }
            currentElement = currentElement.previousElementSibling;
        }
        if (!ladeTitelElement) {
            console.error("Kon de nieuwe lade-titel niet vinden.");
            renderDynamischeLijsten(); 
            return; 
        }
        const newLadeId = ladeTitelElement.dataset.ladeId;
        const newLadeNaam = ladeTitelElement.textContent;
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
            filter: '.schuif-titel', 
            preventOnFilter: true, 
            ghostClass: 'sortable-ghost', 
            chosenClass: 'sortable-chosen', 
            onEnd: onDragEnd
        });
    });
}

vriezerLijstenContainer.addEventListener('click', (e) => {
    const editButton = e.target.closest('.edit-btn');
    const deleteButton = e.target.closest('.delete-btn');
    const li = e.target.closest('li');
    if (deleteButton) {
        const id = li.dataset.id;
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            itemsCollectie.doc(id).delete()
                .then(() => showFeedback('Item verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
    }
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
        vulEditLadeDropdown(item.vriezerId, item.ladeId);
        editModal.style.display = 'flex';
    }
});

editVriezer.addEventListener('change', () => {
    vulEditLadeDropdown(editVriezer.value); 
});
function vulEditLadeDropdown(vriezerId, selecteerLadeId = null) {
    editSchuif.innerHTML = '';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === vriezerId);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.id === selecteerLadeId) option.selected = true;
        editSchuif.appendChild(option);
    });
}
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam
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
// STAP 6: VRIEZER BEHEER LOGICA (Functioneert - uit Stap 1 & 2)
// ---
vriezerBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'flex';
    laadVriezersBeheer(); 
});
sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
    if (ladesBeheerListener) ladesBeheerListener(); 
    ladesBeheerListener = null;
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
    vriezersCollectie.add({ naam: naam, userId: currentUser.uid })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
        laadStamdata(); // Herlaad stamdata
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
        userId: currentUser.uid 
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
        laadStamdata(); // Herlaad stamdata
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
                laadStamdata(); 
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
                laadStamdata(); 
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
                laadStamdata(); 
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: UITLOGGEN LOGICA (blijft hetzelfde)
// ---
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
    }
});

// ---
// STAP 8: ZOEKBALK LOGICA (AANGEPAST)
// ---
searchBar.addEventListener('input', updateItemVisibility);
function updateItemVisibility() {
    const searchTerm = searchBar.value.toLowerCase();

    // Ga door ELKE vriezer-kolom
    document.querySelectorAll('.vriezer-kolom').forEach(kolom => {
        
        // 1. Wat is de status van de lade-filter voor DEZE kolom?
        const ladeFilter = kolom.querySelector('.lade-filter-select');
        // Als er geen filter is (bv. geen lades), is de waarde 'all'
        const geselecteerdeLadeId = ladeFilter ? ladeFilter.value : 'all';

        // We hebben een tracker nodig om te zien of een lade
        // titels (H3) moet tonen.
        const ladeHeeftZichtbareItems = {}; // { ladeId: true }

        // 2. Loop 1: Bepaal zichtbaarheid ITEMS (LI)
        kolom.querySelectorAll('li').forEach(item => {
            const itemLadeId = item.dataset.ladeId;

            // Check 1: Matcht het de lade-filter?
            const matchesLade = (geselecteerdeLadeId === 'all' || geselecteerdeLadeId === itemLadeId);

            // Check 2: Matcht het de zoekbalk?
            const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
            const matchesSearch = itemText.startsWith(searchTerm);

            if (matchesLade && matchesSearch) {
                item.style.display = 'flex';
                // Markeer deze lade als "heeft zichtbare items"
                ladeHeeftZichtbareItems[itemLadeId] = true; 
            } else {
                item.style.display = 'none';
            }
        });

        // 3. Loop 2: Bepaal zichtbaarheid LADE TITELS (H3)
        kolom.querySelectorAll('.schuif-titel').forEach(titel => {
            const titelLadeId = titel.dataset.ladeId;
            
            if (geselecteerdeLadeId === 'all') {
                // "Alles" modus: Toon titel alleen als er zichtbare items onder staan
                const heeftItems = ladeHeeftZichtbareItems[titelLadeId] === true;
                titel.style.display = heeftItems ? 'block' : 'none';
            } else {
                // "Specifieke Lade" modus: Toon de titel als het de geselecteerde lade is.
                // De items (LI) eronder worden nog steeds gefilterd door de zoekbalk.
                const isGeselecteerdeTitel = (geselecteerdeLadeId === titelLadeId);
                titel.style.display = isGeselecteerdeTitel ? 'block' : 'none';
            }
        });
    });
}

function checkLadesInLijst(lijstElement) {
    const lades = lijstElement.querySelectorAll('.schuif-titel');
    lades.forEach(ladeTitel => {
        let nextElement = ladeTitel.nextElementSibling;
        let itemsInDezeLade = 0, zichtbareItems = 0;
        while (nextElement && nextElement.tagName === 'LI') {
            itemsInDezeLade++;
            if (nextElement.style.display !== 'none') zichtbareItems++;
            nextElement = nextElement.nextElementSibling;
        }
        ladeTitel.style.display = (itemsInDezeLade > 0 && zichtbareItems === 0) ? 'none' : 'block';
    });
}

// ---
// STAP 9: PRINT LOGICA (blijft hetzelfde)
// ---
printBtn.addEventListener('click', () => window.print());

// --- Scanner Listeners (blijft hetzelfde) ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});

// ---
// ALLES STARTEN (AANGEPAST - DE FIX)
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        currentUser = user; 
        
        // --- DIT IS DE FIX (DEEL 2) ---
        // Roep ALLEEN laadStamdata() aan.
        laadStamdata(); 
        // startItemsListener() wordt nu aangeroepen BINNEN laadStamdata(),
        // nadat de vriezers en lades zijn geladen.
        // ------------------------------
        
    } else {
        currentUser = null;
        if (itemsListener) itemsListener(); // Stop de listener bij uitloggen
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
