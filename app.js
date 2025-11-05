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
let uniekeProductNamen = new Set(); // Voor autocomplete

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

// --- SNELKOPPELINGEN VOOR BARCODE ---
const barcodeInput = document.getElementById('item-barcode');
const barcodeSearchBtn = document.getElementById('barcode-search-btn');
const barcodeScanBtn = document.getElementById('barcode-scan-btn');
const scannerModal = document.getElementById('scanner-modal');
const scannerSluitBtn = document.getElementById('scanner-sluit-btn');
const scannerVideo = document.getElementById('scanner-video');


// ---
// HELPER FUNCTIES
// ---
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

// ---
// BARCODE API & SCANNER FUNCTIES
// ---

/**
 * Voert de daadwerkelijke zoekopdracht uit bij de API
 */
async function fetchProductFromAPI(barcode) {
    document.getElementById('item-naam').value = "Bezig met zoeken...";
    
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 1 && data.product && data.product.product_name) {
            let productName = data.product.product_name;
            if (data.product.brands) {
                productName = `${data.product.brands}: ${productName}`;
            }
            document.getElementById('item-naam').value = productName;
            document.getElementById('item-aantal').focus(); 
        } else {
            alert("Product niet gevonden in de database. Voer het handmatig in.");
            document.getElementById('item-naam').value = ""; 
            document.getElementById('item-naam').focus();
        }
    } catch (error) {
        console.error("Fout bij ophalen product:", error);
        alert("Fout bij het verbinden met de product-database.");
        document.getElementById('item-naam').value = "";
    }
}

/**
 * Voegt listeners toe aan de barcode knoppen, het veld, en de camera modal
 */
function initBarcodeScanner() {
    // --- Knop voor Handmatig Zoeken ---
    barcodeSearchBtn.addEventListener('click', () => {
        const barcode = barcodeInput.value;
        if (barcode) {
            fetchProductFromAPI(barcode);
        }
    });
    
    // --- Enter in Handmatig Veld ---
    barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = barcodeInput.value;
            if (barcode) {
                fetchProductFromAPI(barcode);
            }
        }
    });

    // --- LOGICA VOOR DE CAMERA ---
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId;

    // --- Knop om de scan-modal te OPENEN ---
    barcodeScanBtn.addEventListener('click', async () => {
        scannerModal.style.display = 'flex';
        
        try {
            const videoInputDevices = await codeReader.listVideoInputDevices();
            const rearCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('omgeving'));
            
            if (rearCamera) {
                selectedDeviceId = rearCamera.deviceId;
            } else if (videoInputDevices.length > 0) {
                selectedDeviceId = videoInputDevices[0].deviceId;
            } else {
                alert("Geen camera gevonden op dit apparaat.");
                return;
            }

            console.log(`Camera ${selectedDeviceId} wordt gebruikt`);

            const controls = await codeReader.decodeFromVideoDevice(selectedDeviceId, 'scanner-video', (result, err) => {
                if (result) {
                    console.log("Barcode gevonden:", result.text);
                    controls.stop(); 
                    scannerModal.style.display = 'none';
                    
                    barcodeInput.value = result.text;
                    fetchProductFromAPI(result.text);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                }
            });

            // Sla de 'controls' op zodat de "Annuleren" knop werkt
            scannerSluitBtn.onclick = () => {
                controls.stop(); 
                scannerModal.style.display = 'none';
                scannerSluitBtn.onclick = null; 
            };

        } catch (error) {
            console.error("Fout bij starten camera:", error);
            alert(`Fout bij camera: ${error.message}`);
            scannerModal.style.display = 'none';
        }
    });

    // --- Knop om de scan-modal te SLUITEN (fallback) ---
    scannerSluitBtn.addEventListener('click', () => {
        codeReader.reset(); 
        scannerModal.style.display = 'none';
    });
}
// --- EINDE BARCODE FUNCTIES ---


// ---
// STAP 2: LADES OPHALEN & APP INITIALISEREN
// ---
async function laadLades() {
    // Sorteert lades op vriezer, daarna op naam
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


// ---
// STAP 3: Items Opslaan (Create) - NU MET ladeNaam
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 

    // Pak de lade naam uit de dropdown voor correct sorteren
    const schuifDropdown = document.getElementById('item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;

    itemsCollectie.add({
        naam: document.getElementById('item-naam').value,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        vriezer: document.getElementById('item-vriezer').value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam, // <-- VELD VOOR SORTEREN
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // "Onthoud Lade" logica
        const rememberCheck = document.getElementById('remember-drawer-check');
        
        if (rememberCheck.checked) {
            document.getElementById('item-naam').value = '';
            document.getElementById('item-barcode').value = ''; // Reset ook barcode
            document.getElementById('item-aantal').value = 1;
            document.getElementById('item-eenheid').value = "stuks";
            document.getElementById('item-naam').focus(); 
        } else {
            form.reset();
            document.getElementById('item-eenheid').value = "stuks";
            document.getElementById('item-vriezer').value = "";
            schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        }
    });
});

