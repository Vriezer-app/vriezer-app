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

// ---
// GLOBALE VARIABELEN
// ---
let alleLades = [];
let ladesMap = {};

// ---
// Snelkoppelingen naar elementen
// ---
const form = document.getElementById('add-item-form');
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
const ladeBeheerModal = document.getElementById('lade-beheer-modal');
const beheerLadesKnop = document.getElementById('beheer-lades-knop');
const sluitLadeBeheerKnop = document.getElementById('btn-sluit-lade-beheer');
const addLadeForm = document.getElementById('add-lade-form');
const ladesLijstV1 = document.getElementById('lades-lijst-v1');
const ladesLijstV2 = document.getElementById('lades-lijst-v2');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn');
const dashTotaal = document.getElementById('dash-totaal');
const dashV1 = document.getElementById('dash-v1');
const dashV2 = document.getElementById('dash-v2');

// --- Snelkoppelingen voor feedback en filters ---
const feedbackMessage = document.getElementById('feedback-message');
const filterV1 = document.getElementById('filter-v1');
const filterV2 = document.getElementById('filter-v2');

// --- Snelkoppelingen voor Barcode Scanner ---
const scanBtn = document.getElementById('scan-btn');
const scanModal = document.getElementById('scan-modal');
const stopScanBtn = document.getElementById('btn-stop-scan');
const scannerContainerId = "barcode-scanner-container";
const manualEanBtn = document.getElementById('manual-ean-btn');
let html5QrCode;
// ---------------------------------------------------


// ---
// HELPER FUNCTIES
// ---

// --- Functie voor visuele feedback ---
function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback'; // Reset klassen
    feedbackMessage.classList.add(type);    // Voeg 'success' of 'error' toe
    feedbackMessage.classList.add('show');
    
    setTimeout(() => {
        feedbackMessage.classList.remove('show');
    }, 3000);
}

function formatAantal(aantal, eenheid) {
    if (!eenheid || eenheid === 'stuks') {
        return `${aantal}x`;
    }
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
    const datum = timestamp.toDate();
    return datum.toLocaleDateString('nl-BE');
}

// --- BARCODE SCANNER LOGICA ---
function startScanner() {
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode(scannerContainerId);
    }
    scanModal.style.display = 'flex';
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onScanSuccess,  
        onScanFailure   
    ).catch(err => {
        console.error("Kan camera niet starten:", err);
        showFeedback("Kan camera niet starten. Heb je permissie gegeven?", "error");
        sluitScanner();
    });
}
function sluitScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.warn("Scanner kon niet netjes stoppen:", err));
    }
    scanModal.style.display = 'none';
}
function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan succesvol, EAN: ${decodedText}`);
    sluitScanner();
    fetchProductFromOFF(decodedText);
}
function onScanFailure(error) { /* Genegeerd */ }
async function fetchProductFromOFF(ean) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`;
    document.getElementById('item-naam').value = "Product zoeken...";
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Product niet gevonden (404)');
        const data = await response.json();
        if (data.status === 0 || !data.product) throw new Error('Product niet gevonden in Open Food Facts');

        const productName = data.product.product_name_nl || 
                            data.product.generic_name_nl || 
                            data.product.product_name_en || 
                            data.product.generic_name_en || 
                            data.product.product_name ||
                            null;

        if (productName) {
            document.getElementById('item-naam').value = productName;
            showFeedback('Productnaam ingevuld!', 'success');
        } else {
            throw new Error('Product gevonden, maar geen (NL) naam beschikbaar');
        }
    } catch (error) {
        console.error("Open Food Facts Fout:", error.message);
        showFeedback(error.message, 'error');
        document.getElementById('item-naam').value = "";
    }
}
// --- EINDE BARCODE SCANNER LOGICA ---

// ---
// STAP 2: LADES OPHALEN & APP INITIALISEREN
// ---
async function laadLades() {
    ladesCollectie.orderBy("vriezer").orderBy("naam").onSnapshot(snapshot => {
        alleLades = [];
        ladesMap = {};
        snapshot.docs.forEach(doc => {
            const lade = { id: doc.id, ...doc.data() };
            alleLades.push(lade);
            ladesMap[lade.id] = lade.naam;
        });
        vulLadeBeheerLijst();
        vulSchuifDropdowns();
        vulLadeFilterDropdowns();
        laadItems(); 
    });
}

