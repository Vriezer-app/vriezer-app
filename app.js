// Stap 1: Initialiseer Firebase
// AANGEPAST: Gebruik dezelfde config-logica als auth.js
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
const auth = firebase.auth(); // NIEUW: Auth instance toevoegen
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


// ---
// HELPER FUNCTIE VOOR AANTALLEN
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
// STAP 3: Items Opslaan (Create)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    itemsCollectie.add({
        naam: document.getElementById('item-naam').value,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        vriezer: document.getElementById('item-vriezer').value,
        ladeId: document.getElementById('item-schuif').value,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        form.reset();
        document.getElementById('item-eenheid').value = "stuks";
        document.getElementById('item-vriezer').value = "";
        schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
    });
});

// ---
// STAP 4: Items Tonen (Read)
// ---
function laadItems() {
    itemsCollectie.orderBy("vriezer").orderBy("ladeId").onSnapshot((snapshot) => {
        lijstVriezer1.innerHTML = '';
        lijstVriezer2.innerHTML = '';
        let huidigeLadeIdV1 = "";
        let huidigeLadeIdV2 = "";

        snapshot.docs.forEach((doc) => {
            const item = doc.data();
            const docId = doc.id;
            const ladeNaam = ladesMap[item.ladeId] || "Onbekende Lade";
            const li = document.createElement('li');
            const aantalText = formatAantal(item.aantal, item.eenheid);
            
            // AANGEPAST: Knoppen zijn nu iconen
            li.innerHTML = `
                <div class="item-text">
                    <strong>${item.naam} (${aantalText})</strong>
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
                if (item.ladeId !== huidigeLadeIdV1) {
                    huidigeLadeIdV1 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    lijstVriezer1.appendChild(titel);
                }
                lijstVriezer1.appendChild(li);
            } else if (item.vriezer === 'Vriezer 2') {
                if (item.ladeId !== huidigeLadeIdV2) {
                    huidigeLadeIdV2 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    lijstVriezer2.appendChild(titel);
                }
                lijstVriezer2.appendChild(li);
            }
        });
    }, (error) => {
        console.error("Fout bij ophalen items: ", error);
        if (error.code === 'failed-precondition') {
             alert("FOUT: De database query is mislukt. Waarschijnlijk moet je een 'composite index' (voor vriezer/ladeId) aanmaken in je Firebase Console. Check de JavaScript console (F12) voor een directe link om dit te fixen.");
        }
    });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (Listeners)
// ---
function handleItemLijstClick(e) {
    // We gebruiken .closest() om zeker te zijn dat we de knop klikken,
    // zelfs als de gebruiker op het <i> icoon zelf klikt.
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
    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezer: editVriezer.value,
        ladeId: editSchuif.value
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
        
        // AANGEPAST: Knoppen zijn nu iconen
        // Ik geef "Opslaan" een nieuwe class "save-btn" voor de duidelijkheid
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
    const saveButton = e.target.closest('.save-btn'); // AANGEPAST

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
    
    // AANGEPAST: Zoekt nu naar .save-btn
    if (saveButton) {
        const id = saveButton.dataset.id;
        const parentLi = saveButton.closest('li');
        const inputVeld = parentLi.querySelector('.lade-naam-input');
        const nieuweNaam = inputVeld.value;
        if (nieuweNaam) {
            ladesCollectie.doc(id).update({
                naam: nieuweNaam
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
                // De onAuthStateChanged listener (hieronder)
                // pakt dit automatisch op en stuurt de gebruiker
                // terug naar index.html.
            })
            .catch((error) => {
                console.error("Fout bij uitloggen:", error);
                alert("Er is een fout opgetreden bij het uitloggen.");
            });
    }
});
// ---
// ALLES STARTEN
// ---
// AANGEPAST: Start de app pas na een succesvolle auth check
auth.onAuthStateChanged((user) => {
    if (user) {
        // Gebruiker is ingelogd, laad de lades (en de rest van de app)
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        laadLades();
    } else {
        // Gebruiker is niet ingelogd, stuur terug naar de login pagina
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