// ---
// STAP 4: Items Tonen (Read) - NU MET ladeNaam sortering
// ---
function laadItems() {
    // SORTEERT NU OP ladeNaam IPV ladeId
    itemsCollectie.orderBy("vriezer").orderBy("ladeNaam").onSnapshot((snapshot) => {
        lijstVriezer1.innerHTML = '';
        lijstVriezer2.innerHTML = '';
        
        let countV1 = 0;
        let countV2 = 0;
        uniekeProductNamen.clear(); // Voor autocomplete

        let huidigeLadeIdV1 = "";
        let huidigeLadeIdV2 = "";

        snapshot.docs.forEach((doc) => {
            const item = doc.data();
            const docId = doc.id;
            
            uniekeProductNamen.add(item.naam); // Vul autocomplete
            
            // Gebruik de opgeslagen ladeNaam, of val terug op de ladesMap (voor oude items)
            const ladeNaam = item.ladeNaam || ladesMap[item.ladeId] || "Onbekende Lade";
            
            const li = document.createElement('li');
            const aantalText = formatAantal(item.aantal, item.eenheid);
            const datumText = formatDatum(item.ingevrorenOp); 
            
            // Kleurcodering logica
            if (item.ingevrorenOp) {
                const ingevrorenDatum = item.ingevrorenOp.toDate();
                const vandaag = new Date();
                const diffTijd = Math.abs(vandaag - ingevrorenDatum);
                const diffDagen = Math.ceil(diffTijd / (1000 * 60 * 60 * 24));

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
                // Gebruik ladeNaam voor de groepering
                if (ladeNaam !== huidigeLadeIdV1) {
                    huidigeLadeIdV1 = ladeNaam;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    lijstVriezer1.appendChild(titel);
                }
                lijstVriezer1.appendChild(li);
            } else if (item.vriezer === 'Vriezer 2') {
                countV2++; 
                // Gebruik ladeNaam voor de groepering
                if (ladeNaam !== huidigeLadeIdV2) {
                    huidigeLadeIdV2 = ladeNaam;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    lijstVriezer2.appendChild(titel);
                }
                lijstVriezer2.appendChild(li);
            }
        });
        
        // Update dashboard
        dashTotaal.textContent = `Totaal: ${countV1 + countV2}`;
        dashV1.textContent = `Vriezer 1: ${countV1}`;
        dashV2.textContent = `Vriezer 2: ${countV2}`;
        
        // Vul autocomplete
        const datalist = document.getElementById('product-suggesties');
        datalist.innerHTML = ''; 
        uniekeProductNamen.forEach(naam => {
            const option = document.createElement('option');
            option.value = naam;
            datalist.appendChild(option);
        });

    }, (error) => {
        console.error("Fout bij ophalen items: ", error);
        if (error.code === 'failed-precondition') {
             alert("FOUT: De database query is mislukt. Waarschijnlijk moet je een 'composite index' (voor vriezer/ladeNaam) aanmaken in je Firebase Console. Check de JavaScript console (F12) voor een directe link om dit te fixen.");
        }
    });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (Listeners) - NU MET ladeNaam
// ---
function handleItemLijstClick(e) {
    const editButton = e.target.closest('.edit-btn');
    const deleteButton = e.target.closest('.delete-btn');

    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            itemsCollectie.doc(id).delete();
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
            const gefilterdeLades = alleLades.filter(lade => lade.vriezer === item.vriezer);
            gefilterdeLades.forEach(lade => {
                const option = document.createElement('option');
                option.value = lade.id;
                option.textContent = lade.naam;
                editSchuif.appendChild(option);
            });
            editSchuif.value = item.ladeId;
            editModal.style.display = 'flex';
        });
    }
}
lijstVriezer1.addEventListener('click', handleItemLijstClick);
lijstVriezer2.addEventListener('click', handleItemLijstClick);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;

    // Pak de lade naam uit de dropdown voor correct sorteren
    const schuifDropdown = document.getElementById('edit-item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;

    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezer: editVriezer.value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam // <-- VELD VOOR SORTEREN
    })
    .then(sluitItemModal);
});
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: LADE BEHEER LOGICA
// ---
beheerLadesKnop.addEventListener('click', () => {
    ladeBeheerModal.style.display = 'flex';
});
sluitLadeBeheerKnop.addEventListener('click', () => {
    ladeBeheerModal.style.display = 'none';
});

