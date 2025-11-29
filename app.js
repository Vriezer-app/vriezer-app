// Stap 1: Initialiseer Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        // Vul hier eventueel je eigen config in als je die niet via de server krijgt
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
const shoppingListCollectie = db.collection('shoppingList'); 
const weekMenuCollectie = db.collection('weekmenu');

// --- GLOBALE VARIABELEN ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;

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
let vriezerBeheerListener = null; 
let ladeBeheerListener = null;

// Admin & Data Scheiding
let isAdmin = false;
let beheerdeUserId = null; 
let beheerdeUserEmail = null;
let eigenUserId = null;