function vulSchuifDropdowns() {
    const geselecteerdeVriezer = vriezerSelect.value;
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezer === geselecteerdeVriezer);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        schuifSelect.appendChild(option);
    });
}
vriezerSelect.addEventListener('change', vulSchuifDropdowns);

function vulLadeFilterDropdowns() {
    filterV1.innerHTML = '<option value="alles">Alle Lades</option>';
    filterV2.innerHTML = '<option value="alles">Alle Lades</option>';
    alleLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.vriezer === 'Vriezer 1') filterV1.appendChild(option);
        else if (lade.vriezer === 'Vriezer 2') filterV2.appendChild(option);
    });
}

// ---
// STAP 3: Items Opslaan (Create)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const schuifDropdown = document.getElementById('item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;
    const itemNaam = document.getElementById('item-naam').value;
    itemsCollectie.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        vriezer: document.getElementById('item-vriezer').value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
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
            document.getElementById('item-vriezer').value = "";
            schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        }
    }).catch((err) => {
        console.error("Fout bij toevoegen: ", err);
        showFeedback(`Fout bij toevoegen: ${err.message}`, 'error');
    });
});

// ---
// STAP 4: Items Tonen (Read) - AANGEPAST VOOR DRAG-AND-DROP
// ---
function laadItems() {
    itemsCollectie.orderBy("vriezer").orderBy("ladeNaam").onSnapshot((snapshot) => {
        lijstVriezer1.innerHTML = '';
        lijstVriezer2.innerHTML = '';
        let countV1 = 0, countV2 = 0;
        let huidigeLadeIdV1 = "", huidigeLadeIdV2 = "";

        snapshot.docs.forEach((doc) => {
            const item = doc.data();
            const docId = doc.id;
            const ladeNaam = ladesMap[item.ladeId] || "Onbekende Lade";
            const li = document.createElement('li');
            
            // --- AANGEPAST: Data-attributen toevoegen voor Drag-and-Drop ---
            li.dataset.id = docId;
            li.dataset.ladeId = item.ladeId;
            li.dataset.vriezer = item.vriezer;
            // ----------------------------------------------------

            li.dataset.ladeId = item.ladeId; // Ook voor filters
            const aantalText = formatAantal(item.aantal, item.eenheid);
            const datumText = formatDatum(item.ingevrorenOp);
            
            if (item.ingevrorenOp) {
                const ingevrorenDatum = item.ingevrorenOp.toDate();
                const diffDagen = Math.ceil(Math.abs(new Date() - ingevrorenDatum) / (1000 * 60 * 60 * 24));
                if (diffDagen > 180) { li.classList.add('item-old'); }
                else if (diffDagen > 90) { li.classList.add('item-medium'); }
                else { li.classList.add('item-fresh'); }
            }   
            
            li.innerHTML = `
                <div class="item-text">
                    <strong>${item.naam} (${aantalText})</strong>
                    <small style="display: block; color: #555;">Ingevroren op: ${datumText}</small>
                </div>
                <div class="item-buttons">
                    <button class="edit-btn" data-id="${docId}" title="Bewerken">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="delete-btn" data-id="${docId}" title="Verwijder">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            if (item.vriezer === 'Vriezer 1') {
                countV1++;
                if (item.ladeId !== huidigeLadeIdV1) {
                    huidigeLadeIdV1 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    titel.dataset.ladeId = item.ladeId;
                    lijstVriezer1.appendChild(titel);
                }
                lijstVriezer1.appendChild(li);
            } else if (item.vriezer === 'Vriezer 2') {
                countV2++;
                if (item.ladeId !== huidigeLadeIdV2) {
                    huidigeLadeIdV2 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    titel.dataset.ladeId = item.ladeId;
                    lijstVriezer2.appendChild(titel);
                }
                lijstVriezer2.appendChild(li);
            }
        });
        
        dashTotaal.textContent = `Totaal: ${countV1 + countV2}`;
        dashV1.textContent = `Vriezer 1: ${countV1}`;
        dashV2.textContent = `Vriezer 2: ${countV2}`;
        
        updateItemVisibility();
    }, (error) => {
        console.error("Fout bij ophalen items: ", error);
        showFeedback(`Databasefout: ${error.message}`, 'error');
        if (error.code === 'failed-precondition') {
             alert("FOUT: De database query is mislukt. Waarschijnlijk moet je een 'composite index' (voor vriezer/ladeId) aanmaken in je Firebase Console. Check de JavaScript console (F12) voor een directe link om dit te fixen.");
        }
    });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (Listeners)
// ---
function handleItemLijstClick(e) {
    const editButton = e.target.closest('.edit-btn');
    const deleteButton = e.target.closest('.delete-btn');
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            itemsCollectie.doc(id).delete()
                .then(() => showFeedback('Item verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
        }
    }
    if (editButton) {
        const id = editButton.dataset.id;
        itemsCollectie.doc(id).get().then((doc) => {
            const item = doc.data();
            editId.value = id;
            editNaam.value = item.naam;
            editAantal.value = item.aantal;
            editEenheid.value = item.eenheid || 'stuks';
            editVriezer.value = item.vriezer;
            editSchuif.innerHTML = '';
            alleLades.filter(lade => lade.vriezer === item.vriezer).forEach(lade => {
                const option = document.createElement('option');
                option.value = lade.id;
                option.textContent = lade.naam;
                editSchuif.appendChild(option);
            });
            editSchuif.value = item.ladeId;
            editModal.style.display = 'flex';
        }).catch((err) => showFeedback(`Fout bij ophalen: ${err.message}`, 'error'));
    }
}
lijstVriezer1.addEventListener('click', handleItemLijstClick);
lijstVriezer2.addEventListener('click', handleItemLijstClick);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const schuifDropdown = document.getElementById('edit-item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;
    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezer: editVriezer.value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam
    }).then(() => {
        sluitItemModal();
        showFeedback('Item bijgewerkt!', 'success');
    }).catch((err) => showFeedback(`Fout bij bijwerken: ${err.message}`, 'error'));
});
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: LADE BEHEER LOGICA
// ---
beheerLadesKnop.addEventListener('click', () => ladeBeheerModal.style.display = 'flex');
sluitLadeBeheerKnop.addEventListener('click', () => ladeBeheerModal.style.display = 'none');
function vulLadeBeheerLijst() {
    ladesLijstV1.innerHTML = '';
    ladesLijstV2.innerHTML = '';
    alleLades.forEach(lade => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="text" value="${lade.naam}" class="lade-naam-input" data-id="${lade.id}">
            <span>(${lade.vriezer})</span>
            <div class="item-buttons">
                <button class="save-btn" data-id="${lade.id}" title="Opslaan"><i class="fas fa-save"></i></button>
                <button class="delete-btn" data-id="${lade.id}" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        if (lade.vriezer === 'Vriezer 1') ladesLijstV1.appendChild(li);
        else ladesLijstV2.appendChild(li);
    });
}
addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    const vriezer = document.getElementById('lade-vriezer').value;
    ladesCollectie.add({ naam: naam, vriezer: vriezer })
        .then(() => {
            addLadeForm.reset();
            showFeedback('Nieuwe lade toegevoegd!', 'success');
        })
        .catch((err) => showFeedback(`Fout: ${err.message}`, 'error'));
});
async function handleLadeLijstClick(e) {
    const deleteButton = e.target.closest('.delete-btn');
    const saveButton = e.target.closest('.save-btn');
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
        if (!itemsCheck.empty) {
            showFeedback('Kan lade niet verwijderen: er zitten nog items in!', 'error');
            return;
        }
        if (confirm("Weet je zeker dat je deze (lege) lade wilt verwijderen?")) {
            ladesCollectie.doc(id).delete()
                .then(() => showFeedback('Lade verwijderd.', 'success'))
                .catch((err) => showFeedback(`Fout: ${err.message}`, 'error'));
        }
    }
    if (saveButton) {
        const id = saveButton.dataset.id;
        const nieuweNaam = saveButton.closest('li').querySelector('.lade-naam-input').value;
        if (nieuweNaam) {
            ladesCollectie.doc(id).update({ naam: nieuweNaam })
                .then(() => showFeedback('Lade hernoemd!', 'success'))
                .catch((err) => showFeedback(`Fout: ${err.message}`, 'error'));
        }
    }
}
ladesLijstV1.addEventListener('click', handleLadeLijstClick);
ladesLijstV2.addEventListener('click', handleLadeLijstClick);

// ---
// STAP 7: UITLOGGEN LOGICA
// ---
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
    }
});

// ---
// STAP 8: ZOEKBALK & FILTER LOGICA
// ---
searchBar.addEventListener('input', updateItemVisibility);
filterV1.addEventListener('change', updateItemVisibility);
filterV2.addEventListener('change', updateItemVisibility);
function updateItemVisibility() {
    const searchTerm = searchBar.value.toLowerCase();
    const geselecteerdeFilterV1 = filterV1.value;
    const geselecteerdeFilterV2 = filterV2.value;
    document.querySelectorAll('#lijst-vriezer-1 li').forEach(item => {
        const matchesSearch = item.querySelector('.item-text strong').textContent.toLowerCase().startsWith(searchTerm);
        const matchesFilter = (geselecteerdeFilterV1 === 'alles' || item.dataset.ladeId === geselecteerdeFilterV1);
        item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
    });
    document.querySelectorAll('#lijst-vriezer-2 li').forEach(item => {
        const matchesSearch = item.querySelector('.item-text strong').textContent.toLowerCase().startsWith(searchTerm);
        const matchesFilter = (geselecteerdeFilterV2 === 'alles' || item.dataset.ladeId === geselecteerdeFilterV2);
        item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
    });
    checkLadesInLijst(document.getElementById('lijst-vriezer-1'));
    checkLadesInLijst(document.getElementById('lijst-vriezer-2'));
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
// STAP 9: PRINT LOGICA
// ---
printBtn.addEventListener('click', () => window.print());

// --- Event Listeners voor de Scanner ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});

// --- NIEUW: Drag-and-Drop Logica ---
function initDragAndDrop() {
    // Functie die wordt aangeroepen wanneer het slepen stopt
    const onDragEnd = (event) => {
        const itemEl = event.item; // Het <li> element dat is verplaatst
        const itemId = itemEl.dataset.id;
        const oldLadeId = itemEl.dataset.ladeId;
        const oldVriezer = itemEl.dataset.vriezer;

        // Bepaal de nieuwe vriezer
        const newVriezerEl = event.to; // De <ul> waar het in is gedropt
        const newVriezer = (newVriezerEl.id === 'lijst-vriezer-1') ? 'Vriezer 1' : 'Vriezer 2';

        // Vind de lade-titel (H3) die het dichtst boven het item staat
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
            console.error("Kon de nieuwe lade-titel niet vinden. Verplaatsing geannuleerd.");
            // Dit zou niet mogen gebeuren als de lijst correct is
            return; 
        }

        const newLadeId = ladeTitelElement.dataset.ladeId;
        const newLadeNaam = ladeTitelElement.textContent;

        // Check of er daadwerkelijk iets is gewijzigd
        if (oldLadeId === newLadeId && oldVriezer === newVriezer) {
            console.log("Item verplaatst binnen dezelfde lade. Geen DB update nodig.");
            return;
        }

        console.log(`Verplaats item ${itemId} naar Vriezer: ${newVriezer}, Lade: ${newLadeNaam}`);
        
        // Update het item in de database
        itemsCollectie.doc(itemId).update({
            vriezer: newVriezer,
            ladeId: newLadeId,
            ladeNaam: newLadeNaam
        })
        .then(() => {
            showFeedback('Item verplaatst!', 'success');
            // De onSnapshot listener zal de lijst automatisch correct opnieuw renderen.
        })
        .catch((err) => {
            console.error("Fout bij verplaatsen:", err);
            showFeedback(`Fout bij verplaatsen: ${err.message}`, 'error');
        });
    };

    // Initialiseer SortableJS op beide lijsten
    const options = {
        animation: 150,
        group: 'vriezer-items', // Zorgt dat je tussen lijsten kunt slepen
        handle: '.item-text',   // Alleen sleepbaar via de tekst (niet de knoppen)
        filter: '.schuif-titel', // Zorgt dat je de titels niet kunt slepen
        preventOnFilter: true, // Verplicht voor 'filter'
        ghostClass: 'sortable-ghost', // CSS-klasse voor de placeholder
        chosenClass: 'sortable-chosen', // CSS-klasse voor het item dat je vasthebt
        onEnd: onDragEnd // Koppel onze functie aan het 'einde' event
    };

    // 'Sortable' komt van de script-tag die we in de HTML hebben geladen
    new Sortable(lijstVriezer1, options);
    new Sortable(lijstVriezer2, options);
}

// ---
// ALLES STARTEN
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        initDragAndDrop(); // --- NIEUW: Activeer drag-and-drop
        laadLades(); // Dit start de hele ketting
    } else {
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