function vulLadeBeheerLijst() {
    ladesLijstV1.innerHTML = '';
    ladesLijstV2.innerHTML = '';
    alleLades.forEach(lade => {
        const li = document.createElement('li');
        const naamInput = document.createElement('input');
        naamInput.type = 'text';
        naamInput.value = lade.naam;
        naamInput.className = 'lade-naam-input';
        naamInput.dataset.id = lade.id; 
        const vriezerTekst = document.createElement('span');
        vriezerTekst.textContent = `(${lade.vriezer})`;
        
        const buttons = document.createElement('div');
        buttons.className = 'item-buttons';
        buttons.innerHTML = `
            <button class="save-btn" data-id="${lade.id}" title="Opslaan">
                <i class="fas fa-save"></i>
            </button>
            <button class="delete-btn" data-id="${lade.id}" title="Verwijder">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        li.appendChild(naamInput);
        li.appendChild(vriezerTekst);
        li.appendChild(buttons);
        if (lade.vriezer === 'Vriezer 1') {
            ladesLijstV1.appendChild(li);
        } else {
            ladesLijstV2.appendChild(li);
        }
    });
}

addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    const vriezer = document.getElementById('lade-vriezer').value;
    ladesCollectie.add({
        naam: naam,
        vriezer: vriezer
    })
    .then(() => {
        addLadeForm.reset();
    });
});

async function handleLadeLijstClick(e) {
    const deleteButton = e.target.closest('.delete-btn');
    const saveButton = e.target.closest('.save-btn');

    if (deleteButton) {
        const id = deleteButton.dataset.id;
        const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
        if (!itemsCheck.empty) {
            alert("Kan lade niet verwijderen: er zitten nog items in! Verplaats deze items eerst.");
            return;
        }
        if (confirm("Weet je zeker dat je deze (lege) lade wilt verwijderen?")) {
            ladesCollectie.doc(id).delete();
        }
    }
    
    if (saveButton) {
        const id = saveButton.dataset.id;
        const parentLi = saveButton.closest('li');
        const inputVeld = parentLi.querySelector('.lade-naam-input');
        const newNaam = inputVeld.value;
        if (newNaam) {
            ladesCollectie.doc(id).update({
                naam: newNaam
            })
            .then(() => alert("Lade hernoemd!"));
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
        auth.signOut()
            .then(() => {
                console.log("Gebruiker uitgelogd.");
            })
            .catch((error) => {
                console.error("Fout bij uitloggen:", error);
                alert("Er is een fout opgetreden bij het uitloggen.");
            });
    }
});

// ---
// STAP 8: ZOEKBALK LOGICA
// ---
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterItems(searchTerm);
});

function filterItems(term) {
    const items = document.querySelectorAll('#lijst-vriezer-1 li, #lijst-vriezer-2 li');
    
    items.forEach(item => {
        const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
        
        if (itemText.startsWith(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    checkLadesInLijst(document.getElementById('lijst-vriezer-1'));
    checkLadesInLijst(document.getElementById('lijst-vriezer-2'));
}

function checkLadesInLijst(lijstElement) {
    const lades = lijstElement.querySelectorAll('.schuif-titel');
    
    lades.forEach(ladeTitel => {
        let nextElement = ladeTitel.nextElementSibling;
        let itemsInDezeLade = 0;
        let zichtbareItems = 0;

        while (nextElement && nextElement.tagName === 'LI') {
            itemsInDezeLade++;
            if (nextElement.style.display !== 'none') {
                zichtbareItems++;
            }
            nextElement = nextElement.nextElementSibling;
        }

        if (itemsInDezeLade > 0 && zichtbareItems === 0) {
            ladeTitel.style.display = 'none';
        } else {
            ladeTitel.style.display = 'block';
        }
    });
}

// ---
// STAP 9: PRINT LOGICA
// ---
printBtn.addEventListener('click', () => {
    window.print();
});


// ---
// ALLES STARTEN
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        laadLades(); // Hoofdfunctie die alles start
        initBarcodeScanner(); // <-- HIER WORDT DE SCANNER GESTART
    } else {
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});


