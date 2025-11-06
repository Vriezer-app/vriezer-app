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
