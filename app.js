const { useState, useEffect, useRef } = React;

// --- 1. FIREBASE CONFIGURATIE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyCgsIQ-tGKor53WqsLoobZgI31xcCkdu48", 
        authDomain: "voorraad-7a7b2.firebaseapp.com",
        projectId: "voorraad-7a7b2",
        storageBucket: "vriezer-app.firebasestorage.app",
        messagingSenderId: "902712789943",
        appId: "1:902712789943:web:ef270b84968319052cf632"
    };

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Offline-modus: Firestore cachet data lokaal (IndexedDB), zodat de app blijft werken
// zonder internetverbinding en wijzigingen automatisch synct zodra je weer online bent.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Offline-persistentie kon niet worden ingeschakeld: app is in meerdere tabbladen open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Offline-persistentie wordt niet ondersteund door deze browser.');
    }
});

// Registreer de service worker voor het cachen van de app-shell (HTML/JS/iconen),
// zodat de app ook offline kan opstarten.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
            console.warn('Service worker registratie mislukt:', err);
        });
    });
}

// --- 2. CONFIGURATIE DATA ---

// Vertalingen voor de belangrijkste navigatie en veelgebruikte UI-teksten.
// LET OP: dit dekt de kernnavigatie/chrome (tabbladen, knoppen, koppen) — niet elke
// tekst in elke modal is vertaald. Onvertaalde teksten vallen automatisch terug op NL.
const TRANSLATIONS = {
    nl: {
        tab_vriezer: 'Vriez', tab_frig: 'Frig', tab_voorraad: 'Stock', tab_weekmenu: 'Week', tab_recepten: 'Recepten',
        nav_vriezer_full: 'Vriez.', nav_frig_full: 'Frig.', nav_voorraad_full: 'Stock.', nav_weekmenu_full: 'Week.', nav_recepten_full: 'Recepten.',
        search_placeholder: 'Zoek producten...', items_label: 'items',
        btn_filter: 'Filter', btn_select: 'Selecteer', btn_calendar: 'Kalender', btn_list: 'Lijst', btn_rapid: 'Snelle invoer',
        btn_add: 'Toevoegen', btn_save: 'Opslaan', btn_cancel: 'Annuleren', btn_delete: 'Verwijderen', btn_edit: 'Bewerken',
        all_open: 'Alles open', all_closed: 'Alles dicht',
        profile_light: 'Licht.', profile_dark: 'Donker.', profile_logout: 'Uitloggen.'
    }
};

const APP_VERSION = '10.2'; 

// Versie Geschiedenis Data
const VERSION_HISTORY = [
    { 
        version: '10.2', 
        type: 'update', 
        changes: [
            'Compact Design: De app is teruggezet naar een strakkere, compactere en subtielere weergave voor meer overzicht op je scherm.',
            'Lijstweergave: Horizontale scheidingslijntjes zijn volledig verwijderd. De categoriekleur wordt nu perfect als subtiel verticaal balkje weergegeven.',
            'Logboek: Het logboek toont weer overzichtelijke, smalle balkjes zodat je meer geschiedenis in één oogopslag ziet.'
        ] 
    },
    { 
        version: '10.1', 
        type: 'update', 
        changes: [
            'Mobiele Weergave: De productnamen worden niet meer vroegtijdig afgekapt op kleine schermen. De tekstgrootte is iets compacter gemaakt voor perfecte leesbaarheid.',
            'Slimme Actieknoppen: Op je smartphone zijn de actieknoppen (bewerken, verwijderen) nu verborgen. Klik (tap) op een product en ze schuiven met een vloeiende animatie in beeld!',
            'Layout: Eenheden (zoals "pak" of "zak") staan niet langer in het vet, wat zorgt voor een schonere uitstraling.'
        ] 
    },
    { 
        version: '10.0', 
        type: 'feature', 
        changes: [
            'Nieuw UI Design: Moderne glassmorphism effecten, vloeiende animaties en een strakkere dark-mode!',
            'Interface: De navigatiebalk is nu stijlvol transparant (backdrop-blur) zodat je content er prachtig onderdoor scrollt.'
        ] 
    },
    { 
        version: '9.0', 
        type: 'feature', 
        changes: [
            'Nieuw: Snelle Invoer (Rapid Entry)! Klik op het bliksem-icoon (⚡) om een balk te openen waarmee je razendsnel producten toevoegt door simpelweg op Enter te drukken.',
            'Nieuw: Kalender Weergave! Wissel met de kalenderknop naar een prachtig chronologisch overzicht van je producten om in één oogopslag te zien wat (bijna) over de datum is.'
        ] 
    }
];

// Standaard Onboarding Tour (Als fallback)
const DEFAULT_TOUR_STEPS = [
    {
        title: "Welkom bij Voorraad! 🎉",
        content: "Wat leuk dat je de app gebruikt! In deze korte rondleiding leggen we je de belangrijkste functies uit zodat je direct aan de slag kunt met het besparen van voedsel.",
        icon: "Box",
        colorName: "blue"
    },
    {
        title: "Snel Toevoegen",
        content: "Rechtsonder zie je always de zwevende '+' knop. Hiermee voeg je razendsnel nieuwe producten toe aan je vriezer, koelkast of voorraadkast. Je kunt zelfs een Emoji instellen!",
        icon: "Plus",
        colorName: "green"
    },
    {
        title: "Houdbaarheid Checken",
        content: "De app helpt je onthouden wat je moet opeten. Producten kleuren automatisch Oranje of Rood als ze de houdbaarheidsdatum naderen, of als ze te lang in de vriezer liggen.",
        icon: "Alert",
        colorName: "orange"
    },      
    {
        title: "Slimme Boodschappenlijst",
        content: "Stel een minimum voorraad in! Zodra een product bijna op is, zet de app dit automatisch op je boodschappenlijstje. Super handig voor in de supermarkt.",
        icon: "ShoppingCart",
        colorName: "purple"
    }
];

// Standaard kleuren voor badges
const BADGE_COLORS = {
    gray: "bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:border-stone-600",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800",
    blue: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800",
    pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800"
};

const GRADIENTS = {
    blue: "from-teal-600 to-emerald-500",
    purple: "from-purple-600 to-indigo-500",
    pink: "from-pink-500 to-rose-500",
    orange: "from-orange-500 to-yellow-500",
    green: "from-emerald-600 to-teal-500",
    red: "from-red-600 to-orange-600",
    gray: "from-stone-700 to-stone-500",
    teal: "from-cyan-600 to-teal-400",
    indigo: "from-indigo-600 to-teal-500"
};

const TOUR_COLORS = ['blue', 'green', 'orange', 'yellow', 'purple', 'red', 'pink', 'indigo', 'gray'];

// Herbruikbare className-constanten (voorkomen duplicatie van veelgebruikte stijlen)
const CX_LABEL = "text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide";
const CX_MENU_ITEM = "w-full text-left px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-stone-700 flex items-center gap-2 transition-colors";
const CX_INPUT = "w-full p-2.5 bg-white dark:bg-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm";

const WINKELS = [
    { name: "AH", color: "blue" },
    { name: "Colruyt", color: "orange" },
    { name: "Delhaize", color: "gray" },
    { name: "Aldi", color: "blue" },
    { name: "Lidl", color: "yellow" },
    { name: "Jumbo", color: "yellow" },
    { name: "Carrefour", color: "blue" },
    { name: "Kruidvat", color: "red" },
    { name: "Action", color: "blue" },
    { name: "Overig", color: "gray" }
];

const CATEGORIEEN_VRIES = [
    { name: "Vlees", color: "red" }, { name: "Vis", color: "blue" }, { name: "Groenten", color: "green" },
    { name: "Fruit", color: "yellow" }, { name: "Brood", color: "yellow" }, { name: "IJs", color: "pink" },
    { name: "Restjes", color: "gray" }, { name: "Saus", color: "red" }, { name: "Friet", color: "yellow" },
    { name: "Pizza", color: "orange" }, { name: "Soep", color: "orange" }, { name: "Ander", color: "gray" }
];
const EENHEDEN_VRIES = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "pak"];

const CATEGORIEEN_FRIG = [
    { name: "Vlees", color: "red" }, { name: "Vis", color: "blue" }, { name: "Groenten", color: "green" },
    { name: "Fruit", color: "yellow" }, { name: "Zuivel", color: "blue" }, { name: "Kaas", color: "yellow" },
    { name: "Beleg", color: "pink" }, { name: "Drank", color: "blue" }, { name: "Saus", color: "red" },
    { name: "Restjes", color: "gray" }, { name: "Soep", color: "orange" }, { name: "Ander", color: "gray" }
];
const EENHEDEN_FRIG = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "pak", "fles", "pot"];

const CATEGORIEEN_VOORRAAD = [
    { name: "Pasta", color: "yellow" }, { name: "Rijst", color: "gray" }, { name: "Conserven", color: "red" },
    { name: "Saus", color: "red" }, { name: "Kruiden", color: "green" }, { name: "Bakproducten", color: "yellow" },
    { name: "Snacks", color: "orange" }, { name: "Drank", color: "blue" }, { name: "Huishoud", color: "gray" },
    { name: "Ander", color: "gray" }
];
const EENHEDEN_VOORRAAD = ["stuks", "pak", "fles", "blik", "pot", "liter", "kilo", "gram", "zak", "doos"];
const AVAILABLE_TAGS = ['Restje', 'Snel klaar', 'Voor bezoek', 'Glutenvrij', 'Pittig', 'Vegetarisch', 'Aanbieding'];
const CATEGORIEEN_RECEPT = ["Hoofdgerecht", "Voorgerecht", "Dessert", "Ontbijt", "Lunch", "Snack", "Soep", "Basisrecept"];
const EENHEDEN_RECEPT = ["naar smaak", "snufje", "teentje(s)", "el", "tl", "gram", "kilo", "ml", "liter", "stuks", "blikje", "pakje", "druppel(s)", "takje(s)"];

const EMOJI_CATEGORIES = {
    "Fruit.": ["🍏", "🍐", "🍊", "🍋", "🍌", "🍎", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🥑", "🫒", "🍋‍🟩"],
    "Groenten.": ["🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰", "🍠", "🫛", "🍅", "🫚", "🍄‍🟫"],
    "Vlees.": ["🥩", "🍗", "🍖", "🥓", "🍔", "🌭", "🍳", "🥚", "🧀"],
    "Vis.": ["🐟", "🐠", "🐡", "🦈", "🐙", "🦀", "🦞", "🦐", "🦑", "🦪", "🍣", "🍤", "🎏"],
    "Deegwaren.": ["🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🥟", "🥠", "🥡", "🍜", "🍝", "🍕", "🍔"],
    "Fastfood.": ["🍟", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "バター", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍢", "🍥", "🍡"],
    "Dessert.": ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"],
    "Drinken.": ["🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧃", "🧉"],
     "Dieren.": ["🐈", "😺", "🐈‍⬛", "😸", "🐄", "🐂", "🐃", "🐖", "🐏", "🐑", "🐐", "🐓", "🦃", "🦆", "🕊️", "🦢", "🪿", "🦤", "🐤", "🦬", "🐫", "🦘", "🐇", "🐷", "🐮", "🐔", "🐗", "🐴", "🫎", "🦏", "🐊"],
    "Voorraad basis.": ["🍝", "🍚", "🥫", "🫙", "🥡", "🧂", "🍾", "🥤", "🧃", "☕", "🍪", "🍫", "🥖", "🥞"],
    "Overig.": ["❄️", "🧊", "🏷️", "📦", "🛒", "🛍️", "🍽️", "🔪", "🥄", "👩🏼‍🍳", "👨🏼‍🍳", "👍🏼", "👎🏼", "🎆", "🎉", "🎊", "🎃", "🎄", "🎁", "👑"]
};

// --- 3. ICONEN ---
const Icon = ({ path, size = 20, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {path}
    </svg>
);

const Icons = {
    Plus: <path d="M5 12h14M12 5v14"/>,
    Bell: <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>,
    Trash: <g><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></g>,
    Upload: <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></g>,
    Minus: <path d="M5 12h14"/>,
    Search: <path d="m21 21-4.3-4.3M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/>,
    Filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    LayoutDashboard: <g><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></g>,
    Snowflake: <path d="M2 12h20M12 2v20m-8.5-6L12 12 8.5 8.5m7 7L12 12l3.5-3.5"/>,
    Box: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 12v10"/>,
    Trash2: <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>,
    Edit2: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>,
    Copy: <g><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></g>,
    Download: <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></g>,
    X: <path d="M18 6 6 18M6 6l12 12"/>,
    Info: <path d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>,
    LogOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>,
    Users: <g><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></g>,
    Check: <path d="M20 6 9 17l-5-5"/>,
    Home: <g><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></g>,
    Globe: <g><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></g>,
    Alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01"/>,
    Settings: <g><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>,
    ChevronDown: <path d="m6 9 6 6 6-6"/>,
    ChevronRight: <path d="m9 18 6-6-6-6"/>,
    GripVertical: <g><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></g>,
    User: <g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g>,
    Printer: <g><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></g>,
    Share: <g><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></g>,
    Sun: <g><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></g>,
    Moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    LogBook: <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></g>,
    Lock: <g><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></g>,
    Fridge: <path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 6h14m-7-6v20"/>,
    Star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    Zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, 
    Wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>,
    ShoppingCart: <g><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></g>,
    PieChart: <g><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></g>,
    UtensilsCrossed: <g><path d="m3 2 14.5 14.5"/><path d="m3 16.5 14.5-14.5"/><path d="M12.5 11.5 21 20"/><path d="M20 21 11.5 12.5"/><path d="m20 3-8.5 8.5"/><path d="M3 20 11.5 11.5"/></g>,
    Utensils: <g><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></g>,
    CheckSquare: <g><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></g>,
    MessageCircle: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>,
    Banknote: <g><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></g>,
    BookOpen: <g><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></g>,
    HelpCircle: <g><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></g>,
    Lightning: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
    Calendar: <g><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></g>,
    Link: <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
};

// --- 4. HULPFUNCTIES ---

// Slim zoeken: naast de gewone substring-match ook tikfouten tolereren en een
// kleine set Belgisch-Nederlandse synoniemen herkennen (bv. "patat" vindt "aardappel").
const normalizeSearchText = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const levenshteinDistance = (a, b) => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
};

const SEARCH_SYNONYMS = {
    'patat': ['aardappel', 'aardappelen'], 'patatten': ['aardappel', 'aardappelen'],
    'aardappel': ['patat', 'patatten'], 'aardappelen': ['patat', 'patatten'],
    'look': ['knoflook'], 'knoflook': ['look'],
    'ajuin': ['ui', 'uien'], 'ui': ['ajuin'], 'uien': ['ajuin'],
    'frigo': ['koelkast'], 'koelkast': ['frigo'],
    'diepvries': ['vriezer', 'diepvriezer'], 'vriezer': ['diepvries'],
    'gsm': ['smartphone', 'telefoon']
};

const smartMatch = (itemName, query) => {
    const nQuery = normalizeSearchText((query || '').trim());
    if (!nQuery) return true;
    const nName = normalizeSearchText(itemName || '');
    if (nName.includes(nQuery)) return true;

    const synonyms = SEARCH_SYNONYMS[nQuery] || [];
    if (synonyms.some(s => nName.includes(s))) return true;

    const maxDist = nQuery.length <= 4 ? 1 : 2;
    return nName.split(/\s+/).some(word => {
        if (Math.abs(word.length - nQuery.length) > maxDist + 1) return false;
        return levenshteinDistance(word, nQuery) <= maxDist;
    });
};

const getDagenOud = (timestamp) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getDagenTotTHT = (timestamp) => {
    if (!timestamp) return 999;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    now.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    const diff = date - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); 
};

const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('nl-BE');
};

const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const toInputDate = (timestamp) => {
    if (!timestamp) return ''; 
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
};

const getEmojiForCategory = (cat) => {
    const emojis = { 
        "Vlees": "🥩", "Vis": "🐟", "Groenten": "🥦", "Fruit": "🍎", "Brood": "🍞", "IJs": "🍦", 
        "Restjes": "🥡", "Saus": "🥫", "Friet": "🍟", "Pizza": "🍕", "Pasta": "🍝", "Rijst": "🍚", 
        "Conserven": "🥫", "Kruiden": "🌿", "Bakproducten": "🥖", "Snacks": "🍿", "Drank": "🥤", 
        "Soep": "🍲", "Huishoud": "🧻", "Ander": "📦", "Geen": "🔳",
        "Zuivel": "🥛", "Kaas": "🧀", "Beleg": "🥪"
    };
    return emojis[cat] || "📦";
};

// FIX: Altijd gekleurde lijn voor een product, geen uitzonderingen.
const getStatusColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999, altijdGoed = false) => {
    if (altijdGoed) return 'border-l-4 border-green-400 dark:border-green-600';
    if (type === 'voorraad' || type === 'frig') {
        if (dagenTotTHT === 999) return 'border-l-4 border-green-400 dark:border-green-600'; 
        if (dagenTotTHT < 0) return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10 dark:border-red-600'; 
        if (dagenTotTHT <= 7) return 'border-l-4 border-orange-400 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-600'; 
        if (dagenTotTHT <= 30) return 'border-l-4 border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10 dark:border-yellow-600'; 
        return 'border-l-4 border-green-400 dark:border-green-600'; 
    } else {
        if (dagenOud > 180) return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10 dark:border-red-600'; 
        if (dagenOud > 90) return 'border-l-4 border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10 dark:border-yellow-600';
        return 'border-l-4 border-green-400 dark:border-green-600';
    }
};

const getDateTextColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999, altijdGoed = false) => {
    if (altijdGoed) return 'text-green-600 dark:text-green-400 font-medium';
    if (type === 'voorraad' || type === 'frig') {
        if (dagenTotTHT < 0) return 'text-red-600 dark:text-red-400 font-bold'; 
        if (dagenTotTHT <= 30) return 'text-orange-500 dark:text-orange-400 font-bold';
        return 'text-green-600 dark:text-green-400 font-medium';
    } else {
        if (dagenOud > 180) return 'text-red-600 dark:text-red-400 font-bold'; 
        if (dagenOud > 90) return 'text-orange-500 dark:text-orange-400 font-bold';
        return 'text-green-600 dark:text-green-400 font-medium';
    }
};


const formatAantal = (aantal) => {
  const num = parseFloat(aantal);
  if (num === 0.25) return '1/4';
  if (num === 0.5) return '1/2';
  if (num === 0.75) return '3/4';
  return aantal;
};

const logAction = async (action, itemNaam, details, actorUser, targetUserId) => {
    if (!actorUser) return;
    try {
        await db.collection('logs').add({
            action: action, 
            item: itemNaam,
            details: details,
            actorId: actorUser.uid,
            actorName: actorUser.displayName || actorUser.email,
            targetUserId: targetUserId, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Kon log niet opslaan", e);
    }
};
const markLadeAsChanged = async (ladeId) => {
    if (!ladeId) return;
    try {
        await db.collection('lades').doc(ladeId).update({ laatstGewijzigd: new Date() });
    } catch (e) { console.error("Kon lade datum niet updaten", e); }
};
const analyzeProductName = (name) => {
    const n = name.toLowerCase();
    let cat = null, emoji = null, dagenHoudbaar = null;

    if (n.includes('gehakt') || n.includes('kip') || n.includes('vlees') || n.includes('steak')) { cat = 'Vlees'; emoji = '🥩'; dagenHoudbaar = 180; }
    else if (n.includes('melk') || n.includes('yoghurt') || n.includes('zuivel')) { cat = 'Zuivel'; emoji = '🥛'; dagenHoudbaar = 7; }
    else if (n.includes('brood') || n.includes('pistolet')) { cat = 'Brood'; emoji = '🍞'; dagenHoudbaar = 30; }
    else if (n.includes('pizza')) { cat = 'Pizza'; emoji = '🍕'; dagenHoudbaar = 90; }
    else if (n.includes('vis') || n.includes('zalm') || n.includes('scampi')) { cat = 'Vis'; emoji = '🐟'; dagenHoudbaar = 90; }
    else if (n.includes('friet') || n.includes('kroket')) { cat = 'Friet'; emoji = '🍟'; dagenHoudbaar = 365; }
    
    return { cat, emoji, dagenHoudbaar };
};

const sortLocaties = (locatiesArray) => {
    return [...locatiesArray].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.naam.localeCompare(b.naam);
    });
};

// --- 5. COMPONENTEN ---

const Toast = ({ message, type = "success", onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-600/95' : 'bg-red-600/95';
    const icon = isSuccess ? Icons.Check : Icons.Alert;

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full backdrop-blur-md shadow-md border border-white/20 text-white ${bgColor} animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto`}>
            <div className="p-1 bg-white/20 rounded-full shadow-inner">
                <Icon path={icon} size={20} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">{message}</span>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, color = "blue", size = "md", position = "center", hideBackdrop = false, hideCloseButton = false }) => {
    if (!isOpen) return null;
    
    const gradientClass = GRADIENTS[color] || GRADIENTS.blue;
    const sizeClass = size === "xl" ? "sm:max-w-6xl" : size === "lg" ? "sm:max-w-4xl" : "sm:max-w-lg";

    let alignmentClass = "items-end sm:items-center justify-center";
    if (position === "left") alignmentClass = "items-end sm:items-center justify-center lg:justify-start lg:pl-8 xl:pl-24";
    if (position === "right") alignmentClass = "items-end sm:items-center justify-center lg:justify-end lg:pr-8 xl:pr-24";

    return (
        <div className={`fixed inset-0 z-50 flex ${alignmentClass} sm:p-4 ${hideBackdrop ? 'pointer-events-none' : 'bg-black/40 backdrop-blur-sm'} print:hidden`} onClick={!hideBackdrop ? onClose : undefined}>
            <div className={`bg-white/95 dark:bg-stone-800/95 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-xl border border-stone-100 dark:border-stone-700 w-full ${sizeClass} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto modal-animate flex flex-col pointer-events-auto transform transition-all`} onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden flex-shrink-0"></div>
                <div className="flex justify-between items-center p-4 border-b border-stone-100 dark:border-stone-700 sticky top-0 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md z-10 rounded-t-3xl sm:rounded-t-2xl flex-shrink-0">
                    <h3 className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${gradientClass}`}>{title}</h3>
                    {!hideCloseButton && (
                        <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-all active:scale-95"><Icon path={Icons.X} className="text-stone-500 dark:text-stone-400" /></button>
                    )}
                </div>
                <div className="p-4 space-y-4 flex-grow overflow-y-auto text-stone-800 dark:text-stone-200 safe-bottom">{children}</div>
            </div>
        </div>
    );
};

const Badge = ({ type, text }) => {
    let colorClass = BADGE_COLORS[type];
    if (!colorClass) colorClass = "bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600";
    
    return (
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex-shrink-0 shadow-sm ${colorClass}`}>
            {text}
        </span>
    );
};

const EmojiGrid = ({ onSelect }) => {
    return (
        <div className="p-2 max-h-96 overflow-y-auto">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="mb-4">
                    <h4 className="font-bold text-sm text-stone-600 dark:text-stone-400 mb-2 border-b border-stone-100 dark:border-stone-700 pb-1">{category}</h4>
                    <div className="grid grid-cols-8 gap-2">
                        {emojis.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => onSelect(emoji)} 
                                className="text-2xl hover:bg-stone-100 dark:hover:bg-stone-700 p-2 rounded-lg transition-transform hover:scale-110 flex items-center justify-center active:scale-95"
                                type="button"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Toont de "Nieuws" / versiegeschiedenis-modal. Volledig zelfstandig: leunt alleen
// op de statische VERSION_HISTORY / APP_VERSION data, geen App-state nodig buiten open/dicht.
const VersionHistoryModal = ({ isOpen, onClose }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Nieuws." color="blue">
        <div className="mb-8 text-center px-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2 tracking-tight leading-tight">
                Ontdek alle updates en verbeteringen aan <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-500 text-xl">Voorraad.</span>
            </h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-full border border-teal-200 dark:border-teal-800/50 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">Huidige versie {APP_VERSION}</span>
            </div>
        </div>

        <div className="space-y-8 relative pl-2">
            <div className="absolute left-[19px] top-2 bottom-5 w-0.5 bg-gradient-to-b from-teal-200 via-stone-200 to-transparent dark:from-teal-800/50 dark:via-stone-700/50"></div>

            {VERSION_HISTORY.map((v, i) => (
                <div key={v.version} className="relative pl-10 group">
                    <div className={`absolute left-[13px] top-1.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-white dark:border-stone-800 z-10 transition-transform group-hover:scale-125 ${i === 0 ? 'bg-teal-500 shadow-sm shadow-teal-300/50 dark:shadow-teal-900/50' : 'bg-stone-300 dark:bg-stone-600'}`}></div>

                    <div className="mb-3 flex items-center gap-2">
                        <span className={`text-xl font-bold tracking-tight ${i === 0 ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-500'}`}>v{v.version}</span>
                        {i === 0 && <span className="bg-teal-600 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">Nieuw</span>}
                    </div>
                    
                    <ul className="space-y-3">
                        {v.changes.map((change, idx) => {
                            const parts = change.split(': ');
                            const type = parts[0];
                            const text = parts.slice(1).join(': ');
                            
                            let IconComp = Icons.Zap;
                            let iconColor = "text-teal-500 bg-teal-50 border-teal-100 dark:bg-teal-900/30 dark:border-teal-800/50 dark:text-teal-300";

                            if (type.includes('Feature') || type.includes('Nieuw') || type.includes('Mega')) {
                                IconComp = Icons.Star;
                                iconColor = "text-yellow-600 bg-yellow-50 border-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-400";
                            } else if (type.includes('Fix') || type.includes('Opgelost') || type.includes('Hersteld')) {
                                IconComp = Icons.Wrench;
                                iconColor = "text-green-600 bg-green-50 border-green-100 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400";
                            } else if (type.includes('Update') || type.includes('Compact') || type.includes('Mobiele') || type.includes('Lijstweergave') || type.includes('Logboek')) {
                                 IconComp = Icons.Zap;
                                 iconColor = "text-teal-500 bg-teal-50 border-teal-100 dark:bg-teal-900/30 dark:border-teal-800/50 dark:text-teal-300";
                            }

                            return (
                                <li key={idx} className="flex gap-3 text-xs text-stone-600 dark:text-stone-300 items-start bg-white dark:bg-stone-800/50 p-3 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700/50 transition-colors hover:border-stone-300 dark:hover:border-stone-600">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${iconColor}`}>
                                        <Icon path={IconComp} size={14} />
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="font-bold block text-stone-900 dark:text-stone-100 text-[10px] uppercase tracking-widest mb-1 opacity-90">{type}</span>
                                        <span className="leading-relaxed font-medium">{text || change}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    </Modal>
);

// Emoji-kiezer modal
const EmojiPickerModal = ({ setFormData, setShowEmojiPicker, showEmojiPicker }) => (
<Modal isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} title="Emoji." color="orange">
                <EmojiGrid onSelect={(emoji) => { setFormData(p => ({...p, emoji})); setShowEmojiPicker(false); }} />
            </Modal>
);

// Filter en sorteer modal
const FilterModal = ({ activeCategoryFilter, activeTab, items, mainViewCategories, setActiveCategoryFilter, setShowFilterModal, setSortBy, showFilterModal, sortBy }) => (
<Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter & Sorteer." color="blue">
                <div className="space-y-5">
                    <div>
                        <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Sorteer op</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                                { id: 'name', label: 'A-Z' },
                                { id: 'expiry', label: 'THT / Oudste eerst' },
                                { id: 'newest', label: 'Nieuwste eerst' }
                            ].map(opt => (
                                <button key={opt.id} onClick={() => setSortBy(opt.id)} className={`p-3 rounded-lg border text-xs font-bold transition-all active:scale-95 ${sortBy === opt.id ? 'bg-gradient-to-br from-teal-50 to-indigo-50 border-teal-400 text-teal-700 dark:from-teal-900/30 dark:to-indigo-900/30 dark:border-teal-500 dark:text-teal-300 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-600'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-1">
                        <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Categorie <span className="capitalize text-teal-500">({activeTab})</span></h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setActiveCategoryFilter(null)} 
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border ${!activeCategoryFilter ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-100 dark:border-stone-100 dark:text-stone-900 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 hover:border-stone-300'}`}
                            >
                                Alles
                            </button>
                            {mainViewCategories.map(c => {
                                const isSelected = activeCategoryFilter === (c.name || c);
                                const catColor = c.color || 'gray';
                                return (
                                    <button 
                                        key={c.name || c}
                                        onClick={() => setActiveCategoryFilter(c.name || c)} 
                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border flex items-center gap-1.5 ${isSelected ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-100 dark:border-stone-100 dark:text-stone-900 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 hover:border-stone-300'}`}
                                    >
                                        {!isSelected && <span className={`w-2 h-2 rounded-full bg-${catColor}-500 shadow-sm`}></span>}
                                        {c.name || c}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-700">
                        <button onClick={() => setShowFilterModal(false)} className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:shadow-md text-white px-5 py-3 rounded-xl font-bold w-full transition-all active:scale-95 text-sm">
                            Toepassen
                        </button>
                    </div>
                </div>
            </Modal>
);

// Product verwerken modal
const ConsumeModal = ({ confirmConsume, consumeAmount, itemToConsume, items, setConsumeAmount, setShowConsumeModal, showConsumeModal }) => (
<Modal isOpen={showConsumeModal} onClose={() => setShowConsumeModal(false)} title="Product verwerken." color="orange">
                {itemToConsume && (
                    <div className="space-y-4">
                        <p className="text-stone-800 dark:text-stone-200 font-medium text-sm">
                            Je hebt momenteel <strong>{formatAantal(itemToConsume.aantal)} {itemToConsume.eenheid}</strong> van <strong>{itemToConsume.naam}</strong>.<br/>Hoeveel wil je hier van afhalen?
                        </p>
                        
                        <div className="flex gap-3 items-center bg-stone-50/80 dark:bg-stone-800/80 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700 shadow-inner">
                            <div className="relative flex-grow">
                                <input 
                                    type="number" 
                                    step="0.25"
                                    min="0.25"
                                    max={itemToConsume.aantal}
                                    className="w-full p-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-center text-xl font-bold appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm transition-all"
                                    value={consumeAmount}
                                    onChange={e => setConsumeAmount(e.target.value)}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(consumeAmount) || 0;
                                    const max = parseFloat(itemToConsume.aantal) || 5000;
                                    setConsumeAmount(Math.min(current + 0.25, max));
                                  }}
                                  className="absolute right-1 top-1.5 w-8 h-6 flex items-center justify-center text-stone-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md cursor-pointer transition-colors"
                                >
                                  <Icon path={Icons.ChevronRight} size={16} className="rotate-[-90deg]" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(consumeAmount) || 0;
                                    setConsumeAmount(Math.max(current - 0.25, 0.25));
                                  }}
                                  className="absolute right-1 bottom-1.5 w-8 h-6 flex items-center justify-center text-stone-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md cursor-pointer transition-colors"
                                >
                                  <Icon path={Icons.ChevronRight} size={16} className="rotate-[90deg]" />
                                </button>
                            </div>
                            <span className="text-stone-600 dark:text-stone-300 font-bold text-lg w-20 truncate">{itemToConsume.eenheid}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button onClick={() => setShowConsumeModal(false)} className="p-3 bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200 rounded-lg font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors active:scale-95 text-sm">
                                Annuleren
                            </button>
                            <button onClick={confirmConsume} className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-bold hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 text-sm">
                                <Icon path={Icons.Check} size={16}/> Bevestigen
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
);

// Product verwijderen modal
const DeleteModal = ({ confirmDelete, itemToDelete, items, setShowDeleteModal, showDeleteModal }) => (
<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Product verwijderen." color="red">
                <p className="text-stone-800 dark:text-stone-200 mb-5 font-medium text-sm">Wat is de reden voor het verwijderen van <strong>{itemToDelete?.naam}</strong>?</p>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => confirmDelete('consumed')} className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-300 rounded-lg font-bold hover:shadow-sm transition-all active:scale-95 border border-green-200 dark:border-green-800 text-sm">
                        <Icon path={Icons.Utensils} size={18} /> Opgegeten
                    </button>
                    <button onClick={() => confirmDelete('wasted')} className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-red-50 to-rose-50 text-red-800 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-300 rounded-lg font-bold hover:shadow-sm transition-all active:scale-95 border border-red-200 dark:border-red-800 text-sm">
                        <Icon path={Icons.Trash2} size={18} /> Weggegooid (Verspild)
                    </button>
                    <button onClick={() => confirmDelete('other')} className="flex items-center justify-center gap-2 p-3 bg-stone-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 rounded-lg font-medium hover:shadow-sm transition-all active:scale-95 border border-stone-200 dark:border-stone-700 text-sm">
                        Andere reden / Foutje
                    </button>
                </div>
            </Modal>
);

// Verplaats items modal
const BulkMoveModal = ({ bulkMoveTarget, filteredLocaties, handleBulkMove, items, lades, selectedBulkItems, setBulkMoveTarget, setShowBulkMoveModal, showBulkMoveModal }) => (
<Modal isOpen={showBulkMoveModal} onClose={() => setShowBulkMoveModal(false)} title="Verplaats Items." color="indigo">
                <form onSubmit={handleBulkMove} className="space-y-4">
                    <p className="text-stone-700 dark:text-stone-300 font-medium text-sm">Naar welke locatie wil je deze <strong>{selectedBulkItems.size}</strong> items verplaatsen?</p>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Doel Locatie.</label>
                        <select className="w-full p-3 bg-stone-50 dark:bg-stone-700 dark:text-white border border-stone-200 dark:border-stone-600 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" value={bulkMoveTarget.vriezerId} onChange={e => setBulkMoveTarget({...bulkMoveTarget, vriezerId: e.target.value, ladeId: ''})} required>
                            <option value="" disabled>Kies een locatie...</option>
                            {filteredLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select>
                    </div>

                    {bulkMoveTarget.vriezerId && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Doel Lade.</label>
                            <select className="w-full p-3 bg-stone-50 dark:bg-stone-700 dark:text-white border border-stone-200 dark:border-stone-600 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" value={bulkMoveTarget.ladeId} onChange={e => setBulkMoveTarget({...bulkMoveTarget, ladeId: e.target.value})} required>
                                <option value="" disabled>Kies een lade...</option>
                                {lades.filter(l => l.vriezerId === bulkMoveTarget.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam)).map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-700 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setShowBulkMoveModal(false)} className="p-3 bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors active:scale-95 text-sm">Annuleren</button>
                        <button type="submit" disabled={!bulkMoveTarget.ladeId} className="p-3 bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm">Verplaatsen</button>
                    </div>
                </form>
            </Modal>
);

// Recept bekijken modal
const RecipeViewModal = ({ editingRecipe, items, setRecipeFormData, setShowRecipeModal, setShowRecipeViewModal, setViewRecipePersons, showRecipeViewModal, viewRecipePersons }) => (
<Modal isOpen={showRecipeViewModal} onClose={() => setShowRecipeViewModal(false)} title="Recept Bekijken." color="teal" size="lg">
    {editingRecipe && (
        <div className="space-y-5">
            {editingRecipe.fotoUrl && (
                <div 
                    className="-mt-4 -mx-4 mb-5 h-48 sm:h-64 bg-cover bg-center border-b border-stone-200 dark:border-stone-700 shadow-sm rounded-t-xl" 
                    style={{backgroundImage: `url(${editingRecipe.fotoUrl})`}}
                ></div>
            )}
            
            <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-700 pb-4">
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white pr-4 leading-tight tracking-tight">{editingRecipe.naam}</h2>
                <button onClick={() => { 
                    setRecipeFormData(editingRecipe); 
                    setShowRecipeViewModal(false); 
                    setShowRecipeModal(true); 
                }} className="text-stone-400 hover:text-teal-600 dark:text-stone-500 dark:hover:text-teal-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mt-1 bg-stone-50 dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm">
                    <Icon path={Icons.Edit2} size={14}/> Bewerk
                </button>
            </div>

            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-teal-100/50 dark:border-teal-800/50 flex justify-between items-center shadow-sm">
                <span className="font-bold text-sm text-teal-800 dark:text-teal-300">Aantal Personen:</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => setViewRecipePersons(Math.max(1, viewRecipePersons - 1))} className="w-8 h-8 rounded-full bg-white dark:bg-stone-700 text-teal-600 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md hover:scale-105 transition-all active:scale-95">-</button>
                    <span className="font-bold text-xl w-6 text-center text-stone-800 dark:text-white drop-shadow-sm">{viewRecipePersons}</span>
                    <button onClick={() => setViewRecipePersons(viewRecipePersons + 1)} className="w-8 h-8 rounded-full bg-white dark:bg-stone-700 text-teal-600 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md hover:scale-105 transition-all active:scale-95">+</button>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2 uppercase tracking-widest text-xs flex items-center gap-2"><Icon path={Icons.ShoppingCart} size={14}/> Ingrediënten</h3>
                <ul className="space-y-2">
                    {editingRecipe.ingredienten?.map((ing, idx) => {
                        let berekendAantal = "";
                        if (ing.aantal) {
                            const ratio = viewRecipePersons / (editingRecipe.personen || 4);
                            const nieuwAantal = parseFloat(ing.aantal) * ratio;
                            berekendAantal = (nieuwAantal % 1 !== 0) ? nieuwAantal.toFixed(1) : nieuwAantal;
                        }
                        return (
                            <li key={idx} className="flex justify-between items-center p-2.5 bg-white dark:bg-stone-800/80 rounded-lg border border-stone-100 dark:border-stone-700 shadow-sm transition-all hover:border-teal-200 dark:hover:border-teal-800/50 text-sm">
                                <span className="font-medium text-stone-800 dark:text-stone-200">{ing.naam}</span>
                                <span className="font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-md">{berekendAantal} {ing.eenheid}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="pt-1">
                <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-3 uppercase tracking-widest text-xs flex items-center gap-2"><Icon path={Icons.List} size={14}/> Stappen</h3>
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                    {editingRecipe.stappen?.map((stap, idx) => (
                        <li key={idx} className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed pl-2 border-l-[2px] border-teal-200 dark:border-teal-800 marker:font-bold marker:text-teal-500">{stap}</li>
                    ))}
                </ol>
            </div>
        </div>
    )}
</Modal>
);

// Toevoegen aan boodschappenlijst na verwijderen
const ShopifyPromptModal = ({ aantalForShopifyItem, handleAddToShoppingFromDelete, itemToShopify, items, setAantalForShopifyItem, setShopForDeletedItem, setShowShopifyModal, shopForDeletedItem, showShopifyModal }) => (
<Modal isOpen={showShopifyModal} onClose={() => setShowShopifyModal(false)} title="Boodschappenlijst?" color="blue">
                <p className="text-stone-800 dark:text-stone-200 mb-4 font-medium text-sm">Wil je <strong>{itemToShopify?.naam}</strong> op de boodschappenlijst zetten?</p>
                
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1 block">Winkel (optioneel)</label>
                            <select 
                                className="w-full p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 outline-none focus:ring-1 focus:ring-teal-500 dark:text-white font-medium text-sm transition-all shadow-sm"
                                value={shopForDeletedItem}
                                onChange={(e) => setShopForDeletedItem(e.target.value)}
                            >
                                <option value="">Geen winkel</option>
                                {WINKELS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="w-28 sm:w-32 flex-shrink-0">
                            <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1 block">Aantal</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.25"
                                    className="w-full h-11 text-center border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 outline-none dark:text-white pr-6 pl-2 font-bold text-sm appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm transition-all" 
                                    value={aantalForShopifyItem} 
                                    onChange={(e) => setAantalForShopifyItem(e.target.value)}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(aantalForShopifyItem) || 0;
                                    setAantalForShopifyItem(Math.round((current + 0.25) * 100) / 100);
                                  }}
                                  className="absolute right-1 top-1 w-5 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 cursor-pointer"
                                >
                                  <Icon path={Icons.ChevronRight} size={12} className="rotate-[-90deg]" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(aantalForShopifyItem) || 0;
                                    setAantalForShopifyItem(Math.max(0, Math.round((current - 0.25) * 100) / 100));
                                  }}
                                  className="absolute right-1 bottom-1 w-5 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 cursor-pointer"
                                >
                                  <Icon path={Icons.ChevronRight} size={12} className="rotate-[90deg]" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                        <button onClick={() => setShowShopifyModal(false)} className="p-3 bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 rounded-lg font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors active:scale-95 border border-stone-200 dark:border-stone-700 text-sm">
                            Nee
                        </button>
                        <button onClick={handleAddToShoppingFromDelete} className="p-3 bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-lg font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-sm">
                            Ja, voeg toe
                        </button>
                    </div>
                </div>
            </Modal>
);

// Statistieken modal
const StatsModal = ({ items, setShowStatsModal, showStatsModal, stats, totalStockValue }) => (
<Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="Statistieken." color="purple">
                <div className="bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-teal-900/20 dark:to-indigo-900/20 p-4 rounded-xl text-center border border-teal-100/50 dark:border-teal-800/50 mb-4 shadow-sm">
                    <span className="block text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-400 dark:to-indigo-400 mb-1 drop-shadow-sm">€{totalStockValue.toFixed(2)}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-800/80 dark:text-teal-200/80">Totale Voorraadwaarde</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl text-center border border-green-100/50 dark:border-green-800/50 shadow-sm">
                        <span className="block text-2xl font-bold text-green-600 dark:text-green-400 mb-1 drop-shadow-sm">{stats.consumed}</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-green-800/80 dark:text-green-200/80 block mb-1.5">Producten gegeten</span>
                        {stats.consumedValue > 0 && <span className="text-xs font-bold text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-800/30 px-2 py-0.5 rounded-md">Waarde: €{(stats.consumedValue || 0).toFixed(2)}</span>}
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-4 rounded-xl text-center border border-red-100/50 dark:border-red-800/50 shadow-sm">
                        <span className="block text-2xl font-bold text-red-600 dark:text-red-400 mb-1 drop-shadow-sm">{stats.wasted}</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-red-800/80 dark:text-red-200/80 block mb-1.5">Weggegooid</span>
                        {stats.wastedValue > 0 && <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-800/30 px-2 py-0.5 rounded-md">Waarde: €{(stats.wastedValue || 0).toFixed(2)}</span>}
                    </div>
                </div>
                {stats.consumed + stats.wasted > 0 ? (
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">Verspillingspercentage</span>
                            <span className="text-xs font-bold text-red-500">
                                {Math.round((stats.wasted / (stats.consumed + stats.wasted)) * 100)}%
                            </span>
                        </div>
                        <div className="overflow-hidden h-2.5 mb-3 text-xs flex rounded-full bg-green-200 dark:bg-green-900 shadow-inner">
                            <div style={{ width: `${Math.round((stats.wasted / (stats.consumed + stats.wasted)) * 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-red-500 to-rose-500"></div>
                        </div>
                        <p className="text-[10px] text-center text-stone-400 dark:text-stone-500 font-medium italic mt-1">Gebaseerd op handmatige invoer bij verwijderen.</p>
                    </div>
                ) : <p className="text-center text-stone-400 font-medium text-xs">Nog geen verbruiksdata beschikbaar.</p>}
            </Modal>
);

// Logboek modal
const LogModal = ({ isAdmin, items, logs, setShowLogModal, showLogModal, user }) => (
<Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Logboek." color="teal">
                {logs.length === 0 ? (
                    <p className="text-stone-400 dark:text-stone-500 font-medium text-center py-8 text-sm">Nog geen activiteiten opgeslagen.</p>
                ) : (
                    <ul className="space-y-2.5">
                        {logs.map(log => {
                            const isMine = log.targetUserId === user.uid;
                            const isAdded = log.action === 'Toevoegen';
                            const isDeleted = log.action === 'Verwijderd';
                            
                            return (
                                <li key={log.id} className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-lg p-2.5 border border-stone-200/60 dark:border-stone-700/60 shadow-sm transition-all hover:shadow-md flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center justify-center w-6 h-6 rounded-md shadow-sm ${isAdded ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : isDeleted ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                                                <Icon path={isAdded ? Icons.Plus : isDeleted ? Icons.Trash2 : Icons.Edit2} size={12}/>
                                            </span>
                                            <span className="font-bold text-stone-800 dark:text-stone-100 text-xs tracking-tight">{log.item}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500">{formatDateTime(log.timestamp)}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-0.5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${isAdded ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:border-green-800/50' : isDeleted ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-teal-50 text-teal-600 border border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/50'}`}>
                                                    {log.action}
                                                </span>
                                                {isAdmin && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${isMine ? 'border-green-300 text-green-600 dark:border-green-700/50' : 'border-orange-300 text-orange-600 dark:border-orange-700/50'}`}>
                                                        {isMine ? 'Eigen' : 'Ander'}
                                                    </span>
                                                )}
                                            </div>
                                            {log.details && <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400 leading-snug">{log.details}</p>}
                                        </div>
                                        <div className="text-[8px] font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1 uppercase tracking-widest">
                                            <Icon path={Icons.User} size={10}/> {log.actorName}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Modal>
);

// Boodschappenlijst modal
const ShoppingListModal = ({ clearCheckedShopping, deleteShoppingItem, groupedShoppingList, handleAddShoppingItem, handleShareList, handleShareWhatsApp, items, moveShoppingToStock, setShoppingFormData, setShowShoppingModal, shoppingFormData, shoppingList, showShoppingModal, toggleShoppingItem }) => (
<Modal isOpen={showShoppingModal} onClose={() => setShowShoppingModal(false)} title="Boodschappenlijst." color="blue">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-xl shadow-sm border border-stone-200/50 dark:border-stone-700/50 p-4 mb-4">
                        <form onSubmit={handleAddShoppingItem} className="flex flex-col gap-2.5">
                            <div className="flex gap-2.5">
                                <input 
                                    type="text" 
                                    placeholder="Wat moet je kopen?" 
                                    className="flex-grow p-3 min-w-0 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900 outline-none focus:ring-1 focus:ring-teal-500 dark:text-white font-medium text-sm transition-all shadow-sm" 
                                    value={shoppingFormData.naam} 
                                    onChange={e => setShoppingFormData({...shoppingFormData, naam: e.target.value})} 
                                    required
                                />
                                <div className="relative w-28 sm:w-32 flex-shrink-0">
                                    <input 
                                        type="number" 
                                        step="0.25"
                                        className="w-full h-full text-center border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900 outline-none dark:text-white font-bold text-sm pr-6 pl-2 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm transition-all" 
                                        value={shoppingFormData.aantal} 
                                        onChange={e => setShoppingFormData({...shoppingFormData, aantal: e.target.value})} 
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const current = parseFloat(shoppingFormData.aantal) || 0;
                                        setShoppingFormData({...shoppingFormData, aantal: Math.round((current + 0.25) * 100) / 100});
                                      }}
                                      className="absolute right-1.5 top-1 w-5 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 cursor-pointer"
                                    >
                                      <Icon path={Icons.ChevronRight} size={12} className="rotate-[-90deg]" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const current = parseFloat(shoppingFormData.aantal) || 0;
                                        setShoppingFormData({...shoppingFormData, aantal: Math.max(0, Math.round((current - 0.25) * 100) / 100)});
                                      }}
                                      className="absolute right-1.5 bottom-1 w-5 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 cursor-pointer"
                                    >
                                      <Icon path={Icons.ChevronRight} size={12} className="rotate-[90deg]" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2.5">
                                <select 
                                    className="flex-grow p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900 outline-none focus:ring-1 focus:ring-teal-500 dark:text-white font-medium text-sm transition-all shadow-sm"
                                    value={shoppingFormData.winkel}
                                    onChange={e => setShoppingFormData({...shoppingFormData, winkel: e.target.value})}
                                >
                                    <option value="">Kies winkel (optioneel)...</option>
                                    {WINKELS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                                </select>
                                <button type="submit" className="bg-gradient-to-r from-teal-600 to-indigo-600 text-white px-6 rounded-lg font-bold flex-shrink-0 flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"><Icon path={Icons.Plus} size={20}/></button>
                            </div>
                        </form>
                    </div>

                    <div className="flex justify-between items-end mb-2 px-1">
                        <h4 className="font-bold text-xs text-stone-800 dark:text-stone-200 uppercase tracking-wide">Jouw Lijstje</h4>
                        <div className="flex gap-2">
                            <button onClick={handleShareList} className="text-[10px] flex items-center gap-1 font-bold text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-95" title="Delen">
                                <Icon path={Icons.Share} size={12}/> Delen
                            </button>
                            <button onClick={handleShareWhatsApp} className="text-[10px] flex items-center gap-1 font-bold text-white bg-green-500 hover:bg-green-600 px-2.5 py-1.5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-95" title="Deel via WhatsApp">
                                <Icon path={Icons.MessageCircle} size={12}/> WhatsApp
                            </button>
                            {shoppingList.some(i => i.checked) && (
                                <button onClick={clearCheckedShopping} className="text-[10px] flex items-center gap-1 font-bold text-red-600 hover:text-white bg-red-100 hover:bg-red-500 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-600 px-2.5 py-1.5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-95">
                                    <Icon path={Icons.Trash2} size={12}/> Wis afgevinkt
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {shoppingList.length === 0 && <p className="text-center text-stone-400 py-8 font-medium italic text-sm">Je boodschappenlijst is leeg.</p>}
                        
                        {Object.entries(groupedShoppingList)
                            .sort(([winkelA], [winkelB]) => {
                                if (winkelA === 'Geen winkel gekozen') return 1;
                                if (winkelB === 'Geen winkel gekozen') return -1;
                                return winkelA.localeCompare(winkelB);
                            })
                            .map(([winkel, lijstItems]) => {
                                const winkelObj = WINKELS.find(w => w.name === winkel);
                                const winkelColor = winkelObj ? winkelObj.color : 'gray';

                                return (
                                    <div key={winkel} className="mb-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <span className={`w-2.5 h-2.5 rounded-full bg-${winkelColor}-500 shadow-sm`}></span>
                                            <h5 className="font-bold text-[10px] uppercase text-stone-500 dark:text-stone-400 tracking-widest">{winkel}</h5>
                                        </div>
                                        <div className="space-y-2">
                                            {lijstItems.sort((a,b) => a.checked - b.checked).map(item => (
                                                <div key={item.id} className={`flex items-center justify-between p-2.5 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm rounded-lg border transition-all duration-300 shadow-sm hover:shadow-md ${item.checked ? 'border-teal-200/50 bg-teal-50/50 dark:bg-teal-900/10 dark:border-teal-800/30' : 'border-stone-200/60 dark:border-stone-700/60 hover:border-teal-300 dark:hover:border-teal-600'}`}>
                                                    <div className="flex items-center gap-3 cursor-pointer overflow-hidden flex-grow group" onClick={() => toggleShoppingItem(item)}>
                                                        <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? 'bg-teal-500 border-teal-500 shadow-sm' : 'border-stone-300 dark:border-stone-500 group-hover:border-teal-400'}`}>
                                                            {item.checked && <Icon path={Icons.Check} size={12} className="text-white"/>}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`font-medium text-sm truncate transition-colors ${item.checked ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-900 dark:text-stone-100'}`}>
                                                                {item.aantal > 0 && <span className={`font-bold mr-1.5 ${item.checked ? 'text-stone-400 dark:text-stone-500' : 'text-teal-600 dark:text-teal-400'}`}>{formatAantal(item.aantal)} {item.eenheid}</span>}
                                                                {item.naam}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5 flex-shrink-0 ml-2">
                                                        <button onClick={() => moveShoppingToStock(item)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-md transition-all active:scale-95 shadow-sm" title="Naar voorraad"><Icon path={Icons.Box} size={16}/></button>
                                                        <button onClick={() => deleteShoppingItem(item.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md transition-all active:scale-95 shadow-sm" title="Verwijderen"><Icon path={Icons.Trash2} size={16}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                        })}
                    </div>
                </div>
            </Modal>
);

// Recept toevoegen/bewerken modal
const RecipeFormModal = ({ beheerdeUserId, editingRecipe, items, recepten, recipeFormData, setRecipeFormData, setShowRecipeModal, showNotification, showRecipeModal }) => (
<Modal isOpen={showRecipeModal} onClose={() => setShowRecipeModal(false)} title={editingRecipe ? "Recept Bewerken." : "Nieuw Recept."} color="teal" size="lg">
    <div className="space-y-4">
        <div className="flex gap-3">
            <div className="flex-grow space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Recept Naam</label>
                <input type="text" className="w-full p-3 border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-700 dark:text-white outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-stone-800 transition-all font-medium text-sm shadow-sm" value={recipeFormData.naam} onChange={e => setRecipeFormData({...recipeFormData, naam: e.target.value})} placeholder="Bv. Spaghetti Bolognese"/>
            </div>
            <div className="w-24 space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Personen</label>
                <input type="number" min="1" className="w-full p-3 border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-700 dark:text-white outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-stone-800 transition-all text-center font-bold text-sm shadow-sm" value={recipeFormData.personen} onChange={e => setRecipeFormData({...recipeFormData, personen: parseInt(e.target.value) || 4})}/>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Categorie</label>
                <select className="w-full p-3 border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-700 dark:text-white outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-stone-800 transition-all font-medium text-sm shadow-sm" value={recipeFormData.categorie} onChange={e => setRecipeFormData({...recipeFormData, categorie: e.target.value})}>
                    {CATEGORIEEN_RECEPT.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Foto URL</label>
                <input type="text" className="w-full p-3 border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-700 dark:text-white outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-stone-800 transition-all font-medium text-sm shadow-sm" value={recipeFormData.fotoUrl} onChange={e => setRecipeFormData({...recipeFormData, fotoUrl: e.target.value})} placeholder="https://link-naar-foto.jpg"/>
            </div>
        </div>

        <div className="p-3 border border-stone-200/60 dark:border-stone-700/60 rounded-xl bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm shadow-sm">
            <h4 className="font-bold text-sm mb-2 text-stone-800 dark:text-stone-200 flex items-center gap-1.5"><Icon path={Icons.ShoppingCart} size={16}/> Ingrediënten</h4>
            <div className="space-y-2 mb-2">
                {recipeFormData.ingredienten.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <input type="text" className="flex-grow p-2 border border-stone-200 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium shadow-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all" value={ing.naam} onChange={e => { const newIng = [...recipeFormData.ingredienten]; newIng[idx].naam = e.target.value; setRecipeFormData({...recipeFormData, ingredienten: newIng}); }} placeholder="Ingrediënt"/>
                        <input type="number" step="0.5" className="w-16 p-2 border border-stone-200 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium text-center shadow-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all" value={ing.aantal} onChange={e => { const newIng = [...recipeFormData.ingredienten]; newIng[idx].aantal = e.target.value; setRecipeFormData({...recipeFormData, ingredienten: newIng}); }} placeholder="Hoeveel"/>
                        <select className="w-24 p-2 border border-stone-200 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium shadow-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all" value={ing.eenheid} onChange={e => { const newIng = [...recipeFormData.ingredienten]; newIng[idx].eenheid = e.target.value; setRecipeFormData({...recipeFormData, ingredienten: newIng}); }}>
                            {EENHEDEN_RECEPT.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button onClick={() => { const newIng = recipeFormData.ingredienten.filter((_, i) => i !== idx); setRecipeFormData({...recipeFormData, ingredienten: newIng}); }} className="text-stone-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.X} size={14}/></button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => setRecipeFormData({...recipeFormData, ingredienten: [...recipeFormData.ingredienten, {naam: '', aantal: 1, eenheid: 'stuks'}]})} className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 px-3 py-2 rounded-lg w-full transition-colors border border-teal-100 dark:border-teal-800/50">+ Ingrediënt toevoegen</button>
        </div>

        <div className="p-3 border border-stone-200/60 dark:border-stone-700/60 rounded-xl bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm shadow-sm">
            <h4 className="font-bold text-sm mb-2 text-stone-800 dark:text-stone-200 flex items-center gap-1.5"><Icon path={Icons.List} size={16}/> Bereidingswijze (Stappen)</h4>
            <div className="space-y-2 mb-2">
                {recipeFormData.stappen.map((stap, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                        <span className="font-bold text-teal-500 mt-1.5 bg-teal-50 dark:bg-teal-900/30 w-5 h-5 flex items-center justify-center rounded-full text-[10px] flex-shrink-0">{idx + 1}</span>
                        <textarea className="flex-grow p-2 border border-stone-200 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium h-16 shadow-sm outline-none focus:ring-1 focus:ring-teal-500 transition-all resize-none" value={stap} onChange={e => { const newStappen = [...recipeFormData.stappen]; newStappen[idx] = e.target.value; setRecipeFormData({...recipeFormData, stappen: newStappen}); }} placeholder="Beschrijf de stap..."/>
                        <button onClick={() => { const newStappen = recipeFormData.stappen.filter((_, i) => i !== idx); setRecipeFormData({...recipeFormData, stappen: newStappen}); }} className="text-stone-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all active:scale-95 mt-0.5"><Icon path={Icons.X} size={14}/></button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => setRecipeFormData({...recipeFormData, stappen: [...recipeFormData.stappen, '']})} className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 px-3 py-2 rounded-lg w-full transition-colors border border-teal-100 dark:border-teal-800/50">+ Stap toevoegen</button>
        </div>

        <button onClick={async () => {
            if(!recipeFormData.naam) return alert('Naam is verplicht!');
            try {
                if (editingRecipe) {
                    await db.collection('recepten').doc(editingRecipe.id).update({...recipeFormData});
                    showNotification('Recept bijgewerkt!', 'success');
                } else {
                    await db.collection('recepten').add({...recipeFormData, userId: beheerdeUserId});
                    showNotification('Recept aangemaakt!', 'success');
                }
                setShowRecipeModal(false);
            } catch(e) { showNotification('Fout bij opslaan', 'error'); }
        }} className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all">Opslaan</button>
    </div>
</Modal>
);

// Meldingen modal
const WhatsNewModal = ({ alerts, alertsExpanded, currentVersionData, items, setAlertsExpanded, setShowWhatsNew, showOnboarding, showWhatsNew, tourSteps, vriezers }) => (
<Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Meldingen." color="red" position={showOnboarding && tourSteps.length > 0 ? "left" : "center"}>
{alerts.length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-[4px] border-red-500 p-4 rounded-r-xl mb-5 dark:from-red-900/20 dark:to-rose-900/20 dark:border-red-600 shadow-sm">
                        <div 
                            className={`flex justify-between items-center ${alerts.length >= 10 ? 'cursor-pointer select-none' : ''}`}
                            onClick={() => alerts.length >= 10 && setAlertsExpanded(!alertsExpanded)}
                        >
                            <h4 className="font-bold text-red-800 dark:text-red-300 text-sm flex items-center gap-1.5">
                                <Icon path={Icons.Alert} size={16}/> Let op! {alerts.length >= 10 && <span className="opacity-80 font-medium ml-1">({alerts.length} producten)</span>}
                            </h4>
                            {alerts.length >= 10 && (
                                <Icon path={alertsExpanded ? Icons.ChevronDown : Icons.ChevronRight} size={16} className="text-red-700 dark:text-red-400 transition-transform" />
                            )}
                        </div>
                        
                        {(alerts.length < 10 || alertsExpanded) && (
                            <ul className="space-y-1 pl-0.5 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                {alerts.map(i => {
                                    const loc = vriezers.find(v => v.id === i.vriezerId);
                                    const type = loc ? (loc.type || 'vriezer') : 'vriezer';
                                    const isStock = type === 'voorraad' || type === 'frig';
                                    
                                    return (
                                        <li key={i.id} className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0"></span>
                                            <span className="truncate">{i.naam}</span>
                                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-wide bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50 flex-shrink-0">
                                                {isStock 
                                                    ? `Verlopen: ${formatDate(i.houdbaarheidsDatum)}` 
                                                    : `${getDagenOud(i.ingevrorenOp)} dagen oud`
                                                }
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
                <div className="space-y-3">
                    {currentVersionData && (
                        <div className="bg-stone-50/50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-700/50">
                            <div className="flex items-center gap-2.5 mb-4">
                                <h4 className="font-bold text-teal-600 dark:text-teal-400 text-lg tracking-tight">Versie {APP_VERSION}</h4>
                                <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/50">Nieuw</span>
                            </div>
                            <ul className="space-y-3">
                                {currentVersionData.changes.map((change, idx) => {
                                    const parts = change.split(': ');
                                    const type = parts[0];
                                    const text = parts.slice(1).join(': ');
                                    
                                    let IconComp = Icons.Zap;
                                    let iconColor = "text-teal-500 bg-teal-50 border-teal-100 dark:bg-teal-900/30 dark:border-teal-800/50 dark:text-teal-300";

                                    if (type.includes('Feature') || type.includes('Nieuw') || type.includes('Mega')) {
                                        IconComp = Icons.Star;
                                        iconColor = "text-yellow-600 bg-yellow-50 border-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-400";
                                    } else if (type.includes('Fix') || type.includes('Opgelost') || type.includes('Hersteld')) {
                                        IconComp = Icons.Wrench;
                                        iconColor = "text-green-600 bg-green-50 border-green-100 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400";
                                    } else if (type.includes('Update') || type.includes('Compact') || type.includes('Mobiele') || type.includes('Lijstweergave') || type.includes('Logboek')) {
                                         IconComp = Icons.Zap;
                                         iconColor = "text-teal-500 bg-teal-50 border-teal-100 dark:bg-teal-900/30 dark:border-teal-800/50 dark:text-teal-300";
                                    }

                                    return (
                                        <li key={idx} className="flex gap-3 text-xs text-stone-600 dark:text-stone-300 items-start bg-white dark:bg-stone-800 p-2.5 rounded-lg shadow-sm border border-stone-100 dark:border-stone-700">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${iconColor}`}>
                                                <Icon path={IconComp} size={14} />
                                            </div>
                                             <div className="pt-0.5">
                                                <span className="font-bold block text-stone-900 dark:text-stone-100 text-[10px] uppercase tracking-widest mb-1 opacity-90">{type}</span>
                                                <span className="leading-relaxed font-medium">{text || change}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </Modal>
);

// Dashboard modal
const DashboardModal = ({ dashboardData, dashboardUser, items, lades, openDashboardLades, openEditFromDashboard, setDashboardUser, setOpenDashboardLades, setShowDashboardModal, showDashboardModal, usersList, vriezers }) => (
<Modal isOpen={showDashboardModal} onClose={() => setShowDashboardModal(false)} title="Dashboard." color="blue" size="xl">
                <div className="space-y-5 min-h-[50vh]">
                    <div className="bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100/50 dark:border-teal-800/30">
                        <p className="text-xs font-medium text-stone-600 dark:text-stone-300 mb-2.5">Selecteer een gebruiker om direct in hun voorraad te kijken zonder in te loggen op hun account.</p>
                        <select 
                            className="w-full p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-white font-medium text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-sm"
                            value={dashboardUser} 
                            onChange={e => setDashboardUser(e.target.value)}
                        >
                            <option value="">Kies een gebruiker...</option>
                            {usersList.map(u => (
                                <option key={u.id} value={u.id}>{u.email || u.displayName} ({u.id.substring(0,6)}...)</option>
                            ))}
                        </select>
                    </div>

                    {dashboardData.loading ? (
                        <div className="text-center py-12 text-teal-500 dark:text-teal-400 flex flex-col items-center justify-center bg-stone-50/50 dark:bg-stone-800/30 rounded-2xl border border-stone-100 dark:border-stone-700/50">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center mb-3 shadow-inner">
                                <Icon path={Icons.Box} className="animate-bounce drop-shadow-sm" size={24} />
                            </div>
                            <span className="font-bold tracking-wide text-sm text-stone-700 dark:text-stone-300">Laden van voorraad...</span>
                        </div>
                    ) : dashboardUser && dashboardData.vriezers.length === 0 ? (
                        <div className="text-center py-12 text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-700/50 font-medium text-sm">
                            Deze gebruiker heeft nog geen locaties aangemaakt.
                        </div>
                    ) : (
                        <div className="space-y-8 mt-5">
                            {['vriezer', 'frig', 'voorraad'].map(type => {
                                const typeLocaties = sortLocaties(dashboardData.vriezers.filter(v => (v.type || 'vriezer') === type));
                                if (typeLocaties.length === 0) return null;
                                
                                const typeNames = { vriezer: 'Vriezer', frig: 'Koelkast', voorraad: 'Voorraad' };

                                return (
                                    <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 border-b border-stone-100 dark:border-stone-800 pb-2">
                                            {typeNames[type]}
                                        </h3>
                                        
                                        <div className="flex flex-col gap-5">
                                            {typeLocaties.map(v => (
                                                <div key={v.id} className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-stone-200/60 dark:border-stone-700/60 shadow-sm overflow-hidden">
                                                    <h4 className="font-bold text-lg mb-3 text-stone-900 dark:text-white flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-full bg-gradient-to-br from-${v.color || 'blue'}-400 to-${v.color || 'blue'}-600 inline-block shadow-sm border border-white dark:border-stone-800`}></span>
                                                        {v.naam}
                                                    </h4>
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start mt-2">
                                                        {dashboardData.lades.filter(l => l.vriezerId === v.id).sort((a,b) => a.naam.localeCompare(b.naam)).map(l => {
                                                            const ladeItems = dashboardData.items.filter(i => i.ladeId === l.id).sort((a,b) => a.naam.localeCompare(b.naam));
                                                            const isLadeOpen = openDashboardLades.has(l.id);
                                                            
                                                            return (
                                                                <div key={l.id} className="bg-stone-50 dark:bg-stone-900/50 rounded-xl shadow-inner border border-stone-200/50 dark:border-stone-700/50 flex flex-col transition-all overflow-hidden">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newSet = new Set(openDashboardLades);
                                                                            if(newSet.has(l.id)) newSet.delete(l.id);
                                                                            else newSet.add(l.id);
                                                                            setOpenDashboardLades(newSet);
                                                                        }}
                                                                        className={`w-full text-left font-bold text-xs p-3 flex justify-between items-center sticky top-0 z-10 transition-colors ${isLadeOpen ? 'bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 border-b border-stone-100 dark:border-stone-700 shadow-sm' : 'bg-transparent text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                                                                    >
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Icon path={isLadeOpen ? Icons.ChevronDown : Icons.ChevronRight} size={16} className="text-stone-400"/>
                                                                            {l.naam}
                                                                        </span>
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${isLadeOpen ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'}`}>{ladeItems.length} items</span>
                                                                    </button>
                                                                    
                                                                    {isLadeOpen && (
                                                                        <ul className="p-1.5 space-y-1.5 overflow-y-auto flex-grow max-h-[50vh] bg-white dark:bg-stone-800 custom-scrollbar">
                                                                            {ladeItems.length === 0 ? (
                                                                                <li className="text-[11px] italic font-medium text-stone-400 text-center py-4">Lade is leeg</li>
                                                                            ) : (
                                                                                ladeItems.map(i => (
                                                                                    <li key={i.id} className="text-xs flex justify-between items-center bg-stone-50/80 dark:bg-stone-700/50 px-2.5 py-2 rounded-lg border border-stone-100 dark:border-stone-600 shadow-sm transition-all hover:border-teal-300 hover:shadow-md dark:hover:border-teal-600 group">
                                                                                        <span className="truncate mr-2 flex items-center gap-2 text-stone-900 dark:text-stone-100">
                                                                                            <span className="text-xl drop-shadow-sm">{i.emoji}</span>
                                                                                            <div className="truncate">
                                                                                                <span className="font-bold block tracking-tight">{i.naam}</span>
                                                                                                {i.notitie && <span className="block text-[9px] font-medium italic text-stone-500 mt-0.5 truncate">{i.notitie}</span>}
                                                                                            </div>
                                                                                        </span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="font-bold text-stone-800 dark:text-stone-200 flex-shrink-0 whitespace-nowrap bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-600 shadow-sm">
                                                                                                {formatAantal(i.aantal)} <span className="text-[9px] font-medium text-stone-500 dark:text-stone-400 uppercase ml-0.5">{i.eenheid}</span>
                                                                                            </span>
                                                                                            <button onClick={() => openEditFromDashboard(i)} className="p-1.5 text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 rounded-md flex-shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-sm" title="Bewerken">
                                                                                                <Icon path={Icons.Edit2} size={14}/>
                                                                                            </button>
                                                                                        </div>
                                                                                    </li>
                                                                                ))
                                                                            )}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>
);

// Instellingen / beheer modal
const BeheerModal = ({ actieveCategorieen, beheerTab, customUnitsFrig, customUnitsVoorraad, customUnitsVries, cycleLocatieColor, draggedCatName, draggedLocId, draggedUnitName, editCatInputColor, editCatInputName, editUnitInput, editingCatName, editingLadeId, editingLadeName, editingUnitName, eenheidFilter, filteredLocaties, handleAddCat, handleAddLade, handleAddLocatie, handleAddUnit, handleDeleteCat, handleDeleteLade, handleDeleteLocatie, handleDeleteUnit, handleDragEnd, handleDragOver, handleDragStart, handleDragStartCat, handleDragStartUnit, handleDrop, handleDropCat, handleDropUnit, isAdmin, items, lades, myHiddenTabs, newCatColor, newCatName, newLadeNaam, newLocatieColor, newLocatieNaam, newUnitNaam, saveCat, saveLadeName, saveUnitName, selectedLocatieForBeheer, setBeheerTab, setDraggedCatName, setDraggedUnitName, setEditCatInputColor, setEditCatInputName, setEditUnitInput, setEditingLadeName, setEenheidFilter, setNewCatColor, setNewCatName, setNewLadeNaam, setNewLocatieColor, setNewLocatieNaam, setNewUnitNaam, setSelectedLocatieForBeheer, setShowBeheerModal, showBeheerModal, startEditCat, startEditLade, startEditUnit }) => (
<Modal isOpen={showBeheerModal} onClose={() => setShowBeheerModal(false)} title="Instellingen." color="purple">
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg mb-5 border border-stone-200 dark:border-stone-700">
                    <button onClick={() => setBeheerTab('locaties')} className={`flex-1 py-1.5 font-bold text-xs rounded-md transition-all ${beheerTab==='locaties'?'bg-white dark:bg-stone-700 text-teal-600 dark:text-teal-400 shadow-sm':'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Locaties.</button>
                    <button onClick={() => setBeheerTab('categorieen')} className={`flex-1 py-1.5 font-bold text-xs rounded-md transition-all ${beheerTab==='categorieen'?'bg-white dark:bg-stone-700 text-purple-600 dark:text-purple-400 shadow-sm':'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Categorieën.</button>
                    <button onClick={() => setBeheerTab('eenheden')} className={`flex-1 py-1.5 font-bold text-xs rounded-md transition-all ${beheerTab==='eenheden'?'bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-400 shadow-sm':'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Eenheden.</button>
                </div>

                {beheerTab === 'locaties' && (
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Locaties</h4>
                                <span className="text-[9px] uppercase text-stone-400 font-bold tracking-widest bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded shadow-sm">Sleep om te sorteren</span>
                            </div>
                            <ul className="space-y-2 mb-4 relative">
                                {filteredLocaties.map(l => (
                                    <li 
                                        key={l.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, l.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, l.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex justify-between p-2.5 bg-white dark:bg-stone-800 rounded-lg items-center border shadow-sm transition-all ${draggedLocId === l.id ? 'opacity-40 border-teal-400 border-dashed' : 'border-stone-200 dark:border-stone-700 hover:border-teal-300 dark:hover:border-teal-600'}`}
                                    >
                                        <div className="flex items-center gap-2.5 w-full">
                                            <div className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300" title="Sleep om volgorde aan te passen">
                                                <Icon path={Icons.GripVertical} size={16}/>
                                            </div>
                                            <button 
                                                onClick={() => cycleLocatieColor(l)}
                                                className={`w-6 h-6 flex-shrink-0 rounded-full bg-gradient-to-br ${GRADIENTS[l.color || 'blue']} border border-white dark:border-stone-800 shadow-sm transition-transform hover:scale-110 active:scale-95`}
                                                title="Klik om kleur te wijzigen"
                                            ></button>
                                            <span onClick={() => setSelectedLocatieForBeheer(l.id)} className={`cursor-pointer flex-grow text-sm font-medium ${selectedLocatieForBeheer===l.id?'text-teal-600 dark:text-teal-400 font-bold':''}`}>{l.naam}</span>
                                        </div>
                                        <button onClick={() => handleDeleteLocatie(l.id)} className="text-red-500 p-1.5 ml-2 flex-shrink-0 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition-colors active:scale-95"><Icon path={Icons.Trash2} size={14}/></button>
                                    </li>
                                ))}
                            </ul>
                            <form onSubmit={handleAddLocatie} className="flex gap-2">
                                <select 
                                    value={newLocatieColor} 
                                    onChange={e => setNewLocatieColor(e.target.value)}
                                    className="border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white w-24 text-xs font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm"
                                >
                                    {Object.keys(GRADIENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input className="flex-grow border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white text-xs font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm" placeholder="Nieuwe locatie" value={newLocatieNaam} onChange={e=>setNewLocatieNaam(e.target.value)} required />
                                <button className="bg-teal-600 text-white px-4 rounded-lg font-bold shadow-sm hover:bg-teal-700 active:scale-95 transition-all">+</button>
                            </form>
                        </div>
                        {selectedLocatieForBeheer && (
                            <div className="pt-4 border-t border-stone-100 dark:border-stone-700 animate-in fade-in slide-in-from-top-2">
                                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-2 text-sm">Lades <span className="text-teal-500 font-medium text-xs ml-1">in {filteredLocaties.find(l => l.id === selectedLocatieForBeheer)?.naam}</span></h4>
                                <ul className="space-y-2 mb-3">
                                    {lades.filter(l => l.vriezerId === selectedLocatieForBeheer).sort((a,b)=>a.naam.localeCompare(b.naam)).map(l => (
                                        <li key={l.id} className="flex justify-between p-2 bg-white dark:bg-stone-800 rounded-lg items-center border border-stone-200 dark:border-stone-700 shadow-sm transition-all hover:border-teal-200">
                                            {editingLadeId === l.id ? 
                                                <div className="flex gap-2 w-full"><input className="flex-grow border border-teal-400 p-1.5 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium focus:outline-none" value={editingLadeName} onChange={e=>setEditingLadeName(e.target.value)} /><button onClick={()=>saveLadeName(l.id)} className="bg-green-500 text-white px-3 rounded-md font-bold shadow-sm active:scale-95"><Icon path={Icons.Check} size={14}/></button></div> 
                                                : 
                                                <><span className="font-medium text-sm text-stone-700 dark:text-stone-200">{l.naam}</span><div className="flex gap-1.5"><button onClick={()=>startEditLade(l)} className="text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Edit2} size={14}/></button><button onClick={() => handleDeleteLade(l.id)} className="text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Trash2} size={14}/></button></div></>
                                            }
                                        </li>
                                    ))}
                                </ul>
                                <form onSubmit={handleAddLade} className="flex gap-2"><input className="flex-grow border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white text-xs font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm" placeholder="Nieuwe lade" value={newLadeNaam} onChange={e=>setNewLadeNaam(e.target.value)} required /><button className="bg-teal-600 text-white px-4 rounded-lg font-bold shadow-sm hover:bg-teal-700 active:scale-95 transition-all">+</button></form>
                            </div>
                        )}
                    </div>
                )}
{beheerTab === 'categorieen' && (
                    <div className="animate-in fade-in slide-in-from-left-2">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">Categorieën</h4>
                            <span className="text-[9px] uppercase text-stone-400 font-bold tracking-widest bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded shadow-sm">Sleep om te sorteren</span>
                        </div>
                        <ul className="space-y-2 mb-4 relative">
                            {actieveCategorieen.map(cat => (
                                <li 
                                    key={cat.name} 
                                    draggable
                                    onDragStart={(e) => handleDragStartCat(e, cat.name)}
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                    onDrop={(e) => handleDropCat(e, cat.name)}
                                    onDragEnd={() => setDraggedCatName(null)}
                                    className={`flex justify-between p-2.5 bg-white dark:bg-stone-800 rounded-lg items-center border shadow-sm transition-all ${draggedCatName === cat.name ? 'opacity-40 border-purple-400 border-dashed' : 'border-stone-200 dark:border-stone-700 hover:border-purple-300'}`}
                                >
                                    <div className="flex items-center gap-2.5 w-full">
                                        <div className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-600 dark:text-stone-500" title="Sleep om volgorde aan te passen">
                                            <Icon path={Icons.GripVertical} size={16}/>
                                        </div>
                                        {editingCatName === cat.name ?
                                            <div className="flex gap-2 w-full items-center">
                                                <input className="flex-grow border border-purple-400 p-1.5 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium focus:outline-none" value={editCatInputName} onChange={e=>setEditCatInputName(e.target.value)} />
                                                <select className="border border-purple-400 p-1.5 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium focus:outline-none" value={editCatInputColor} onChange={e=>setEditCatInputColor(e.target.value)}>
                                                    {Object.keys(BADGE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <button onClick={saveCat} className="bg-green-500 text-white px-3 rounded-md font-bold shadow-sm active:scale-95"><Icon path={Icons.Check} size={14}/></button>
                                            </div>
                                            :
                                            <>
                                                <div className="flex items-center gap-2.5 flex-grow"><div className={`w-3 h-3 rounded-full bg-${cat.color}-500 shadow-sm border border-white dark:border-stone-800`}></div><span className="font-medium text-sm text-stone-700 dark:text-stone-200">{cat.name}</span></div>
                                                <div className="flex gap-1.5">
                                                    <button onClick={()=>startEditCat(cat)} className="text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Edit2} size={14}/></button>
                                                    <button onClick={() => handleDeleteCat(cat.name)} className="text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Trash2} size={14}/></button>
                                                </div>
                                            </>
                                        }
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <form onSubmit={handleAddCat} className="flex gap-2 items-center">
                            <input className="flex-grow border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white text-xs font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm" placeholder="Naam" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required />
                            <select className="border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white text-xs font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm" value={newCatColor} onChange={e=>setNewCatColor(e.target.value)}>
                                {Object.keys(BADGE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="bg-purple-600 text-white px-4 rounded-lg font-bold shadow-sm hover:bg-purple-700 active:scale-95 transition-all">+</button>
                        </form>
                    </div>
                )}

                {beheerTab === 'eenheden' && (
                    <div className="animate-in fade-in slide-in-from-right-2">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">Mijn eenheden</h4>
                            <span className="text-[9px] uppercase text-stone-400 font-bold tracking-widest bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded shadow-sm">Sleep om te sorteren</span>
                        </div>
                        
                        <div className="flex bg-stone-100/80 dark:bg-stone-800/80 p-1 rounded-lg mb-4 border border-stone-200/50 dark:border-stone-700/50">
                            <button onClick={() => setEenheidFilter('vries')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${eenheidFilter === 'vries' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Vriezer.</button>
                            {(!myHiddenTabs.includes('frig') || isAdmin) && (
                                <button onClick={() => setEenheidFilter('frig')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${eenheidFilter === 'frig' ? 'bg-white dark:bg-stone-700 shadow-sm text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Frig.</button>
                            )}
                            {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                                <button onClick={() => setEenheidFilter('voorraad')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${eenheidFilter === 'voorraad' ? 'bg-white dark:bg-stone-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>Stock.</button>
                            )}
                        </div>

                        {(() => {
                            const actieveEenhedenLijst = (
                                eenheidFilter === 'voorraad' ? (customUnitsVoorraad.length > 0 ? [...new Set([...customUnitsVoorraad, ...EENHEDEN_VOORRAAD])] : EENHEDEN_VOORRAAD) : 
                                eenheidFilter === 'frig' ? (customUnitsFrig.length > 0 ? [...new Set([...customUnitsFrig, ...EENHEDEN_FRIG])] : EENHEDEN_FRIG) :
                                (customUnitsVries.length > 0 ? [...new Set([...customUnitsVries, ...EENHEDEN_VRIES])] : EENHEDEN_VRIES)
                            );

                            return (
                                <ul className="space-y-2 mb-4 relative">
                                    {actieveEenhedenLijst.length === 0 ? <li className="text-stone-400 font-medium italic text-center py-4 text-xs bg-stone-50 dark:bg-stone-800/50 rounded-lg">Geen eigen eenheden voor {eenheidFilter}.</li> : 
                                    actieveEenhedenLijst.map(u => (
                                        <li 
                                            key={u} 
                                            draggable
                                            onDragStart={(e) => handleDragStartUnit(e, u)}
                                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                            onDrop={(e) => handleDropUnit(e, u)}
                                            onDragEnd={() => setDraggedUnitName(null)}
                                            className={`flex justify-between p-2.5 bg-white dark:bg-stone-800 rounded-lg items-center border shadow-sm transition-all hover:border-stone-300 ${draggedUnitName === u ? 'opacity-40 border-orange-400 border-dashed' : 'border-stone-200 dark:border-stone-700'}`}
                                        >
                                            <div className="flex items-center gap-2.5 w-full">
                                                <div className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-600 dark:text-stone-500" title="Sleep om volgorde aan te passen">
                                                    <Icon path={Icons.GripVertical} size={16}/>
                                                </div>
                                                {editingUnitName === u ? 
                                                    <div className="flex gap-2 w-full"><input className="flex-grow border border-teal-400 p-1.5 rounded-md bg-white dark:bg-stone-700 dark:text-white text-xs font-medium focus:outline-none" value={editUnitInput} onChange={e=>setEditUnitInput(e.target.value)} /><button onClick={saveUnitName} className="bg-green-500 text-white px-3 rounded-md font-bold shadow-sm active:scale-95"><Icon path={Icons.Check} size={14}/></button></div>
                                                    :
                                                    <>
                                                        <span className="flex-grow font-medium text-sm text-stone-700 dark:text-stone-200">{u}</span>
                                                        <div className="flex gap-1.5 flex-shrink-0">
                                                            <button onClick={()=>startEditUnit(u)} className="text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Edit2} size={14}/></button>
                                                            <button onClick={() => handleDeleteUnit(u)} className="text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-1.5 rounded-md transition-all active:scale-95"><Icon path={Icons.Trash2} size={14}/></button>
                                                        </div>
                                                    </>
                                                }
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            );
                        })()}
                        <form onSubmit={handleAddUnit} className="flex gap-2"><input className="flex-grow border border-stone-200 dark:border-stone-700 p-2 rounded-lg bg-white dark:bg-stone-800 dark:text-white text-xs font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm" placeholder="Nieuwe eenheid" value={newUnitNaam} onChange={e=>setNewUnitNaam(e.target.value)} required /><button className={`text-white font-bold px-4 rounded-lg shadow-sm active:scale-95 transition-all ${eenheidFilter === 'voorraad' ? 'bg-orange-500 hover:bg-orange-600' : eenheidFilter === 'frig' ? 'bg-green-600 hover:bg-green-700' : 'bg-teal-600 hover:bg-teal-700'}`}>+</button></form>
                    </div>
                )}
            </Modal>
);

// Gebruikersbeheer modal
const UserAdminModal = ({ beheerdeUserId, globalOnboardingActive, items, maintenanceMode, recepten, resetTutorialForEveryone, setBeheerdeUserId, setDashboardUser, setShowDashboardModal, setShowUserAdminModal, showNotification, showUserAdminModal, toggleGlobalOnboardingStatus, toggleMaintenanceMode, toggleUserBalansMode, toggleUserHelpButton, toggleUserNotifications, toggleUserStatus, toggleUserTabVisibility, toggleUserTourDisabled, triggerTourForUser, usersList }) => (
<Modal isOpen={showUserAdminModal} onClose={() => setShowUserAdminModal(false)} title="Gebruikers." color="pink">
                
                <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-4 rounded-xl border border-red-200/60 dark:border-red-800/50 mb-5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
                    <div>
                        <h4 className="font-bold text-sm text-red-800 dark:text-red-300 flex items-center gap-1.5">
                            <Icon path={Icons.Wrench} size={16}/> Onderhoudsmodus
                        </h4>
                        <p className="text-[10px] font-medium text-red-600/80 dark:text-red-400/80 mt-0.5">Blokkeer toegang voor normale gebruikers. Jij als Admin kan nog wel in de app om te testen.</p>
                    </div>
                    <button 
                        onClick={toggleMaintenanceMode} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex-shrink-0 shadow-sm ${maintenanceMode ? 'bg-red-600 text-white shadow-md hover:bg-red-700' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50 dark:bg-transparent dark:border-red-700/50 dark:hover:bg-red-900/40'}`}
                    >
                        {maintenanceMode ? 'Onderhoud is AAN' : 'Zet in Onderhoud'}
                    </button>
                </div>

                <div className="bg-stone-50/80 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/60 dark:border-stone-700/50 mb-5 shadow-sm">
                    <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 mb-1.5 flex items-center gap-1.5">
                        <Icon path={Icons.BookOpen} size={16} /> Algemene Rondleiding (Tour)
                    </h4>
                    <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400 mb-3">Stel in of nieuwe gebruikers standaard de tour te zien krijgen.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={toggleGlobalOnboardingStatus} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 transition-all active:scale-95 shadow-sm ${globalOnboardingActive ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/50' : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600'}`}>
                            <Icon path={globalOnboardingActive ? Icons.Check : Icons.X} size={14} /> 
                            {globalOnboardingActive ? 'Tour staat AAN' : 'Tour is UIT'}
                        </button>
                        <button onClick={resetTutorialForEveryone} className="flex-1 py-2 px-3 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/50 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm">
                            Reset Tour voor Iedereen
                        </button>
                    </div>
                </div>

                <ul className="divide-y divide-stone-100 dark:divide-stone-700/50 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3.5 flex flex-col gap-2.5 hover:bg-stone-50/50 dark:hover:bg-stone-700/30 transition-colors">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start">
                                <div>
                                    <p className="font-bold text-stone-900 dark:text-white text-sm flex items-center gap-2">
                                        {u.email || u.displayName}
                                        {u.id === beheerdeUserId && <span className="text-[9px] bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 px-1.5 py-0.5 rounded uppercase tracking-widest border border-teal-200 dark:border-teal-800/50">Huidig</span>}
                                    </p>
                                    <p className="text-[10px] font-mono text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-900 inline-block px-1.5 py-0.5 rounded mt-1 border border-stone-200 dark:border-stone-800">{u.id}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 justify-end">
                                    <button onClick={() => { setDashboardUser(u.id); setShowUserAdminModal(false); setShowDashboardModal(true); }} className="px-2.5 py-1.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-all shadow-sm flex items-center gap-1 active:scale-95">
                                        <Icon path={Icons.LayoutDashboard} size={12}/> Dashboard
                                    </button>
                                    {u.id !== beheerdeUserId && (
                                        <button onClick={() => { setBeheerdeUserId(u.id); setShowUserAdminModal(false); showNotification(`Ingelogd als ${u.email || 'gebruiker'}`, 'success'); }} className="px-2.5 py-1.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 dark:border-teal-800/50 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 transition-all shadow-sm active:scale-95">
                                            Wissel
                                        </button>
                                    )}
                                    <button onClick={() => toggleUserStatus(u.id, u.disabled)} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold shadow-sm transition-all active:scale-95 border ${u.disabled ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 hover:bg-green-100'}`}>
                                        {u.disabled ? 'Geblokkeerd' : 'Actief'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1 bg-stone-50/80 dark:bg-stone-900/50 p-2.5 rounded-lg border border-stone-200/60 dark:border-stone-700/50">
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('frig')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'frig')}
                                        className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                    />
                                    <span>Verberg 'Frig.' tabblad</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('voorraad')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'voorraad')}
                                        className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                    />
                                    <span>Verberg 'Stock.' tabblad</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 mt-1 border-t border-stone-200/60 dark:border-stone-700/60 pt-1.5">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('weekmenu')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'weekmenu')}
                                        className="rounded border-stone-300 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
                                    />
                                    <span className="font-bold text-pink-700 dark:text-pink-400">Verberg 'Week.' tabblad</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('recepten')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'recepten')}
                                        className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                    />
                                    <span className="font-bold text-teal-700 dark:text-teal-400">Verberg 'Recepten.' tabblad</span>
                                </div>                                    

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-stone-700 dark:text-stone-300 mt-1 border-t border-stone-200/60 dark:border-stone-700/60 pt-2 pb-1">
                                    
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={(u.hiddenTabs || []).includes('balans')} 
                                            onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'balans')}
                                            className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                        />
                                        <span className="font-bold text-teal-700 dark:text-teal-400">Verberg 'Controle' knop</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-stone-500 dark:text-stone-400">Status:</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleUserBalansMode(u.id, u.showBalans)}
                                            className={`w-10 h-6 rounded-full p-1 transition-colors border shadow-inner flex items-center focus:outline-none ${u.showBalans ? 'bg-green-500 border-green-600' : 'bg-stone-300 border-stone-400 dark:bg-stone-600 dark:border-stone-700'}`}
                                            title={u.showBalans ? "Controle staat AAN" : "Controle staat UIT"}
                                        >
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${u.showBalans ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </button>
                                        <span className={`font-bold w-6 ${u.showBalans ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                                            {u.showBalans ? 'AAN' : 'UIT'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 border-t border-stone-200/60 dark:border-stone-700/60 pt-2 mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={u.tourDisabled || false} 
                                        onChange={() => toggleUserTourDisabled(u.id, u.tourDisabled)}
                                        className="rounded border-stone-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                                    />
                                    <span className="font-bold text-orange-700 dark:text-orange-400">Rondleiding uitzetten voor deze gebruiker</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        checked={u.showHelpButton || false} 
                                        onChange={() => toggleUserHelpButton(u.id, u.showHelpButton)}
                                        className="rounded border-stone-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                                    />
                                    <span className="font-bold text-red-700 dark:text-red-400">Toon lichtrode 'Hulp' knop in hoofdmenu</span>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        checked={u.notificationsEnabled !== false} 
                                        onChange={() => toggleUserNotifications(u.id, u.notificationsEnabled !== false)}
                                        className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                    />
                                    <span className="font-bold text-teal-700 dark:text-teal-400">Meldingen (bijna vervallen producten) toestaan</span>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => triggerTourForUser(u.id)} className="w-full py-1.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:border-purple-800/50 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md text-[10px] font-bold transition-all active:scale-95 shadow-sm uppercase tracking-wide">
                                        Zet Tour opnieuw klaar
                                    </button>
                                </div>
                            </div>
                            <p className="text-[9px] uppercase font-bold tracking-widest text-stone-400 dark:text-stone-500 mt-0.5">
                                Laatst gezien: {u.laatstGezien ? formatDateTime(u.laatstGezien) : 'Nooit'}
                            </p>
                        </li>
                    ))}
                </ul>
            </Modal>
);

// Tour aanpassen modal
const TourAdminModal = ({ editingTourSteps, handleAddEditStep, handleDeleteEditStep, handleUpdateEditStep, items, moveEditStep, saveTourStepsToDb, setShowTourAdminModal, showTourAdminModal }) => (
<Modal isOpen={showTourAdminModal} onClose={() => setShowTourAdminModal(false)} title="Tour Aanpassen." color="purple" size="lg">
                <p className="text-xs font-medium text-stone-600 dark:text-stone-300 mb-5 bg-stone-50 dark:bg-stone-800/50 p-3 rounded-lg border border-stone-200 dark:border-stone-700">Hier kun je de inhoud van de rondleiding stap-voor-stap aanpassen. Gebruik de pijltjes om de volgorde te veranderen.</p>
                <div className="space-y-4">
                    {editingTourSteps.map((step, index) => (
                        <div key={index} className="bg-white/50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/60 dark:border-stone-700/60 relative shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute top-3 right-3 flex gap-1 bg-stone-100 dark:bg-stone-700 rounded-md p-1">
                                <button onClick={() => moveEditStep(index, 'up')} disabled={index === 0} className={`p-1 rounded transition-colors ${index === 0 ? 'text-stone-300 dark:text-stone-600' : 'text-stone-600 hover:bg-white hover:shadow-sm dark:text-stone-300 dark:hover:bg-stone-600'}`}>
                                    <Icon path={Icons.ChevronDown} className="rotate-180" size={14}/>
                                </button>
                                <button onClick={() => moveEditStep(index, 'down')} disabled={index === editingTourSteps.length - 1} className={`p-1 rounded transition-colors ${index === editingTourSteps.length - 1 ? 'text-stone-300 dark:text-stone-600' : 'text-stone-600 hover:bg-white hover:shadow-sm dark:text-stone-300 dark:hover:bg-stone-600'}`}>
                                    <Icon path={Icons.ChevronDown} size={14}/>
                                </button>
                                <div className="w-px bg-stone-300 dark:bg-stone-600 mx-0.5"></div>
                                <button onClick={() => handleDeleteEditStep(index)} className="p-1 rounded text-red-500 hover:bg-white hover:shadow-sm dark:hover:bg-stone-600 transition-colors">
                                    <Icon path={Icons.Trash2} size={14}/>
                                </button>
                            </div>
                            
                            <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400 mb-3 border-b border-stone-100 dark:border-stone-700/50 pb-1.5 inline-block">Stap {index + 1}</h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Titel</label>
                                    <input type="text" className="w-full p-2.5 border border-stone-200 dark:border-stone-600 rounded-lg dark:bg-stone-700 dark:text-white text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm" value={step.title} onChange={e => handleUpdateEditStep(index, 'title', e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-grow space-y-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Icoon</label>
                                        <select className="w-full p-2.5 border border-stone-200 dark:border-stone-600 rounded-lg dark:bg-stone-700 dark:text-white text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm" value={step.icon} onChange={e => handleUpdateEditStep(index, 'icon', e.target.value)}>
                                            {Object.keys(Icons).map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-shrink-0 w-10 flex items-end justify-center pb-2 text-purple-500 dark:text-purple-400 drop-shadow-sm">
                                        <Icon path={Icons[step.icon] || Icons.Box} size={24}/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-3 space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Tekst (Content)</label>
                                <textarea className="w-full p-2.5 border border-stone-200 dark:border-stone-600 rounded-lg dark:bg-stone-700 dark:text-white text-sm font-medium h-20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm resize-none" value={step.content} onChange={e => handleUpdateEditStep(index, 'content', e.target.value)} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Kleur (Thema)</label>
                                <select className="w-full p-2.5 border border-stone-200 dark:border-stone-600 rounded-lg dark:bg-stone-700 dark:text-white text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm" value={step.colorName} onChange={e => handleUpdateEditStep(index, 'colorName', e.target.value)}>
                                    {TOUR_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={handleAddEditStep} className="w-full py-3 bg-stone-50 text-stone-600 dark:bg-stone-800/50 dark:text-stone-300 rounded-xl font-bold border-2 border-dashed border-stone-300 dark:border-stone-600 hover:bg-stone-100 hover:border-stone-400 dark:hover:bg-stone-700 dark:hover:border-stone-500 transition-all active:scale-95 flex justify-center items-center gap-2 text-sm">
                        <Icon path={Icons.Plus} size={16}/> Nieuwe Stap Toevoegen
                    </button>
                    
                    <button onClick={saveTourStepsToDb} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-md shadow-purple-500/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all mt-3 text-sm">
                        Tour Opslaan
                    </button>
                </div>
            </Modal>
);

// Voorraad controle modal
const AuditModal = ({ auditItemsToDelete, auditLade, auditOriginals, auditedItems, beheerdeUserId, customUnitsFrig, customUnitsVoorraad, customUnitsVries, items, lades, openEdit, setAuditItemsToDelete, setAuditLade, setAuditedItems, setFormData, setModalType, setShowAddModal, user, vriezers }) => (
<Modal isOpen={!!auditLade} onClose={() => { setAuditLade(null); setAuditItemsToDelete(new Set()); }} title={`Controle: ${auditLade?.naam}`} color="blue" size="lg">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1.5 custom-scrollbar">
                    <div className="bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-teal-200/60 dark:border-teal-800/50 text-xs text-teal-900 dark:text-teal-200 shadow-sm flex flex-col">
                        <div>
                            <strong className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 mb-1"><Icon path={Icons.Info} size={14}/> Instructie</strong> 
                            <span className="font-medium leading-relaxed">Controleer de aantallen in deze lade. Nieuwe items kleuren <strong>blauw</strong>, gewijzigde items kleuren <strong>oranje</strong>. Klik op <strong>'Klopt!'</strong> als het item klopt, of <strong>'Klopt niet'</strong> om het door te strepen. Verwijderingen zijn pas definitief bij opslaan.</span>
                        </div>

                        {auditLade?.laatstGecontroleerd && (
                            <div className="mt-3 pt-2 border-t border-teal-200/60 dark:border-teal-800/60 flex items-center gap-1.5 text-[10px] uppercase font-bold text-teal-800/80 dark:text-teal-300/80 tracking-wider">
                                <Icon path={Icons.CheckSquare} size={14}/>
                                Laatst gecontroleerd: {formatDateTime(auditLade.laatstGecontroleerd)}
                            </div>
                        )}
                        
                        <button 
                            onClick={() => {
                                const loc = vriezers.find(v => v.id === auditLade.vriezerId);
                                const locType = loc ? loc.type : 'vriezer';
                                setModalType(locType);
                                const defaultCat = locType === 'voorraad' ? 'Pasta' : 'Vlees';

                                setFormData({
                                    naam: '', aantal: 1, eenheid: 'stuks', 
                                    vriezerId: auditLade.vriezerId, ladeId: auditLade.id, 
                                    categorie: defaultCat, minimumVoorraad: '', prijs: '', 
                                    ingevrorenOp: new Date().toISOString().split('T')[0], 
                                    houdbaarheidsDatum: '', notitie: '', emoji: '', geplandeDatum: '', bulkAanmaak: 1, tags: [], altijdGoed: false,
                                    viaBalans: true 
                                });
                                setShowAddModal(true);
                            }}
                            className="mt-3 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                            <Icon path={Icons.Plus} size={16} /> Direct een nieuw product toevoegen in deze lade
                        </button>
                    </div>

                    {auditLade && items.filter(i => i.ladeId === auditLade.id)
                        .sort((a,b) => {
                            const aDel = auditItemsToDelete.has(a.id);
                            const bDel = auditItemsToDelete.has(b.id);
                            if (aDel && !bDel) return 1;
                            if (!aDel && bDel) return -1;
                            return a.naam.localeCompare(b.naam);
                        })
                        .map(item => {
                        const isChecked = auditedItems.has(item.id);
                        const isMarkedForDelete = auditItemsToDelete.has(item.id);
                        
                        const originalData = auditOriginals.current[item.id];
                        const isNew = !originalData; 
                        
                        const isChanged = originalData && (
                            parseFloat(item.aantal || 0) !== originalData.aantal || 
                            item.eenheid !== originalData.eenheid ||
                            item.naam !== originalData.naam ||
                            item.categorie !== originalData.categorie ||
                            item.emoji !== originalData.emoji ||
                            (item.notitie || '') !== originalData.notitie
                        );
                        
                        const ladeLoc = vriezers.find(v => v.id === auditLade.vriezerId);
                        const locType = ladeLoc ? ladeLoc.type : 'vriezer';
                        let contextEenheden = EENHEDEN_VRIES;
                        let activeCustomUnits = customUnitsVries;
                        
                        if (locType === 'voorraad') { 
                            contextEenheden = EENHEDEN_VOORRAAD; activeCustomUnits = customUnitsVoorraad; 
                        } else if (locType === 'frig') { 
                            contextEenheden = EENHEDEN_FRIG; activeCustomUnits = customUnitsFrig; 
                        }
                        const localAlleEenheden = [...new Set([...contextEenheden, ...activeCustomUnits])].sort();

                        const borderColor = isMarkedForDelete 
                            ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800/50 opacity-60 grayscale-[50%]' 
                            : isChecked 
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-800/80 shadow-inner scale-[0.99] opacity-75' 
                                : isNew
                                    ? 'bg-teal-50 border-teal-300 dark:bg-teal-900/20 dark:border-teal-800/80 shadow-sm' 
                                    : isChanged 
                                        ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-800/80 shadow-sm' 
                                        : 'bg-white border-stone-200 dark:bg-stone-800 dark:border-stone-700 shadow-sm hover:shadow-md';

                        return (
                            <div key={item.id} className={`flex flex-col xl:flex-row xl:items-center justify-between p-4 rounded-xl border transition-all duration-300 gap-3 ${borderColor}`}>
                                
                                <div className="flex items-center gap-3 truncate">
                                    <span className={`text-2xl drop-shadow-sm ${isMarkedForDelete ? 'opacity-50' : ''}`}>{item.emoji || '📦'}</span>
                                    <div className="truncate">
                                        <p className={`font-bold text-sm tracking-tight ${isChecked || isMarkedForDelete ? 'line-through' : ''} ${isMarkedForDelete ? 'text-red-800 dark:text-red-400 decoration-red-500/50' : isChecked ? 'text-green-800 dark:text-green-400 decoration-green-500/50' : isNew ? 'text-teal-900 dark:text-teal-100' : isChanged ? 'text-orange-900 dark:text-orange-100' : 'text-stone-900 dark:text-stone-100'}`}>{item.naam}</p>
                                        
                                        {isChecked && !isMarkedForDelete && <p className="text-[10px] font-bold text-stone-500 mt-0.5">Afgevinkt: <span className="text-stone-700 dark:text-stone-300">{item.aantal} {item.eenheid}</span></p>}
                                        {isMarkedForDelete && <p className="text-[10px] font-bold text-red-500 mt-0.5">Wordt verwijderd bij opslaan</p>}
                                        
                                        {!isChecked && !isMarkedForDelete && isNew && (
                                            <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-0.5 flex items-center gap-1">
                                                <Icon path={Icons.Plus} size={10}/> Nieuw toegevoegd
                                            </p>
                                        )}
                                        {!isChecked && !isMarkedForDelete && isChanged && !isNew && (
                                            <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                                                <Icon path={Icons.Edit2} size={10}/> Gewijzigd 
                                                {(parseFloat(item.aantal || 0) !== originalData.aantal || item.eenheid !== originalData.eenheid) && 
                                                    ` (was ${originalData.aantal} ${originalData.eenheid})`
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    {!isChecked && !isMarkedForDelete && (
                                        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                                            <div className="flex bg-stone-50 dark:bg-stone-900/50 rounded-lg p-1 border border-stone-200/80 dark:border-stone-700 shadow-inner">
                                                <button onClick={async () => {
                                                    const huidig = parseFloat(item.aantal);
                                                    const nw = Math.max(0.25, huidig - 0.25);
                                                    if (nw !== huidig) {
                                                        await db.collection('items').doc(item.id).update({ aantal: nw });
                                                        markLadeAsChanged(auditLade.id); // NIEUW
                                                        await logAction('Bewerkt', item.naam, `Aantal: ${huidig} ➔ ${nw} (Balans)`, user, beheerdeUserId);
                                                    }
                                                }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-stone-700 rounded-md text-stone-600 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 font-bold shadow-sm transition-all active:scale-95">-</button>
                                                
                                                <input 
                                                    type="number" step="0.25" min="0" value={item.aantal}
                                                    onChange={async (e) => {
                                                        const val = e.target.value;
                                                        if (val !== "") {
                                                            const nw = parseFloat(val);
                                                            const huidig = parseFloat(item.aantal);
                                                            if (!isNaN(nw) && nw >= 0 && nw !== huidig) {
                                                                await db.collection('items').doc(item.id).update({ aantal: nw });
                                                                markLadeAsChanged(auditLade.id); // NIEUW
                                                                await logAction('Bewerkt', item.naam, `Aantal: ${huidig} ➔ ${nw} (Balans)`, user, beheerdeUserId);
                                                            }
                                                        }
                                                    }}
                                                    className="w-14 text-center bg-transparent text-sm font-bold text-stone-900 dark:text-white outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                
                                                <button onClick={async () => {
                                                    const huidig = parseFloat(item.aantal);
                                                    const nw = huidig + 0.25;
                                                    await db.collection('items').doc(item.id).update({ aantal: nw });
                                                    markLadeAsChanged(auditLade.id); // NIEUW
                                                    await logAction('Bewerkt', item.naam, `Aantal: ${huidig} ➔ ${nw} (Balans)`, user, beheerdeUserId);
                                                }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-stone-700 rounded-md text-stone-600 dark:text-stone-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 font-bold shadow-sm transition-all active:scale-95">+</button>
                                            </div>

                                            <select 
                                                value={item.eenheid}
                                                onChange={async (e) => {
                                                    const nieuweEenheid = e.target.value;
                                                    await db.collection('items').doc(item.id).update({ eenheid: nieuweEenheid });
                                                    markLadeAsChanged(auditLade.id); // NIEUW
                                                    await logAction('Bewerkt', item.naam, `Eenheid: ${item.eenheid} ➔ ${nieuweEenheid} (Balans)`, user, beheerdeUserId);
                                                }}
                                                className="h-10 px-2 text-xs font-bold text-stone-700 bg-stone-50 border border-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm cursor-pointer transition-all"
                                            >
                                                {localAlleEenheden.map(eenheid => <option key={eenheid} value={eenheid}>{eenheid}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                                        {isMarkedForDelete ? (
                                            <button 
                                                onClick={() => {
                                                    const newSet = new Set(auditItemsToDelete);
                                                    newSet.delete(item.id);
                                                    setAuditItemsToDelete(newSet);
                                                }}
                                                className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
                                            >
                                                <span>Herstellen</span>
                                            </button>
                                        ) : !isChecked && (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        openEdit(item);
                                                        setFormData(prev => ({...prev, viaBalans: true})); 
                                                    }}
                                                    className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 hover:text-teal-700 dark:bg-teal-900/20 dark:border-teal-800/50 dark:text-teal-400 dark:hover:bg-teal-900/40"
                                                    title="Product bewerken"
                                                >
                                                    <Icon path={Icons.Edit2} size={14}/>
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        const newSet = new Set(auditItemsToDelete);
                                                        newSet.add(item.id);
                                                        setAuditItemsToDelete(newSet);
                                                        
                                                        const newAudit = new Set(auditedItems);
                                                        newAudit.delete(item.id);
                                                        setAuditedItems(newAudit);
                                                    }}
                                                    className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/40"
                                                    title="Ligt niet meer in de lade"
                                                >
                                                    <Icon path={Icons.Trash2} size={14}/>
                                                    <span className="hidden sm:inline">Klopt niet</span>
                                                </button>
                                            </>
                                        )}
                                        
                                        {!isMarkedForDelete && (
                                            <button 
                                                onClick={() => {
                                                    const newSet = new Set(auditedItems);
                                                    if (isChecked) newSet.delete(item.id); else newSet.add(item.id);
                                                    setAuditedItems(newSet);
                                                }}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center min-w-[100px] gap-1.5 transition-all active:scale-95 shadow-sm ${isChecked ? 'bg-green-500 text-white shadow-inner shadow-green-700/30' : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-green-100 hover:text-green-700 hover:border-green-300 dark:bg-stone-700 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-green-900/40 dark:hover:text-green-400 dark:hover:border-green-800'}`}
                                            >
                                                <Icon path={Icons.Check} size={14}/> <span>{isChecked ? 'Gecontroleerd' : 'Klopt!'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-700 flex justify-end">
                    <button 
                        onClick={async () => {
                            if (auditItemsToDelete.size > 0) {
                                const batch = db.batch();
                                const itemsToRemove = items.filter(i => auditItemsToDelete.has(i.id));
                                
                                for (const item of itemsToRemove) {
                                    batch.delete(db.collection('items').doc(item.id));
                                    await logAction('Verwijderd', item.naam, 'Ligt niet meer in lade (via Balans)', user, beheerdeUserId);
                                }
                                
                                try {
                                    await batch.commit();
                                } catch(e) {
                                    console.error("Fout bij verwijderen via balans", e);
                                }
                            }

                            if (auditLade) {
                                try {
                                    await db.collection('lades').doc(auditLade.id).update({
                                        laatstGecontroleerd: new Date(),
                                        laatstGewijzigd: new Date() // Synchroniseer wijzigingsdatum
                                    });
                                } catch(e) {
                                    console.error("Fout bij opslaan controle datum", e);
                                }
                            }
                            
                            setAuditLade(null);
                            setAuditItemsToDelete(new Set());
                            setAuditedItems(new Set());
                        }} 
                        className="bg-gradient-to-r from-teal-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-teal-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        Klaar met controleren
                    </button>
                </div>
            </Modal>
);

// Rondleiding / onboarding modal
const OnboardingTourModal = ({ finishTutorial, handleSwipeEnd, handleSwipeMove, handleSwipeStart, items, onboardingStep, showOnboarding, showWhatsNew, tourSteps }) => (
<Modal isOpen={showOnboarding} onClose={() => {}} title={`Rondleiding (${onboardingStep + 1}/${tourSteps.length})`} color={tourSteps[onboardingStep].colorName || 'blue'} position={showWhatsNew ? "right" : "center"} hideBackdrop={showWhatsNew} hideCloseButton={true}>
                    <div 
                        className="flex flex-col items-center text-center py-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 select-none touch-pan-y cursor-grab active:cursor-grabbing"
                        onTouchStart={handleSwipeStart}
                        onTouchMove={handleSwipeMove}
                        onTouchEnd={handleSwipeEnd}
                        onMouseDown={handleSwipeStart}
                        onMouseMove={handleSwipeMove}
                        onMouseUp={handleSwipeEnd}
                        onMouseLeave={handleSwipeEnd}
                    >
                        <div className={`w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-${tourSteps[onboardingStep].colorName || 'blue'}-100 to-${tourSteps[onboardingStep].colorName || 'blue'}-50 dark:from-${tourSteps[onboardingStep].colorName || 'blue'}-900/40 dark:to-${tourSteps[onboardingStep].colorName || 'blue'}-900/20 text-${tourSteps[onboardingStep].colorName || 'blue'}-600 dark:text-${tourSteps[onboardingStep].colorName || 'blue'}-400 mb-1 pointer-events-none shadow-md border border-white/50 dark:border-stone-700/50 rotate-3 transform transition-transform`}>
                            <Icon path={Icons[tourSteps[onboardingStep].icon] || Icons.Box} size={40} className="-rotate-3 drop-shadow-sm"/>
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 dark:text-white pointer-events-none tracking-tight leading-tight">{tourSteps[onboardingStep].title}</h3>
                        <p className="text-stone-500 dark:text-stone-300 leading-relaxed max-w-sm whitespace-pre-line pointer-events-none font-medium text-sm">{tourSteps[onboardingStep].content}</p>

                        <div className="flex gap-2 py-4 pointer-events-none">
                            {tourSteps.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === onboardingStep ? `bg-${tourSteps[onboardingStep].colorName || 'blue'}-600 dark:bg-${tourSteps[onboardingStep].colorName || 'blue'}-500 w-5 shadow-sm` : 'bg-stone-200 dark:bg-stone-700'}`}></div>
                            ))}
                        </div>

                        <div className="flex flex-col w-full items-center gap-2.5 pt-4 border-t border-stone-100 dark:border-stone-800">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 flex items-center gap-1.5 mb-2 animate-pulse bg-stone-50 dark:bg-stone-800 px-3 py-1 rounded-full">
                                <Icon path={Icons.ChevronRight} className="rotate-180" size={12} /> 
                                Swipe 
                                <Icon path={Icons.ChevronRight} size={12} />
                            </p>

                            {onboardingStep === tourSteps.length - 1 && (
                                <button onClick={finishTutorial} className={`w-full py-3 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 bg-gradient-to-r from-${tourSteps[onboardingStep].colorName || 'blue'}-500 to-${tourSteps[onboardingStep].colorName || 'blue'}-600 shadow-${tourSteps[onboardingStep].colorName || 'blue'}-500/30`}>
                                    Aan de slag!
                                </button>
                            )}

                            <button onClick={finishTutorial} className="mt-2 text-[10px] font-bold text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors opacity-50 hover:opacity-100 uppercase tracking-widest cursor-pointer bg-transparent border-none">
                                Overslaan
                            </button>
                        </div>
                    </div>
                </Modal>
);

// Product toevoegen/bewerken modal
const AddEditItemModal = ({ actieveCategorieen, alleEenheden, editingItem, formData, formLades, handleModalTypeChange, handleSaveItem, isAdmin, items, modalLocaties, modalType, myHiddenTabs, rememberLocation, setFormData, setRememberLocation, setShowAddModal, setShowEmojiPicker, showAddModal }) => (
<Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken." : "Toevoegen."} color="blue">
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div className="flex bg-stone-100/80 dark:bg-stone-800/80 p-1 rounded-lg mb-2 border border-stone-200/50 dark:border-stone-700/50">
                        <button type="button" onClick={() => handleModalTypeChange('vriezer')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${modalType === 'vriezer' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>
                            Vriezer.
                        </button>
                        {(!myHiddenTabs.includes('frig') || isAdmin) && (
                            <button type="button" onClick={() => handleModalTypeChange('frig')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${modalType === 'frig' ? 'bg-white dark:bg-stone-700 shadow-sm text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>
                                Frig.
                            </button>
                        )}
                        {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                            <button type="button" onClick={() => handleModalTypeChange('voorraad')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${modalType === 'voorraad' ? 'bg-white dark:bg-stone-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'}`}>
                                Stock.
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEmojiPicker(true)} className="w-11 h-11 flex-shrink-0 border border-stone-200 dark:border-stone-700 rounded-lg flex items-center justify-center text-2xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 hover:border-stone-300 dark:hover:bg-stone-700 transition-colors drop-shadow-sm active:scale-95">{formData.emoji || '🏷️'}</button>
                        
                        <div className="relative flex-grow">
                            <input 
                                type="text" 
                                placeholder="Naam van je product..." 
                                className="w-full h-11 px-3 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none bg-white/50 dark:bg-stone-800/50 dark:text-white dark:placeholder-stone-500 font-bold text-sm transition-all shadow-sm" 
                                value={formData.naam} 
                                onChange={e => {
                                    const ingetypt = e.target.value;
                                    const slimmeData = analyzeProductName(ingetypt); 
                                    
                                    setFormData(prevData => {
                                        let newData = { ...prevData, naam: ingetypt };
                                        if (slimmeData.cat) {
                                            newData.categorie = slimmeData.cat;
                                            newData.emoji = slimmeData.emoji;
                                            if (slimmeData.dagenHoudbaar && (modalType === 'frig' || modalType === 'voorraad')) {
                                                const d = new Date();
                                                d.setDate(d.getDate() + slimmeData.dagenHoudbaar);
                                                newData.houdbaarheidsDatum = d.toISOString().split('T')[0]; 
                                            }
                                        }
                                        return newData;
                                    });
                                }} 
                                required 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className={CX_LABEL}>Locatie.</label>
                        <select className={CX_INPUT} value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {modalLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                        <div className="space-y-1"><label className={CX_LABEL}>Lade.</label>
                        <select className={CX_INPUT} value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {formLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="space-y-1 flex-shrink-0 w-32 sm:w-36">
                          <label className={CX_LABEL}>Aantal.</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.25" 
                              min="0" 
                              max="5000"
                              className="w-full text-center h-11 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white rounded-lg pr-7 pl-7 font-bold text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm transition-all" 
                              value={formData.aantal} 
                              onChange={e => setFormData({...formData, aantal: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const current = parseFloat(formData.aantal) || 0;
                                const next = Math.min(current + 0.25, 5000);
                                setFormData({...formData, aantal: Math.round(next * 100) / 100});
                              }}
                              className="absolute right-1 top-1 w-6 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                            >
                              <Icon path={Icons.ChevronRight} size={12} className="rotate-[-90deg]" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                const current = parseFloat(formData.aantal) || 0;
                                const next = Math.max(current - 0.25, 0);
                                setFormData({...formData, aantal: Math.round(next * 100) / 100});
                              }}
                              className="absolute right-1 bottom-1 w-6 h-4 flex items-center justify-center text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                            >
                              <Icon path={Icons.ChevronRight} size={12} className="rotate-[90deg]" />
                            </button>
                          </div>
                      </div>
                      
                      <div className="space-y-1 flex-1 min-w-[100px]">
                          <label className={CX_LABEL}>Eenheid.</label>
                          <select 
                            value={formData.eenheid} 
                            onChange={e => setFormData({...formData, eenheid: e.target.value})}
                            className="w-full h-11 p-2.5 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium shadow-sm transition-all"
                          >
                            {alleEenheden.map((eenheid) => (
                              <option key={eenheid} value={eenheid}>
                                {eenheid}
                              </option>
                            ))}
                          </select>
                      </div>

                      <div className="space-y-1 flex-shrink-0 w-[45%] sm:w-24 mt-1 sm:mt-0">
                          <label className={CX_LABEL}>Min.</label>
                          <input 
                            type="number" 
                            placeholder="Minimaal"
                            min="0" 
                            className="w-full h-11 text-center border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium shadow-sm transition-all" 
                            value={formData.minimumVoorraad} 
                            onChange={e => setFormData({...formData, minimumVoorraad: e.target.value})}
                          />
                      </div>

                      <div className="space-y-1 flex-shrink-0 w-[45%] sm:w-28 mt-1 sm:mt-0">
                          <label className={CX_LABEL}>Prijs (€)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Optioneel"
                            min="0" 
                            className="w-full h-11 text-center border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium shadow-sm transition-all" 
                            value={formData.prijs} 
                            onChange={e => setFormData({...formData, prijs: e.target.value})}
                          />
                      </div>
                    <div className="space-y-1 flex-1 min-w-[100px]">
                        <label className={CX_LABEL}>Notitie (Optioneel).</label>
                        <input type="text" className="w-full p-2.5 text-sm font-medium bg-white dark:bg-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm transition-all" value={formData.notitie} onChange={e => setFormData({...formData, notitie: e.target.value})} placeholder="Bijv. Voor de BBQ..." />
                    </div>   
                    <div className="space-y-1.5 w-full pt-1">
                        <label className={CX_LABEL}>Labels (Tags).</label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                                const isSelected = formData.tags?.includes(tag);
                                return (
                                    <button
                                        type="button"
                                        key={tag}
                                        onClick={() => {
                                            const newTags = isSelected ? formData.tags.filter(t => t !== tag) : [...(formData.tags || []), tag];
                                            setFormData({...formData, tags: newTags});
                                        }}
                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-md border transition-all active:scale-95 ${isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-600 shadow-sm' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 hover:border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700 dark:hover:bg-stone-700'}`}
                                    >
                                        {isSelected && <Icon path={Icons.Check} size={12} className="inline mr-1 -mt-0.5"/>}
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                    </div>                                   
                    </div>

                    <div className="pt-1 mb-1">
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, altijdGoed: !formData.altijdGoed})}
                            className={`w-full p-2.5 rounded-lg flex items-center justify-between font-bold text-sm border transition-all active:scale-[0.98] ${
                                formData.altijdGoed 
                                ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400 shadow-sm' 
                                : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 hover:border-stone-300'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <Icon path={Icons.Check} size={16} />
                                Permanent goed (negeer datums)
                            </span>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors border shadow-inner flex items-center ${formData.altijdGoed ? 'bg-green-500 border-green-600' : 'bg-stone-300 border-stone-400 dark:bg-stone-600 dark:border-stone-700'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData.altijdGoed ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                        </button>
                    </div>

                    {modalType === 'vriezer' && !formData.altijdGoed && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1"><label className={CX_LABEL}>Invriesdatum.</label>
                            <input type="date" className={CX_INPUT} value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required /></div>
                            <div className="space-y-1"><label className={CX_LABEL}>THT (Optioneel)</label>
                            <input type="date" className={CX_INPUT} value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                        </div>
                    )}
                    {(modalType === 'voorraad' || modalType === 'frig') && !formData.altijdGoed && (
                        <div className="space-y-1"><label className={CX_LABEL}>Houdbaarheidsdatum (THT).</label>
                        <input type="date" className={CX_INPUT} value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                    )}

                    <div className="space-y-1"><label className={CX_LABEL}>Categorie.</label>
                    <select className={CX_INPUT} value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})}>
                        {actieveCategorieen.map(c => <option key={c.name||c} value={c.name||c}>{c.name||c}</option>)}
                    </select></div>

                    {!myHiddenTabs.includes('weekmenu') && (
                        <div className="space-y-1 p-3 bg-pink-50/50 dark:bg-pink-900/20 border border-pink-200/60 dark:border-pink-800/40 rounded-lg mt-2 animate-in fade-in duration-200 shadow-sm">
                            <label className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Icon path={Icons.Calendar} size={14} /> Inplannen in Week. (Optioneel)
                            </label>
                            <select 
                                className="w-full p-2.5 bg-white dark:bg-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 rounded-md text-sm font-medium focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none shadow-sm transition-all"
                                value={formData.geplandeDatum || ''} 
                                onChange={e => setFormData({...formData, geplandeDatum: e.target.value || ''})}
                            >
                                <option value="">-- Niet inplannen op een specifieke dag --</option>
                                <optgroup label="Deze week">
                                    {(() => {
                                        const monday = new Date();
                                        const day = monday.getDay() || 7;
                                        monday.setHours(0,0,0,0);
                                        monday.setDate(monday.getDate() - day + 1);
                                        return Array.from({length: 7}).map((_, i) => {
                                            const d = new Date(monday);
                                            d.setDate(monday.getDate() + i);
                                            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            const label = d.toLocaleDateString('nl-BE', { weekday: 'long', day: '2-digit', month: '2-digit' });
                                            return <option key={ds} value={ds}>{label}</option>;
                                        });
                                    })()}
                                </optgroup>
                                <optgroup label="Volgende week">
                                    {(() => {
                                        const nextMonday = new Date();
                                        const day = nextMonday.getDay() || 7;
                                        nextMonday.setHours(0,0,0,0);
                                        nextMonday.setDate(nextMonday.getDate() - day + 1 + 7);
                                        return Array.from({length: 7}).map((_, i) => {
                                            const d = new Date(nextMonday);
                                            d.setDate(nextMonday.getDate() + i);
                                            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            const label = d.toLocaleDateString('nl-BE', { weekday: 'long', day: '2-digit', month: '2-digit' });
                                            return <option key={ds} value={ds}>{label}</option>;
                                        });
                                    })()}
                                </optgroup>
                            </select>
                        </div>
                    )}

                    {!editingItem && (
                        <div className="space-y-1 p-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-lg mt-2 animate-in fade-in duration-200 shadow-sm">
                            <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Icon path={Icons.Copy} size={14} /> Opsplitsen in losse items (Optioneel)
                            </label>
                            <div className="flex items-center gap-3 mt-1.5">
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="50"
                                    className="w-16 p-2 text-center bg-white dark:bg-stone-800 dark:text-white border border-indigo-200 dark:border-indigo-700 rounded-md text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm transition-all"
                                    value={formData.bulkAanmaak || 1} 
                                    onChange={e => setFormData({...formData, bulkAanmaak: e.target.value})}
                                />
                                <span className="text-[10px] font-medium text-indigo-800 dark:text-indigo-300 leading-tight">
                                    Hoe vaak wil je dit product als<br/> een APARTE regel opslaan?
                                </span>
                            </div>
                        </div>
                    )}                                                                                    
                    
                    {!editingItem && (
                        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg border border-stone-200/50 dark:border-stone-700/50 mt-2">
                            <input type="checkbox" id="rememberLocation" checked={rememberLocation} onChange={e => setRememberLocation(e.target.checked)} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-stone-300 dark:border-stone-600 shadow-sm transition-all" />
                            <label htmlFor="rememberLocation" className="text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">Onthoud locatie en lade voor volgende</label>
                        </div>
                    )}

                    <button type="submit" className="w-full py-3 mt-2 bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all">Opslaan</button>
                </form>
            </Modal>
);

// Deel-modal: nodig iemand uit via e-mail, zie status van eerdere uitnodigingen, trek toegang in.
const ShareModal = ({ showShareModal, setShowShareModal, shareEmail, setShareEmail, handleShare, myOutgoingShares, revokeShare, setShowPublicLinkModal }) => (
    <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Delen." color="blue">
        <form onSubmit={handleShare} className="space-y-2">
            <label className={CX_LABEL}>Nodig iemand uit via e-mail</label>
            <div className="flex gap-2">
                <input type="email" required value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="naam@voorbeeld.be" className={CX_INPUT} />
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold whitespace-nowrap transition-all active:scale-95 shadow-sm">Uitnodigen</button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">De uitgenodigde persoon moet inloggen met exact dit e-mailadres en de uitnodiging accepteren voordat die jouw voorraad kan zien en beheren.</p>
        </form>

        {myOutgoingShares.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-700">
                <label className={CX_LABEL}>Gedeeld met</label>
                {myOutgoingShares.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{s.sharedWithEmail}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${s.status === 'accepted' ? 'text-green-600 dark:text-green-400' : s.status === 'declined' ? 'text-red-500' : 'text-orange-500'}`}>
                                {s.status === 'accepted' ? 'Geaccepteerd' : s.status === 'declined' ? 'Geweigerd' : 'Wacht op reactie...'}
                            </p>
                        </div>
                        <button onClick={() => revokeShare(s.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95 flex-shrink-0" title="Toegang intrekken">
                            <Icon path={Icons.Trash} size={16}/>
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="pt-2 border-t border-stone-100 dark:border-stone-700">
            <button onClick={() => { setShowShareModal(false); setShowPublicLinkModal(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold transition-all active:scale-95">
                <Icon path={Icons.Link} size={16}/> Bekijk-link zonder account
            </button>
        </div>
    </Modal>
);

// Modal om een publieke, alleen-lezen deel-link te genereren zonder dat de ontvanger
// een account nodig heeft. Vereist een passende Firestore Security Rule (zie PublicShareView).
// Combineert export (Excel/PDF) en back-up (maken/herstellen) in één modal,
// zodat het profielmenu niet overladen wordt met losse links.
const ExportBackupModal = ({ showExportBackupModal, setShowExportBackupModal, exportToCSV, exportToPDF, exportBackup, backupFileInputRef }) => (
    <Modal isOpen={showExportBackupModal} onClose={() => setShowExportBackupModal(false)} title="Export & Back-up." color="blue">
        <div className="space-y-2">
            <p className={CX_LABEL}>Exporteren</p>
            <button onClick={exportToCSV} className="w-full flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-100 dark:border-stone-700 transition-all active:scale-[0.98] text-left">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0"><Icon path={Icons.Download} size={16}/></div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Exporteer naar Excel</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">CSV-bestand, te openen in Excel/Sheets.</p>
                </div>
            </button>
            <button onClick={exportToPDF} className="w-full flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-100 dark:border-stone-700 transition-all active:scale-[0.98] text-left">
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0"><Icon path={Icons.Download} size={16}/></div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Exporteer naar PDF</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Netjes overzicht, klaar om te printen/delen.</p>
                </div>
            </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-700">
            <p className={CX_LABEL}>Back-up</p>
            <button onClick={exportBackup} className="w-full flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-100 dark:border-stone-700 transition-all active:scale-[0.98] text-left">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><Icon path={Icons.Download} size={16}/></div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Maak back-up</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Alles als JSON-bestand, om later terug te zetten.</p>
                </div>
            </button>
            <button onClick={() => { setShowExportBackupModal(false); backupFileInputRef.current && backupFileInputRef.current.click(); }} className="w-full flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-100 dark:border-stone-700 transition-all active:scale-[0.98] text-left">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0"><Icon path={Icons.Upload} size={16}/></div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Herstel back-up</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Voegt toe aan je huidige voorraad, overschrijft niets.</p>
                </div>
            </button>
        </div>
    </Modal>
);

const PublicLinkModal = ({ showPublicLinkModal, setShowPublicLinkModal, myPublicShareEnabled, togglePublicShare, publicShareToken, regeneratePublicLink }) => {
    const link = publicShareToken ? `${window.location.origin}${window.location.pathname}?deel=${publicShareToken}` : '';
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { /* klembord niet beschikbaar, gebruiker kan handmatig selecteren */ }
    };

    return (
        <Modal isOpen={showPublicLinkModal} onClose={() => setShowPublicLinkModal(false)} title="Bekijk-link." color="indigo">
            <p className="text-sm text-stone-600 dark:text-stone-300">Iedereen met deze link kan je voorraad bekijken (alleen-lezen), zonder in te loggen. Handig om snel even te delen met bv. familie.</p>

            <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                <span className="text-sm font-bold text-stone-800 dark:text-stone-100">Link actief</span>
                <button onClick={togglePublicShare} className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${myPublicShareEnabled ? 'bg-teal-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${myPublicShareEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></span>
                </button>
            </div>

            {myPublicShareEnabled && publicShareToken && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input readOnly value={link} onClick={e => e.target.select()} className={CX_INPUT + ' text-xs'} />
                        <button onClick={copyLink} className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-all active:scale-95">
                            {copied ? 'Gekopieerd!' : 'Kopieer'}
                        </button>
                    </div>
                    <button onClick={regeneratePublicLink} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors">Nieuwe link genereren (oude stopt met werken)</button>
                </div>
            )}
        </Modal>
    );
};

// --- 6. APP ---
function App() {
    // ===== STATE =====
    const [user, setUser] = useState(null);
    const [beheerdeUserId, setBeheerdeUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [usersList, setUsersList] = useState([]);
    
    const [dashboardUser, setDashboardUser] = useState('');
    const [dashboardData, setDashboardData] = useState({ vriezers: [], lades: [], items: [], loading: false });
    const [openDashboardLades, setOpenDashboardLades] = useState(new Set());

    const [managedUserHiddenTabs, setManagedUserHiddenTabs] = useState([]);
    const [myHiddenTabs, setMyHiddenTabs] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const language = 'nl';
    const t = (key) => TRANSLATIONS.nl[key] || key;
    const [myShowHelpButton, setMyShowHelpButton] = useState(false);
    const [myShowBalans, setMyShowBalans] = useState(false);
    const [myNotificationsEnabled, setMyNotificationsEnabled] = useState(true);
    const [myTourDisabled, setMyTourDisabled] = useState(false);
    const [myHasSeenTutorial, setMyHasSeenTutorial] = useState(true);
    const [savedOpenLades, setSavedOpenLades] = useState(null);
    const [stats, setStats] = useState({ wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0 });
    
    const [tourSteps, setTourSteps] = useState(DEFAULT_TOUR_STEPS);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [globalOnboardingActive, setGlobalOnboardingActive] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);    
    
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const isDragging = useRef(false);

    const [showTourAdminModal, setShowTourAdminModal] = useState(false);
    const [editingTourSteps, setEditingTourSteps] = useState([]);

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const [activeTab, setActiveTab] = useState('vriezer');
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    const [logs, setLogs] = useState([]); 
    const [shoppingList, setShoppingList] = useState([]);
    
    const [customUnitsVries, setCustomUnitsVries] = useState([]);
    const [customUnitsFrig, setCustomUnitsFrig] = useState([]);
    const [customUnitsVoorraad, setCustomUnitsVoorraad] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);

    const [recepten, setRecepten] = useState([]);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showRecipeViewModal, setShowRecipeViewModal] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [viewRecipePersons, setViewRecipePersons] = useState(4);
    const [recipeFormData, setRecipeFormData] = useState({
    naam: '', fotoUrl: '', personen: 4, categorie: 'Hoofdgerecht',
    ingredienten: [], stappen: []
    });

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [showRapidEntry, setShowRapidEntry] = useState(false);
    const [rapidEntryText, setRapidEntryText] = useState('');
    const [viewMode, setViewMode] = useState('list'); 
    const [draggedMenuItem, setDraggedMenuItem] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [menuSearch, setMenuSearch] = useState('');  
    const [customMenuInput, setCustomMenuInput] = useState({ date: '', text: '' });
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
    const [collapsedLades, setCollapsedLades] = useState(new Set()); 
    const [editingItem, setEditingItem] = useState(null);
    const [notification, setNotification] = useState(null);
    const [auditLade, setAuditLade] = useState(null);
    const [auditedItems, setAuditedItems] = useState(new Set()); 
    const [auditItemsToDelete, setAuditItemsToDelete] = useState(new Set());
// Het "geheugen" voor de Balans functie
    const auditOriginals = useRef({});
    const previousAuditLade = useRef(null);

    // Grijp de originele waardes EXACT op het moment dat het scherm opent (niet pas na het inladen)
    if (auditLade && auditLade.id !== previousAuditLade.current) {
        const originals = {};
        items.filter(i => i.ladeId === auditLade.id).forEach(i => {
            originals[i.id] = { 
                aantal: parseFloat(i.aantal), 
                eenheid: i.eenheid,
                naam: i.naam,
                categorie: i.categorie,
                emoji: i.emoji,
                notitie: i.notitie || ''
            };
        });
        auditOriginals.current = originals;
        previousAuditLade.current = auditLade.id;
    } else if (!auditLade && previousAuditLade.current) {
        // Maak het geheugen weer leeg als het scherm sluit
        auditOriginals.current = {};
        previousAuditLade.current = null;
    }
    
    const [draggedLocId, setDraggedLocId] = useState(null); 

// -- NIEUWE STATE VOOR DND CATEGORIEËN EN EENHEDEN --
    const [draggedCatName, setDraggedCatName] = useState(null);
    const [draggedUnitName, setDraggedUnitName] = useState(null);

    const handleDragStartCat = (e, name) => {
        setDraggedCatName(name);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropCat = async (e, targetName) => {
        e.preventDefault();
        if (!draggedCatName || draggedCatName === targetName) {
            setDraggedCatName(null);
            return;
        }

        const list = [...actieveCategorieen];
        const draggedIdx = list.findIndex(c => (c.name || c) === draggedCatName);
        const targetIdx = list.findIndex(c => (c.name || c) === targetName);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const [draggedItem] = list.splice(draggedIdx, 1);
        list.splice(targetIdx, 0, draggedItem);

        setDraggedCatName(null);
        
        // Sla op als correct object-formaat in Firestore
        const formattedList = list.map(c => typeof c === 'string' ? { name: c, color: 'gray' } : c);
        await db.collection('users').doc(beheerdeUserId).set({ customCategories: formattedList }, { merge: true });
    };

    const handleDragStartUnit = (e, name) => {
        setDraggedUnitName(name);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropUnit = async (e, targetName) => {
        e.preventDefault();
        if (!draggedUnitName || draggedUnitName === targetName) {
            setDraggedUnitName(null);
            return;
        }

        let standardList = EENHEDEN_VRIES;
        let currentCustom = customUnitsVries;
        let dbField = 'customUnitsVries';

        if (eenheidFilter === 'voorraad') {
            standardList = EENHEDEN_VOORRAAD;
            currentCustom = customUnitsVoorraad;
            dbField = 'customUnitsVoorraad';
        } else if (eenheidFilter === 'frig') {
            standardList = EENHEDEN_FRIG;
            currentCustom = customUnitsFrig;
            dbField = 'customUnitsFrig';
        }

        const alleEenhedenList = currentCustom.length > 0 
            ? [...new Set([...currentCustom, ...standardList])]
            : [...standardList];

        const draggedIdx = alleEenhedenList.indexOf(draggedUnitName);
        const targetIdx = alleEenhedenList.indexOf(targetName);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const [draggedItem] = alleEenhedenList.splice(draggedIdx, 1);
        alleEenhedenList.splice(targetIdx, 0, draggedItem);

        setDraggedUnitName(null);
        await db.collection('users').doc(beheerdeUserId).set({ [dbField]: alleEenhedenList }, { merge: true });
    };
    
    // TAPPED ITEM STATE VOOR SMARTPHONE ANIMATIE
    const [tappedItemId, setTappedItemId] = useState(null);

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedBulkItems, setSelectedBulkItems] = useState(new Set());
    const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
    const [bulkMoveTarget, setBulkMoveTarget] = useState({ vriezerId: '', ladeId: '' });

    const [showAddModal, setShowAddModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showDashboardModal, setShowDashboardModal] = useState(false);
    const [showBeheerModal, setShowBeheerModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false); 
    const [showSwitchMenu, setShowSwitchMenu] = useState(false);
    const [navCompact, setNavCompact] = useState(false);
    const lastScrollY = useRef(0);
    const backupFileInputRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            if (currentY > lastScrollY.current && currentY > 60) {
                setNavCompact(true);
            } else {
                setNavCompact(false);
            }
            lastScrollY.current = currentY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    const [showUserAdminModal, setShowUserAdminModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
    const [showLogModal, setShowLogModal] = useState(false); 
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showShoppingModal, setShowShoppingModal] = useState(false); 
    const [beheerTab, setBeheerTab] = useState('locaties');

    const [showShopifyModal, setShowShopifyModal] = useState(false);
    const [itemToShopify, setItemToShopify] = useState(null);
    const [shopForDeletedItem, setShopForDeletedItem] = useState('');
    const [aantalForShopifyItem, setAantalForShopifyItem] = useState(1);
    
    const [showConsumeModal, setShowConsumeModal] = useState(false);
    const [itemToConsume, setItemToConsume] = useState(null);
    const [consumeAmount, setConsumeAmount] = useState(1);

    const [formData, setFormData] = useState({
        naam: '', 
        aantal: 1, 
        eenheid: 'stuks', 
        vriezerId: '', 
        ladeId: '', 
        categorie: 'Vlees', 
        minimumVoorraad: '',
        prijs: '',
        ingevrorenOp: new Date().toISOString().split('T')[0], 
        houdbaarheidsDatum: '', 
        notitie: '',
        emoji: '',
        geplandeDatum: '',
        bulkAanmaak: 1,
        tags: []
    });
    
    const [shoppingFormData, setShoppingFormData] = useState({ 
        naam: '', 
        aantal: 1, 
        eenheid: 'stuks',
        winkel: '' 
    });
    
    const [rememberLocation, setRememberLocation] = useState(false); 
    const [newLocatieNaam, setNewLocatieNaam] = useState('');
    const [activeLocatieGroep, setActiveLocatieGroep] = useState('Thuis');
    const [showAddLocatieGroep, setShowAddLocatieGroep] = useState(false);
    const [newLocatieGroepNaam, setNewLocatieGroepNaam] = useState('');
    const [newLocatieColor, setNewLocatieColor] = useState('blue'); 
    const [selectedLocatieForBeheer, setSelectedLocatieForBeheer] = useState(null);
    const [newLadeNaam, setNewLadeNaam] = useState('');
    const [newUnitNaam, setNewUnitNaam] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [pendingInvites, setPendingInvites] = useState([]);
    const [mySharedAccounts, setMySharedAccounts] = useState([]);
    const [myOutgoingShares, setMyOutgoingShares] = useState([]);
    const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
    const [showExportBackupModal, setShowExportBackupModal] = useState(false);
    const [publicShareToken, setPublicShareToken] = useState(null);
    const [myPublicShareEnabled, setMyPublicShareEnabled] = useState(false);
    
    const [eenheidFilter, setEenheidFilter] = useState('vries'); 
    const [modalType, setModalType] = useState('vriezer');

    const [editingLadeId, setEditingLadeId] = useState(null);
    const [editingLadeName, setEditingLadeName] = useState('');
    const [editingUnitName, setEditingUnitName] = useState(null);
    const [editUnitInput, setEditUnitInput] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('gray');
    const [editingCatName, setEditingCatName] = useState(null);
    const [editCatInputName, setEditCatInputName] = useState('');
    const [editCatInputColor, setEditCatInputColor] = useState('gray');
    

    // ===== REFS & EFFECTEN =====
    const hasCheckedAlerts = useRef(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const toggleDarkMode = async () => {
        if (!user) return;
        const newStatus = !darkMode;
        setDarkMode(newStatus);
        
        try {
            await db.collection('users').doc(user.uid).set({
                darkMode: newStatus
            }, { merge: true });
        } catch (e) {
            console.error("Kon dark mode niet opslaan", e);
        }
    };

    const toggleBalansMode = async () => {
        if (!user) return;
        const newStatus = !myShowBalans;
        setMyShowBalans(newStatus);
        setShowProfileMenu(false); // sluit menuutje na klikken
        
        try {
            await db.collection('users').doc(user.uid).set({
                showBalans: newStatus
            }, { merge: true });
        } catch (e) {
            console.error("Kon balans instelling niet opslaan", e);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                setBeheerdeUserId(u.uid);
                
                try {
                    await db.collection('users').doc(u.uid).set({
                        laatstGezien: firebase.firestore.FieldValue.serverTimestamp(),
                        email: u.email
                    }, { merge: true });
                } catch(e) { console.error("Kon laatstGezien niet updaten", e); }

                db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) {
                        const data = doc.data();
                        if (data.darkMode !== undefined) {
                            setDarkMode(data.darkMode);
                        }
                        setMyHiddenTabs(data.hiddenTabs || []);
                        setMyShowHelpButton(data.showHelpButton === true);
                        setMyShowBalans(data.showBalans === true);
                        setMyNotificationsEnabled(data.notificationsEnabled !== false);
                        setPublicShareToken(data.publicShareToken || null);
                        setMyPublicShareEnabled(data.publicShareEnabled === true);
                        setMyTourDisabled(data.tourDisabled === true);
                        setMyHasSeenTutorial(data.hasSeenTutorial === true);

                        if (data.openLades && Array.isArray(data.openLades)) {
                            setSavedOpenLades(data.openLades);
                        } else {
                            setSavedOpenLades([]);
                        }
                        if (data.stats) {
                            setStats({
                                wasted: data.stats.wasted || 0,
                                consumed: data.stats.consumed || 0,
                                wastedValue: data.stats.wastedValue || 0,
                                consumedValue: data.stats.consumedValue || 0
                            });
                        }
                    } else {
                        db.collection('users').doc(u.uid).set({
                            customCategories: CATEGORIEEN_VRIES,
                            customUnitsVries: [],
                            customUnitsFrig: [],
                            customUnitsVoorraad: [],
                            hiddenTabs: [],
                            darkMode: false,
                            showHelpButton: false,
                            showBalans: false,
                            notificationsEnabled: true,
                            tourDisabled: false,
                            hasSeenTutorial: false,
                            openLades: [],
                            stats: { wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0 }
                        });
                        setSavedOpenLades([]);
                        setMyHiddenTabs([]);
                        setMyShowHelpButton(false);
                        setMyShowBalans(false);
                        setMyNotificationsEnabled(true);
                        setMyTourDisabled(false);
                        setMyHasSeenTutorial(false);
                    }
                });

                const adminDoc = await db.collection('admins').doc(u.uid).get();
                setIsAdmin(adminDoc.exists);

                const vCheck = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
                if (vCheck.empty && !adminDoc.exists) {
                    const shares = await db.collection('shares').where("sharedWithEmail", "==", u.email).where("status", "==", "accepted").limit(1).get();
                    if (!shares.empty) setBeheerdeUserId(shares.docs[0].data().ownerId);
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Luistert naar deel-uitnodigingen die AAN mij (mijn e-mailadres) gericht zijn.
    // Splitst ze in 'pending' (moet ik nog accepteren/weigeren) en 'accepted' (ik kan
    // al wisselen naar dat account via de accountwissel-knop in de header/pil).
    useEffect(() => {
        if (!user || !user.email) { setPendingInvites([]); setMySharedAccounts([]); return; }
        const unsub = db.collection('shares').where('sharedWithEmail', '==', user.email).onSnapshot(snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPendingInvites(all.filter(s => s.status === 'pending'));
            setMySharedAccounts(all.filter(s => s.status === 'accepted'));
        }, (err) => console.warn('Kon uitnodigingen niet laden:', err));
        return () => unsub();
    }, [user]);

    // Luistert naar uitnodigingen die IK heb verstuurd, zodat ik in het deel-menu kan
    // zien of iemand mijn uitnodiging al geaccepteerd heeft.
    useEffect(() => {
        if (!user || !user.uid) { setMyOutgoingShares([]); return; }
        const unsub = db.collection('shares').where('ownerId', '==', user.uid).onSnapshot(snap => {
            setMyOutgoingShares(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn('Kon verzonden uitnodigingen niet laden:', err));
        return () => unsub();
    }, [user]);

    const acceptShareInvite = async (invite) => {
        try {
            await db.collection('shares').doc(invite.id).update({ status: 'accepted', acceptedAt: new Date().toISOString() });
            setBeheerdeUserId(invite.ownerId);
            showNotification(`Uitnodiging van ${invite.ownerEmail} geaccepteerd!`, 'success');
        } catch (e) {
            showNotification('Kon de uitnodiging niet accepteren.', 'error');
        }
    };

    const declineShareInvite = async (invite) => {
        try {
            await db.collection('shares').doc(invite.id).update({ status: 'declined' });
        } catch (e) {
            showNotification('Kon de uitnodiging niet weigeren.', 'error');
        }
    };

    const revokeShare = async (shareId) => {
        try {
            await db.collection('shares').doc(shareId).delete();
            showNotification('Toegang ingetrokken.', 'success');
        } catch (e) {
            showNotification('Kon de toegang niet intrekken.', 'error');
        }
    };

    const togglePublicShare = async () => {
        try {
            let token = publicShareToken;
            if (!token) {
                token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
                setPublicShareToken(token);
            }
            const newEnabled = !myPublicShareEnabled;
            await db.collection('users').doc(user.uid).set({ publicShareToken: token, publicShareEnabled: newEnabled }, { merge: true });
            setMyPublicShareEnabled(newEnabled);
        } catch (e) {
            showNotification('Kon de deel-link niet bijwerken.', 'error');
        }
    };

    const regeneratePublicLink = async () => {
        try {
            const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
            setPublicShareToken(token);
            await db.collection('users').doc(user.uid).set({ publicShareToken: token }, { merge: true });
            showNotification('Nieuwe link gegenereerd. De oude link werkt niet meer.', 'success');
        } catch (e) {
            showNotification('Kon geen nieuwe link genereren.', 'error');
        }
    };

    useEffect(() => {
        const unsub = db.collection('settings').doc('onboarding').onSnapshot(doc => {
            if (doc.exists) setGlobalOnboardingActive(doc.data().isActive !== false);
        });
        
        const unsubSteps = db.collection('settings').doc('tourSteps').onSnapshot(doc => {
            if (doc.exists && doc.data().steps) setTourSteps(doc.data().steps);
        });

        const unsubMaintenance = db.collection('settings').doc('maintenance').onSnapshot(doc => {
            if (doc.exists) setMaintenanceMode(doc.data().active === true);
        });
        
        return () => { unsub(); unsubSteps(); unsubMaintenance(); };
    }, []);

    useEffect(() => {
        if (user) {
            if (myTourDisabled) {
                setShowOnboarding(false); 
            } else if (globalOnboardingActive && !myHasSeenTutorial) {
                setShowOnboarding(true);
            }
        }
    }, [user, globalOnboardingActive, myTourDisabled, myHasSeenTutorial]);


    useEffect(() => {
        if(!beheerdeUserId) return;
        const unsub = db.collection('users').doc(beheerdeUserId).onSnapshot(doc => {
            if(doc.exists) {
                const data = doc.data();
                
                let vriesUnits = data.customUnitsVries;
                if (!vriesUnits && data.customUnits) {
                    vriesUnits = data.customUnits;
                }
                setCustomUnitsVries(vriesUnits || []);
                setCustomUnitsFrig(data.customUnitsFrig || []);
                setCustomUnitsVoorraad(data.customUnitsVoorraad || []);
                setManagedUserHiddenTabs(data.hiddenTabs || []); 

                setCustomCategories(data.customCategories && data.customCategories.length > 0 ? data.customCategories : CATEGORIEEN_VRIES);
                if (data.stats) {
                    setStats({
                        wasted: data.stats.wasted || 0,
                        consumed: data.stats.consumed || 0,
                        wastedValue: data.stats.wastedValue || 0,
                        consumedValue: data.stats.consumedValue || 0
                    });
                }
            }
        });
        return () => unsub();
    }, [beheerdeUserId]);

    useEffect(() => {
        if (!beheerdeUserId) return;
        
        const unsubV = db.collection('vriezers').where('userId', '==', beheerdeUserId).onSnapshot(s => setVriezers(s.docs.map(d => ({id: d.id, ...d.data(), type: d.data().type||'vriezer'}))));
        
        const unsubL = db.collection('lades').where('userId', '==', beheerdeUserId).onSnapshot(s => {
            const loadedLades = s.docs.map(d => ({id: d.id, ...d.data()}));
            setLades(loadedLades);
            
            if (!isDataLoaded && savedOpenLades !== null) {
                if (loadedLades.length > 0) {
                    const initialCollapsed = new Set(loadedLades.map(l => l.id));
                    if (savedOpenLades && savedOpenLades.length > 0) {
                        savedOpenLades.forEach(id => {
                            if (initialCollapsed.has(id)) {
                                initialCollapsed.delete(id);
                            }
                        });
                    }
                    setCollapsedLades(initialCollapsed);
                }
                setIsDataLoaded(true);
            }
        });
        
        const unsubI = db.collection('items').where('userId', '==', beheerdeUserId).onSnapshot(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubS = db.collection('shoppingList').where('userId', '==', beheerdeUserId).onSnapshot(s => setShoppingList(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubR = db.collection('recepten').where('userId', '==', beheerdeUserId).onSnapshot(s => setRecepten(s.docs.map(d => ({id: d.id, ...d.data()}))));

        return () => { unsubV(); unsubL(); unsubI(); unsubS(); unsubR(); };
    }, [beheerdeUserId, isDataLoaded, savedOpenLades]); 

    useEffect(() => {
        if (isAdmin) {
            const unsubUsers = db.collection('users').orderBy('email').onSnapshot(snap => {
                setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsubUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!user || !showLogModal) return;

        let query;
        if (isAdmin) {
            query = db.collection('logs').orderBy('timestamp', 'desc').limit(100);
        } else {
            query = db.collection('logs').where('targetUserId', '==', beheerdeUserId).orderBy('timestamp', 'desc').limit(50);
        }

        const unsubLogs = query.onSnapshot(snap => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubLogs();
    }, [user, showLogModal, beheerdeUserId, isAdmin]); 

    useEffect(() => {
        if (!dashboardUser) {
            setDashboardData({ vriezers: [], lades: [], items: [], loading: false });
            setOpenDashboardLades(new Set()); 
            return;
        }

        let isMounted = true;
        const fetchDashboard = async () => {
            setDashboardData(prev => ({ ...prev, loading: true }));
            setOpenDashboardLades(new Set()); 
            try {
                const [vSnap, lSnap, iSnap] = await Promise.all([
                    db.collection('vriezers').where('userId', '==', dashboardUser).get(),
                    db.collection('lades').where('userId', '==', dashboardUser).get(),
                    db.collection('items').where('userId', '==', dashboardUser).get()
                ]);

                if (isMounted) {
                    setDashboardData({
                        vriezers: vSnap.docs.map(d => ({id: d.id, ...d.data()})),
                        lades: lSnap.docs.map(d => ({id: d.id, ...d.data()})),
                        items: iSnap.docs.map(d => ({id: d.id, ...d.data()})),
                        loading: false
                    });
                }
            } catch (e) {
                console.error("Fout bij laden dashboard", e);
                if (isMounted) setDashboardData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchDashboard();
        return () => { isMounted = false; };
    }, [dashboardUser]);

    const locatieGroepen = Array.from(new Set(['Thuis', ...vriezers.map(l => l.locatieGroep || 'Thuis')]));

    const filteredLocaties = sortLocaties(vriezers.filter(l => {
        if (l.type !== activeTab) return false;
        if ((l.locatieGroep || 'Thuis') !== activeLocatieGroep) return false;
        
        // Verberg de locatie 'Ongesorteerd' als er geen producten in zitten
        if (l.naam.toLowerCase() === 'ongesorteerd') {
            const heeftItems = items.some(i => i.vriezerId === l.id);
            return heeftItems;
        }
        return true;
    }));
    
    const activeItems = items.filter(i => filteredLocaties.some(l => l.id === i.vriezerId));
    const modalLocaties = sortLocaties(vriezers.filter(l => l.type === modalType && (l.locatieGroep || 'Thuis') === activeLocatieGroep));

    const formLades = formData.vriezerId 
        ? lades.filter(l => l.vriezerId === formData.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam))
        : [];
    
    const formLocationType = modalType;

    let contextEenheden = EENHEDEN_VRIES;
    let contextCategorieen = CATEGORIEEN_VRIES;
    let activeCustomUnits = customUnitsVries;

    if (formLocationType === 'voorraad') {
        contextEenheden = EENHEDEN_VOORRAAD;
        contextCategorieen = CATEGORIEEN_VOORRAAD;
        activeCustomUnits = customUnitsVoorraad;
    } else if (formLocationType === 'frig') {
        contextEenheden = EENHEDEN_FRIG;
        contextCategorieen = CATEGORIEEN_FRIG;
        activeCustomUnits = customUnitsFrig;
    }
    
const alleEenheden = activeCustomUnits.length > 0 
        ? [...new Set([...activeCustomUnits, ...contextEenheden])] 
        : contextEenheden;

    const actieveCategorieen = customCategories.length > 0
        ? [...customCategories, ...contextCategorieen.filter(cc => !customCategories.some(c => c.name === cc.name))]
        : contextCategorieen;

    let tabCategorieen = CATEGORIEEN_VRIES;
    if (activeTab === 'voorraad') tabCategorieen = CATEGORIEEN_VOORRAAD;
    else if (activeTab === 'frig') tabCategorieen = CATEGORIEEN_FRIG;

    const mainViewCategories = [
        ...tabCategorieen, 
        ...customCategories.filter(cc => !tabCategorieen.some(c => c.name === cc.name))
    ];

    const gridClass = (() => {
        const count = filteredLocaties.length;
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    })();

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type, id: Date.now() });
    };

    const alerts = items.filter(i => {
        if (i.altijdGoed) return false;
        const loc = vriezers.find(v => v.id === i.vriezerId);
        const type = loc ? (loc.type || 'vriezer') : 'vriezer';

        if (type === 'voorraad' || type === 'frig') {
             return getDagenTotTHT(i.houdbaarheidsDatum) < 0; 
        } else {
             return getDagenOud(i.ingevrorenOp) > 180;
        }
    });

    useEffect(() => {
        if (isDataLoaded && !hasCheckedAlerts.current) {
            const lastVersion = localStorage.getItem('app_version');
            if (lastVersion !== APP_VERSION || alerts.length > 0) {
                setShowWhatsNew(true);
                if (lastVersion !== APP_VERSION) localStorage.setItem('app_version', APP_VERSION);
            }
            hasCheckedAlerts.current = true; 
        }
    }, [isDataLoaded, alerts.length]); 

    // Meldingen: toont een browsermelding voor bijna-vervallen/verlopen producten.
    // Werkt zolang de app open (of recent actief) is; volledige achtergrond-push
    // (ook wanneer de app helemaal gesloten is) vereist een Firebase Cloud
    // Messaging-server, wat buiten deze twee bestanden valt.
    useEffect(() => {
        if (!isDataLoaded || alerts.length === 0) return;
        if (!myNotificationsEnabled) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

        const todayKey = new Date().toISOString().split('T')[0];
        const notifiedKey = `notified_${todayKey}_${alerts.length}`;
        if (localStorage.getItem(notifiedKey)) return;

        const title = alerts.length === 1
            ? '1 product heeft aandacht nodig'
            : `${alerts.length} producten hebben aandacht nodig`;
        const body = alerts.slice(0, 5).map(i => i.naam).join(', ') + (alerts.length > 5 ? ', ...' : '');

        const showIt = (registration) => {
            const options = {
                body,
                icon: './icon_192x192.png',
                badge: './icon_192x192.png',
                tag: 'voorraad-alerts'
            };
            if (registration && registration.showNotification) {
                registration.showNotification(title, options);
            } else {
                new Notification(title, options);
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(showIt).catch(() => showIt(null));
        } else {
            showIt(null);
        }
        localStorage.setItem(notifiedKey, '1');
    }, [isDataLoaded, alerts, myNotificationsEnabled]);

    const requestNotificationPermission = async () => {
        if (typeof Notification === 'undefined') {
            showNotification('Meldingen worden niet ondersteund door deze browser.', 'error');
            return;
        }
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result === 'granted') {
            showNotification('Meldingen zijn ingeschakeld!', 'success');
        } else if (result === 'denied') {
            showNotification('Meldingen zijn geblokkeerd. Wijzig dit in je browserinstellingen.', 'error');
        }
    };

    // ===== HANDLERS & BUSINESSLOGICA =====
    const handleGoogleLogin = async () => { 
        try { 
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider); 
        } catch(e) { alert("Login Fout: " + e.message); } 
    };

    const handleLogout = () => { auth.signOut(); setShowProfileMenu(false); };
    
    const handlePrint = () => { setShowProfileMenu(false); window.print(); };

    const exportToCSV = () => {
        setShowProfileMenu(false);
        if (items.length === 0) return alert("Geen producten om te exporteren.");

        const headers = ['Naam', 'Aantal', 'Eenheid', 'Categorie', 'Locatie', 'Lade', 'Ingevoerd op', 'Houdbaarheidsdatum (THT)', 'Type', 'Min. Voorraad', 'Prijs', 'Notitie'];
        
        const rows = items.map(item => {
            const loc = vriezers.find(v => v.id === item.vriezerId);
            const locNaam = loc ? loc.naam : 'Onbekend';
            const type = loc ? loc.type : 'Onbekend';
            const ladeNaam = item.ladeNaam || 'Onbekend';

            const escapeCSV = (str) => `"${(str || '').replace(/"/g, '""')}"`;

            return [
                escapeCSV(item.naam),
                item.aantal,
                escapeCSV(item.eenheid),
                escapeCSV(item.categorie),
                escapeCSV(locNaam),
                escapeCSV(ladeNaam),
                formatDate(item.ingevrorenOp),
                item.houdbaarheidsDatum ? formatDate(item.houdbaarheidsDatum) : '',
                escapeCSV(type),
                item.minimumVoorraad || '',
                item.prijs || '',
                escapeCSV(item.notitie || '')
            ].join(',');
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Voorraad_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        setShowProfileMenu(false);
        if (items.length === 0) return alert("Geen producten om te exporteren.");
        if (typeof window.jspdf === 'undefined') {
            return alert("PDF-export is niet beschikbaar (bibliotheek kon niet laden).");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.text('Voorraad. - Overzicht', 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Geëxporteerd op ${formatDate(new Date().toISOString())}`, 14, 21);

        const head = [['Naam', 'Aantal', 'Eenheid', 'Categorie', 'Locatie', 'Lade', 'THT / Ingevroren', 'Type', 'Prijs']];
        const body = items.map(item => {
            const loc = vriezers.find(v => v.id === item.vriezerId);
            const locNaam = loc ? loc.naam : 'Onbekend';
            const type = loc ? loc.type : 'Onbekend';
            const datum = item.houdbaarheidsDatum ? formatDate(item.houdbaarheidsDatum) : (item.ingevrorenOp ? formatDate(item.ingevrorenOp) : '');
            return [
                item.naam || '',
                formatAantal(item.aantal),
                item.eenheid || '',
                item.categorie || '',
                locNaam,
                item.ladeNaam || '',
                datum,
                type,
                item.prijs ? `€ ${item.prijs}` : ''
            ];
        });

        doc.autoTable({
            head, body,
            startY: 26,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [13, 148, 136] } // teal-600
        });

        doc.save(`Voorraad_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Back-up: bundelt alle data van het huidige (beheerde) account in één JSON-bestand.
    const exportBackup = async () => {
        setShowProfileMenu(false);
        try {
            showNotification('Back-up wordt gemaakt...', 'success');
            const [vSnap, lSnap, iSnap, sSnap, rSnap, uSnap] = await Promise.all([
                db.collection('vriezers').where('userId', '==', beheerdeUserId).get(),
                db.collection('lades').where('userId', '==', beheerdeUserId).get(),
                db.collection('items').where('userId', '==', beheerdeUserId).get(),
                db.collection('shoppingList').where('userId', '==', beheerdeUserId).get(),
                db.collection('recepten').where('userId', '==', beheerdeUserId).get(),
                db.collection('users').doc(beheerdeUserId).get()
            ]);
            const backup = {
                type: 'voorraad-backup',
                version: APP_VERSION,
                createdAt: new Date().toISOString(),
                userSettings: uSnap.exists ? uSnap.data() : {},
                vriezers: vSnap.docs.map(d => d.data()),
                lades: lSnap.docs.map(d => d.data()),
                items: iSnap.docs.map(d => d.data()),
                shoppingList: sSnap.docs.map(d => d.data()),
                recepten: rSnap.docs.map(d => d.data())
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Voorraad_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            showNotification('Kon geen back-up maken.', 'error');
        }
    };

    // Herstel: leest een eerder gemaakt back-upbestand in en VOEGT die data toe aan
    // je huidige voorraad (overschrijft niets, geen dataverlies-risico).
    const importBackupFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (data.type !== 'voorraad-backup') {
                showNotification('Dit lijkt geen geldig back-upbestand te zijn.', 'error');
                return;
            }
            if (!confirm(`Back-up van ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('nl-BE') : 'onbekende datum'} herstellen? Dit voegt de data toe aan je huidige voorraad.`)) return;

            showNotification('Back-up wordt hersteld...', 'success');

            // Vriezers/locaties eerst herstellen; oude-naar-nieuwe ID's bijhouden zodat
            // lades en items weer correct aan hun locatie gekoppeld worden.
            const vriezerIdMap = {};
            for (const v of (data.vriezers || [])) {
                const { id: oldId, ...rest } = v;
                const ref = await db.collection('vriezers').add({ ...rest, userId: beheerdeUserId });
                if (oldId) vriezerIdMap[oldId] = ref.id;
            }
            const ladeIdMap = {};
            for (const l of (data.lades || [])) {
                const { id: oldId, ...rest } = l;
                const ref = await db.collection('lades').add({ ...rest, userId: beheerdeUserId, vriezerId: vriezerIdMap[rest.vriezerId] || rest.vriezerId });
                if (oldId) ladeIdMap[oldId] = ref.id;
            }
            let batch = db.batch();
            let opCount = 0;
            const commitIfNeeded = async () => {
                if (opCount >= 450) { await batch.commit(); batch = db.batch(); opCount = 0; }
            };
            for (const it of (data.items || [])) {
                const { id: oldId, ...rest } = it;
                const ref = db.collection('items').doc();
                batch.set(ref, { ...rest, userId: beheerdeUserId, vriezerId: vriezerIdMap[rest.vriezerId] || rest.vriezerId, ladeId: ladeIdMap[rest.ladeId] || rest.ladeId || null });
                opCount++; await commitIfNeeded();
            }
            for (const s of (data.shoppingList || [])) {
                const { id: oldId, ...rest } = s;
                const ref = db.collection('shoppingList').doc();
                batch.set(ref, { ...rest, userId: beheerdeUserId });
                opCount++; await commitIfNeeded();
            }
            for (const r of (data.recepten || [])) {
                const { id: oldId, ...rest } = r;
                const ref = db.collection('recepten').doc();
                batch.set(ref, { ...rest, userId: beheerdeUserId });
                opCount++; await commitIfNeeded();
            }
            if (opCount > 0) await batch.commit();

            showNotification('Back-up succesvol hersteld!', 'success');
        } catch (e) {
            console.error(e);
            showNotification('Kon de back-up niet herstellen. Controleer het bestand.', 'error');
        }
    };
    
    const handleDragStart = (e, id) => {
        setDraggedLocId(id);
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e, targetId) => {
        e.preventDefault();
        if (!draggedLocId || draggedLocId === targetId) {
            setDraggedLocId(null);
            return;
        }

        const locatiesList = [...filteredLocaties];
        const draggedIndex = locatiesList.findIndex(l => l.id === draggedLocId);
        const targetIndex = locatiesList.findIndex(l => l.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedLocId(null);
            return;
        }

        const [draggedItem] = locatiesList.splice(draggedIndex, 1);
        locatiesList.splice(targetIndex, 0, draggedItem);
        setDraggedLocId(null);

        const batch = db.batch();
        locatiesList.forEach((loc, index) => {
            const locRef = db.collection('vriezers').doc(loc.id);
            batch.update(locRef, { order: index });
        });
        await batch.commit();
    };

    const handleDragEnd = () => {
        setDraggedLocId(null);
    };

const handleOpenAdd = () => {
        setEditingItem(null);
        setModalType(activeTab); 
        
        const typeLocaties = vriezers.filter(l => l.type === activeTab);
        const defaultLoc = typeLocaties.length > 0 ? typeLocaties[0].id : '';
        const defaultCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
        
        if (!rememberLocation) {
            setFormData({
                naam: '', aantal: 1, eenheid: 'stuks', vriezerId: defaultLoc, ladeId: '', 
                categorie: defaultCat, minimumVoorraad: '', prijs: '', ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', notitie: '', emoji: '', geplandeDatum: '', bulkAanmaak: 1, tags: [], altijdGoed: false
            });
        } else {
             setFormData(prev => ({
                ...prev,
                vriezerId: defaultLoc,
                naam: '', aantal: 1, minimumVoorraad: '', prijs: '', categorie: defaultCat, 
                ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', notitie: '', emoji: '', geplandeDatum: '', bulkAanmaak: 1, tags: [], altijdGoed: false
            }));
        }

        setShowAddModal(true);
    };
    
    const handleModalTypeChange = (newType) => {
        setModalType(newType);
        const newLocs = vriezers.filter(l => l.type === newType);
        const defaultLoc = newLocs.length > 0 ? newLocs[0].id : '';
        const defaultCat = newType === 'voorraad' ? 'Pasta' : 'Vlees';
        
        setFormData(prev => ({
            ...prev,
            vriezerId: defaultLoc,
            ladeId: '',
            categorie: defaultCat
        }));
    };

const handleSaveItem = async (e) => {
        e.preventDefault();
        const lade = lades.find(l => l.id === formData.ladeId);
        const loc = vriezers.find(v => v.id === formData.vriezerId);
        
        let safeAantal = parseFloat(formData.aantal);
        if (isNaN(safeAantal) || safeAantal <= 0) safeAantal = 1;

        let safeMinVoorraad = parseFloat(formData.minimumVoorraad);
        if (isNaN(safeMinVoorraad) || safeMinVoorraad < 0) safeMinVoorraad = null;

        let safePrijs = parseFloat(formData.prijs);
        if (isNaN(safePrijs) || safePrijs < 0) safePrijs = null;

        const data = {
            ...formData,
            aantal: safeAantal,
            minimumVoorraad: safeMinVoorraad,
            prijs: safePrijs,
            ladeNaam: lade ? lade.naam : '',
            notitie: formData.notitie || '',
            ingevrorenOp: new Date(formData.ingevrorenOp),
            houdbaarheidsDatum: formData.houdbaarheidsDatum ? new Date(formData.houdbaarheidsDatum) : null,
            userId: beheerdeUserId,
            emoji: formData.emoji || getEmojiForCategory(formData.categorie),
            altijdGoed: formData.altijdGoed || false
        };

        try {
            if(editingItem) {
                let changes = [];
                if (editingItem.naam !== data.naam) changes.push(`Naam: ${editingItem.naam} ➔ ${data.naam}`);
                if (parseFloat(editingItem.aantal) !== parseFloat(data.aantal)) changes.push(`Aantal: ${editingItem.aantal} ➔ ${data.aantal}`);
                if (editingItem.eenheid !== data.eenheid) changes.push(`Eenheid: ${editingItem.eenheid} ➔ ${data.eenheid}`);
                if (editingItem.categorie !== data.categorie) changes.push(`Categorie: ${editingItem.categorie} ➔ ${data.categorie}`);
                if (editingItem.ladeId !== data.ladeId) changes.push(`Lade: ${editingItem.ladeNaam || '?'} ➔ ${data.ladeNaam || '?'}`);
                if ((editingItem.prijs || '') != (data.prijs || '')) changes.push(`Prijs: ${editingItem.prijs || '0'} ➔ ${data.prijs || '0'}`);
                if ((editingItem.minimumVoorraad || '') != (data.minimumVoorraad || '')) changes.push(`Min: ${editingItem.minimumVoorraad || '0'} ➔ ${data.minimumVoorraad || '0'}`);
                if ((editingItem.notitie || '') !== (data.notitie || '')) changes.push(`Notitie aangepast`);
                
                const detailsString = changes.length > 0 ? changes.join(', ') : 'Geen velden gewijzigd';
                const logToevoeging = formData.viaBalans ? ' (via Balans)' : '';

                await db.collection('items').doc(editingItem.id).update(data);
                
                markLadeAsChanged(data.ladeId); // Slaat datum laatste wijziging op
                if (editingItem.ladeId && editingItem.ladeId !== data.ladeId) markLadeAsChanged(editingItem.ladeId);

                await logAction('Bewerkt', data.naam, detailsString + logToevoeging, user, beheerdeUserId);
                showNotification(`${data.naam} is bijgewerkt!`, 'success');
                setEditingItem(null);
                setShowAddModal(false);
            } else {
                const aantalKeerToevoegen = parseInt(formData.bulkAanmaak) || 1;
                const batchPromises = [];
                for(let i = 0; i < aantalKeerToevoegen; i++) batchPromises.push(db.collection('items').add(data));
                await Promise.all(batchPromises);
                
                markLadeAsChanged(data.ladeId); // Slaat datum laatste wijziging op

                const locNaam = loc ? loc.naam : 'Onbekende locatie';
                const ladeNaam = lade ? lade.naam : 'Onbekende lade';
                const logToevoeging = formData.viaBalans ? ' (via Balans)' : '';
                
                if (aantalKeerToevoegen > 1) {
                    await logAction('Toevoegen', data.naam, `${aantalKeerToevoegen} losse items in ${locNaam} (${ladeNaam})${logToevoeging}`, user, beheerdeUserId);
                    showNotification(`${aantalKeerToevoegen} keer ${data.naam} apart toegevoegd!`, 'success');
                } else {
                    await logAction('Toevoegen', data.naam, `${data.aantal} ${data.eenheid} in ${locNaam} (${ladeNaam})${logToevoeging}`, user, beheerdeUserId);
                    showNotification(`${data.naam} is toegevoegd!`, 'success');
                }
                
                if (rememberLocation) {
                    setFormData(prev => ({
                        ...prev, naam: '', aantal: 1, minimumVoorraad: '', prijs: '', notitie: '', emoji: '', ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', bulkAanmaak: 1, viaBalans: false
                    }));
                } else {
                    const defaultCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
                    setFormData(prev => ({...prev, naam: '', aantal: 1, minimumVoorraad: '', prijs: '', notitie: '', emoji: '', categorie: defaultCat, bulkAanmaak: 1, viaBalans: false})); 
                }
                setShowAddModal(false);
            }
        } catch(err) { 
            showNotification("Er ging iets mis: " + err.message, 'error'); 
        }
    };

    const checkMinimumStock = async (item, newAantal) => {
        if (item.minimumVoorraad && newAantal < item.minimumVoorraad) {
            const onList = shoppingList.some(s => s.naam.toLowerCase() === item.naam.toLowerCase() && !s.checked);
            if (!onList) {
                const amountToBuy = item.minimumVoorraad - newAantal;
                await db.collection('shoppingList').add({
                    naam: item.naam,
                    aantal: amountToBuy > 0 ? amountToBuy : 1,
                    eenheid: item.eenheid,
                    winkel: '',
                    checked: false,
                    userId: beheerdeUserId
                });
                showNotification(`${item.naam} staat (weer) op je boodschappenlijst!`, 'info');
            }
        }
    };

    const handleQuickDecrease = async (item) => {
        const currentAantal = parseFloat(item.aantal);
        if (currentAantal > 1) {
            let step = 1;
            if(currentAantal % 1 !== 0) step = 0.25; 
            const newAantal = currentAantal - step;
            
            if(newAantal > 0) {
                try {
                    const fraction = step / currentAantal;
                    const consumedValue = (item.prijs || 0) * fraction;
                    const newPrijs = (item.prijs || 0) - consumedValue;

                    await db.collection('items').doc(item.id).update({ aantal: newAantal, prijs: newPrijs });
                    await db.collection('users').doc(beheerdeUserId).update({ 
                        'stats.consumed': firebase.firestore.FieldValue.increment(1),
                        'stats.consumedValue': firebase.firestore.FieldValue.increment(consumedValue)
                    });
                    
                    await logAction('Geconsumeerd', item.naam, `- ${step} ${item.eenheid}`, user, beheerdeUserId);
                    showNotification(`1 ${item.eenheid} van ${item.naam} opgegeten!`, 'success');
                    
                    checkMinimumStock(item, newAantal);
                } catch(err) {
                    showNotification("Fout bij updaten", "error");
                }
            } else {
                initDelete(item);
            }
        } else {
            initDelete(item);
        }
    };

    const initConsume = (item) => {
        setItemToConsume(item);
        let defaultAmount = 1;
        if (parseFloat(item.aantal) < 1) defaultAmount = parseFloat(item.aantal);
        setConsumeAmount(defaultAmount);
        setShowConsumeModal(true);
    };

    const confirmConsume = async () => {
        if (!itemToConsume) return;
        
        let amount = parseFloat(consumeAmount);
        if (isNaN(amount) || amount <= 0) return;
        
        const currentAantal = parseFloat(itemToConsume.aantal);
        
        if (amount > currentAantal) amount = currentAantal;

        try {
            if (amount >= currentAantal) {
                await db.collection('items').doc(itemToConsume.id).delete();
                await db.collection('users').doc(beheerdeUserId).update({ 
                    'stats.consumed': firebase.firestore.FieldValue.increment(1),
                    'stats.consumedValue': firebase.firestore.FieldValue.increment(itemToConsume.prijs || 0)
                });
                await logAction('Verwijderd', itemToConsume.naam, 'Volledig opgegeten', user, beheerdeUserId);
                showNotification(`${itemToConsume.naam} is volledig op!`, 'success');

                setItemToShopify(itemToConsume);
                let suggestAmount = 1;
                if (itemToConsume.minimumVoorraad && itemToConsume.minimumVoorraad > 0) {
                    suggestAmount = itemToConsume.minimumVoorraad;
                }
                
                setAantalForShopifyItem(suggestAmount); 
                setShowConsumeModal(false);
                setShowShopifyModal(true);
                setItemToConsume(null);
            } else {
                const newAantal = currentAantal - amount;
                const fraction = amount / currentAantal;
                const consumedValue = (itemToConsume.prijs || 0) * fraction;
                const newPrijs = (itemToConsume.prijs || 0) - consumedValue;

                await db.collection('items').doc(itemToConsume.id).update({ aantal: newAantal, prijs: newPrijs });
                await db.collection('users').doc(beheerdeUserId).update({ 
                    'stats.consumed': firebase.firestore.FieldValue.increment(1),
                    'stats.consumedValue': firebase.firestore.FieldValue.increment(consumedValue)
                });
                await logAction('Geconsumeerd', itemToConsume.naam, `- ${amount} ${itemToConsume.eenheid}`, user, beheerdeUserId);
                showNotification(`${amount} ${itemToConsume.eenheid} van ${itemToConsume.naam} weggenomen!`, 'success');
                
                checkMinimumStock(itemToConsume, newAantal);

                setShowConsumeModal(false);
                setItemToConsume(null);
            }
        } catch(err) {
            showNotification("Fout bij updaten", "error");
        }
    };

    const handleDuplicate = (item) => {
        setEditingItem(null); 
        const loc = vriezers.find(v => v.id === item.vriezerId);
        setModalType(loc ? loc.type : 'vriezer');

        setFormData({
            naam: item.naam + " (Kopie)",
            aantal: item.aantal,
            eenheid: item.eenheid,
            vriezerId: item.vriezerId,
            ladeId: item.ladeId,
            categorie: item.categorie,
            minimumVoorraad: item.minimumVoorraad || '',
            prijs: item.prijs || '',
            notitie: item.notitie || '',
            ingevrorenOp: toInputDate(item.ingevrorenOp),
            houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum),
            emoji: item.emoji
        });
        setShowAddModal(true);
    };

    const initDelete = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = async (reason) => {
        if (!itemToDelete) return;
        
        try {
            await db.collection('items').doc(itemToDelete.id).delete();
            
            let logDetail = 'Item verwijderd';
            if (reason === 'consumed') {
                logDetail = 'Opgegeten';
                await db.collection('users').doc(beheerdeUserId).update({ 
                    'stats.consumed': firebase.firestore.FieldValue.increment(1),
                    'stats.consumedValue': firebase.firestore.FieldValue.increment(itemToDelete.prijs || 0)
                });
            } else if (reason === 'wasted') {
                logDetail = 'Weggegooid (Verspild)';
                await db.collection('users').doc(beheerdeUserId).update({ 
                    'stats.wasted': firebase.firestore.FieldValue.increment(1),
                    'stats.wastedValue': firebase.firestore.FieldValue.increment(itemToDelete.prijs || 0)
                });
            }

            await logAction('Verwijderd', itemToDelete.naam, logDetail, user, beheerdeUserId);
            showNotification(`${itemToDelete.naam} is verwijderd.`, 'success');
            
            setItemToShopify(itemToDelete);
            
            let validAantal = parseFloat(itemToDelete.aantal);
            if (isNaN(validAantal) || validAantal <= 0) validAantal = 1;
            
            if (itemToDelete.minimumVoorraad && itemToDelete.minimumVoorraad > 0) {
                validAantal = itemToDelete.minimumVoorraad;
            }

            setAantalForShopifyItem(validAantal);
            
            setShowDeleteModal(false);
            setShowShopifyModal(true);
            setItemToDelete(null);

        } catch(err) {
            showNotification("Kon niet verwijderen", 'error');
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const handleAddToShoppingFromDelete = async () => {
        if (!itemToShopify) return;
        
        let safeAantal = parseFloat(aantalForShopifyItem);
        if (isNaN(safeAantal) || safeAantal <= 0) safeAantal = 1;

        await db.collection('shoppingList').add({
            naam: itemToShopify.naam,
            aantal: safeAantal,
            eenheid: itemToShopify.eenheid || 'stuks',
            winkel: shopForDeletedItem,
            checked: false,
            userId: beheerdeUserId
        });
        showNotification("Aan boodschappenlijst toegevoegd.", "success");
        
        setShopForDeletedItem('');
        setItemToShopify(null);
        setAantalForShopifyItem(1);
        setShowShopifyModal(false);
    };

    const handleAddShoppingItem = async (e) => {
        e.preventDefault();
        
        let safeAantal = parseFloat(shoppingFormData.aantal);
        if (isNaN(safeAantal) || safeAantal <= 0) safeAantal = 1;

        await db.collection('shoppingList').add({
            ...shoppingFormData,
            aantal: safeAantal,
            checked: false,
            userId: beheerdeUserId
        });
        setShoppingFormData({ naam: '', aantal: 1, eenheid: 'stuks', winkel: '' });
    };

    const toggleShoppingItem = async (item) => {
        await db.collection('shoppingList').doc(item.id).update({ checked: !item.checked });
    };

    const deleteShoppingItem = async (id) => {
        await db.collection('shoppingList').doc(id).delete();
    };

    const clearCheckedShopping = async () => {
        if(confirm("Weet je zeker dat je alle afgevinkte boodschappen wilt verwijderen?")) {
            const batch = db.batch();
            shoppingList.filter(i => i.checked).forEach(item => {
                batch.delete(db.collection('shoppingList').doc(item.id));
            });
            try {
                await batch.commit();
                showNotification("Afgevinkte items opgeruimd!", "success");
            } catch(e) {
                showNotification("Fout bij opruimen.", "error");
            }
        }
    };
    
    const buildShoppingListText = () => {
        let text = "🛒 *Mijn Boodschappenlijstje*\n\n";
        
        const grouped = shoppingList.reduce((acc, item) => {
            const winkelKey = item.winkel || 'Boodschappen';
            if(!acc[winkelKey]) acc[winkelKey] = [];
            acc[winkelKey].push(item);
            return acc;
        }, {});

        Object.entries(grouped).forEach(([winkel, lijstItems]) => {
            const unchecked = lijstItems.filter(i => !i.checked);
            if (unchecked.length === 0) return;
            
            if (winkel !== 'Boodschappen') text += `*${winkel}*\n`;
            else text += `*Overig*\n`;
            
            unchecked.forEach(i => {
                text += `- ${formatAantal(i.aantal)} ${i.eenheid} ${i.naam}\n`;
            });
            text += "\n";
        });

        return text;
    };

    const handleShareWhatsApp = () => {
        if (shoppingList.length === 0) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(buildShoppingListText())}`, '_blank');
    };

    // Native deelvenster (Web Share API): laat de gebruiker kiezen via welke app
    // (Mail, Berichten, WhatsApp, ...) het lijstje gedeeld wordt. Werkt vooral goed
    // op mobiel; op desktop of oudere browsers valt dit terug op kopiëren naar klembord.
    const handleShareList = async () => {
        if (shoppingList.length === 0) return;
        const text = buildShoppingListText();

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Boodschappenlijstje', text });
            } catch (err) {
                // gebruiker annuleerde het deelvenster, geen actie nodig
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                showNotification('Boodschappenlijst gekopieerd naar klembord!', 'success');
            } catch (err) {
                handleShareWhatsApp();
            }
        } else {
            handleShareWhatsApp();
        }
    };

    const moveShoppingToStock = async (item) => {
        setEditingItem(null);
        setModalType('voorraad'); 

        const stockLocs = vriezers.filter(l => l.type === 'voorraad');
        const defaultLoc = stockLocs.length > 0 ? stockLocs[0].id : '';

        let safeAantal = parseFloat(item.aantal);
        if (isNaN(safeAantal) || safeAantal <= 0) safeAantal = 1;

        setFormData({
            naam: item.naam, aantal: safeAantal, eenheid: item.eenheid, 
            vriezerId: defaultLoc, ladeId: '', categorie: 'Overig', 
            minimumVoorraad: '', prijs: '', notitie: '',
            ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
        });
        
        setShowAddModal(true);
        setShowShoppingModal(false); 
        
        if(confirm("Verwijder van boodschappenlijst?")) {
            deleteShoppingItem(item.id);
        }
    };

    const getSuggestions = () => {
        const scoredItems = items.map(item => {
            let score = 0;
            const daysTHT = item.houdbaarheidsDatum ? getDagenTotTHT(item.houdbaarheidsDatum) : 999;
            const daysOld = getDagenOud(item.ingevrorenOp);
            const loc = vriezers.find(v => v.id === item.vriezerId);
            const type = loc?.type || 'vriezer';

            if (type === 'vriezer') {
                if (daysOld > 180) score += 50; 
                else if (daysOld > 90) score += 20;
            } else { 
                if (daysTHT < 0) score += 100; 
                else if (daysTHT <= 3) score += 80; 
                else if (daysTHT <= 7) score += 40;
            }
            return { ...item, score, daysTHT, daysOld, type };
        });

        return scoredItems.filter(i => i.score > 0).sort((a,b) => b.score - a.score).slice(0, 5);
    };

    const openEditFromDashboard = (item) => {
        if (beheerdeUserId !== dashboardUser) {
            setBeheerdeUserId(dashboardUser);
        }
        setShowDashboardModal(false);
        openEdit(item);
    };

const openEdit = (item) => {
        setEditingItem(item);
        const loc = vriezers.find(v => v.id === item.vriezerId);
        const itemType = loc ? loc.type : 'vriezer';
        setModalType(itemType);

        let safeAantal = parseFloat(item.aantal);
        if (isNaN(safeAantal)) {
            safeAantal = 1;
        }

        setFormData({
            naam: item.naam, 
            aantal: safeAantal, 
            eenheid: item.eenheid, 
            vriezerId: item.vriezerId, 
            ladeId: item.ladeId, 
            categorie: item.categorie,
            minimumVoorraad: item.minimumVoorraad || '',
            prijs: item.prijs || '',
            notitie: item.notitie || '',
            ingevrorenOp: toInputDate(item.ingevrorenOp), 
            houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum), 
            emoji: item.emoji,
            geplandeDatum: item.geplandeDatum || '',
            tags: item.tags || [],
            altijdGoed: item.altijdGoed || false
        });
        setShowAddModal(true);
    };

    const toggleBulkSelection = (id) => {
        const newSet = new Set(selectedBulkItems);
        if(newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedBulkItems(newSet);
    };

    const handleBulkDelete = async () => {
        if(selectedBulkItems.size === 0) return;
        if(!confirm(`Weet je zeker dat je deze ${selectedBulkItems.size} producten wilt verwijderen?`)) return;

        const batch = db.batch();
        selectedBulkItems.forEach(id => {
            batch.delete(db.collection('items').doc(id));
            
            const item = items.find(i => i.id === id);
            if (item) {
                logAction('Verwijderd', item.naam, 'Via Bulk Actie', user, beheerdeUserId);
            }
        });

        try {
            await batch.commit();
            showNotification(`${selectedBulkItems.size} producten succesvol verwijderd.`, "success");
            setSelectedBulkItems(new Set());
            setIsBulkMode(false);
        } catch(e) {
            showNotification("Fout bij bulk verwijderen.", "error");
        }
    };

    const openBulkMoveModal = () => {
        if(selectedBulkItems.size === 0) return;
        setBulkMoveTarget({ vriezerId: '', ladeId: '' });
        setShowBulkMoveModal(true);
    };

    const handleBulkMove = async (e) => {
        e.preventDefault();
        if(!bulkMoveTarget.vriezerId || !bulkMoveTarget.ladeId) return;

        const targetLade = lades.find(l => l.id === bulkMoveTarget.ladeId);
        const batch = db.batch();

        selectedBulkItems.forEach(id => {
            batch.update(db.collection('items').doc(id), { 
                vriezerId: bulkMoveTarget.vriezerId,
                ladeId: bulkMoveTarget.ladeId,
                ladeNaam: targetLade ? targetLade.naam : ''
            });

            const item = items.find(i => i.id === id);
            if (item) {
                logAction('Bewerkt', item.naam, `Verplaatst via Bulk naar Lade: ${targetLade ? targetLade.naam : '?'}`, user, beheerdeUserId);
            }
        });

        try {
            await batch.commit();
            showNotification(`${selectedBulkItems.size} producten succesvol verplaatst.`, "success");
            setSelectedBulkItems(new Set());
            setIsBulkMode(false);
            setShowBulkMoveModal(false);
        } catch(e) {
            showNotification("Fout bij bulk verplaatsen.", "error");
        }
    };

    const handleFindRecipe = () => {
        if(selectedBulkItems.size === 0) return;
        
        const names = Array.from(selectedBulkItems).map(id => {
            const item = items.find(i => i.id === id);
            return item ? item.naam : '';
        }).filter(Boolean);
        
        if (names.length === 0) return;
        
        const query = "Recept met " + names.join(' en ');
        window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
        
        setIsBulkMode(false);
        setSelectedBulkItems(new Set());
    };

    const handleAddLocatie = async (e) => {
        e.preventDefault();
        await db.collection('vriezers').add({ 
            naam: newLocatieNaam, 
            type: activeTab, 
            userId: beheerdeUserId,
            color: newLocatieColor,
            order: filteredLocaties.length,
            locatieGroep: activeLocatieGroep
        });
        setNewLocatieNaam('');
        setNewLocatieColor('blue');
    };

    const cycleLocatieColor = async (locatie) => {
        const keys = Object.keys(GRADIENTS);
        const currentColor = locatie.color || 'blue'; 
        const currentIndex = keys.indexOf(currentColor);
        const nextIndex = (currentIndex + 1) % keys.length;
        const nextColor = keys[nextIndex];
        
        await db.collection('vriezers').doc(locatie.id).update({ color: nextColor });
    };

    const handleDeleteLocatie = async (id) => {
        if(lades.some(l => l.vriezerId === id)) return alert("Maak locatie eerst leeg.");
        if(confirm("Verwijderen?")) await db.collection('vriezers').doc(id).delete();
    };

    const handleAddLade = async (e) => {
        e.preventDefault();
        await db.collection('lades').add({ naam: newLadeNaam, vriezerId: selectedLocatieForBeheer, userId: beheerdeUserId });
        setNewLadeNaam('');
    };
    const handleDeleteLade = async (id) => {
        if(items.some(i => i.ladeId === id)) return alert("Maak lade eerst leeg.");
        if(confirm("Verwijderen?")) await db.collection('lades').doc(id).delete();
    };
    
    const startEditLade = (l) => { setEditingLadeId(l.id); setEditingLadeName(l.naam); };
    const saveLadeName = async (id) => {
        await db.collection('lades').doc(id).update({ naam: editingLadeName });
        const batch = db.batch();
        const itemsInLade = items.filter(i => i.ladeId === id);
        itemsInLade.forEach(item => {
            batch.update(db.collection('items').doc(item.id), { ladeNaam: editingLadeName });
        });
        await batch.commit();
        setEditingLadeId(null);
    };

    const handleAddUnit = async (e) => {
        e.preventDefault();
        const naam = newUnitNaam.trim().toLowerCase();
        
        let standardList = EENHEDEN_VRIES;
        let currentCustom = customUnitsVries;
        let dbField = 'customUnitsVries';

        if (eenheidFilter === 'voorraad') {
            standardList = EENHEDEN_VOORRAAD;
            currentCustom = customUnitsVoorraad;
            dbField = 'customUnitsVoorraad';
        } else if (eenheidFilter === 'frig') {
            standardList = EENHEDEN_FRIG;
            currentCustom = customUnitsFrig;
            dbField = 'customUnitsFrig';
        }

        if(naam && !standardList.includes(naam) && !currentCustom.includes(naam)) {
            const updated = [...currentCustom, naam];
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
            setNewUnitNaam('');
        }
    };

    const handleDeleteUnit = async (unit) => {
        if(confirm(`Verwijder eenheid '${unit}'?`)) {
            let currentCustom = customUnitsVries;
            let dbField = 'customUnitsVries';

            if (eenheidFilter === 'voorraad') {
                currentCustom = customUnitsVoorraad;
                dbField = 'customUnitsVoorraad';
            } else if (eenheidFilter === 'frig') {
                currentCustom = customUnitsFrig;
                dbField = 'customUnitsFrig';
            }
            
            const updated = currentCustom.filter(u => u !== unit);
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
        }
    };
    
    const startEditUnit = (u) => { setEditingUnitName(u); setEditUnitInput(u); };
    const saveUnitName = async (id) => {
        if(!editUnitInput.trim()) return;
        
        let currentCustom = customUnitsVries;
        let dbField = 'customUnitsVries';

        if (eenheidFilter === 'voorraad') {
            currentCustom = customUnitsVoorraad;
            dbField = 'customUnitsVoorraad';
        } else if (eenheidFilter === 'frig') {
            currentCustom = customUnitsFrig;
            dbField = 'customUnitsFrig';
        }

        const updated = currentCustom.map(u => u === editingUnitName ? editUnitInput : u);
        await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
        
        const batch = db.batch();
        const itemsWithUnit = items.filter(i => i.eenheid === editingUnitName);
        itemsWithUnit.forEach(item => {
            batch.update(db.collection('items').doc(item.id), { eenheid: editUnitInput });
        });
        await batch.commit();
        setEditingUnitName(null);
    };

    const handleAddCat = async (e) => {
        e.preventDefault();
        if(newCatName.trim()) {
            const updated = [...customCategories, {name: newCatName, color: newCatColor}];
            await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});
            setNewCatName('');
        }
    };
    const handleDeleteCat = async (catName) => {
        if(confirm(`Verwijder categorie '${catName}'?`)) {
            const updated = customCategories.filter(c => c.name !== catName);
            await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});
        }
    };
    const startEditCat = (cat) => { 
        setEditingCatName(cat.name); 
        setEditCatInputName(cat.name); 
        setEditCatInputColor(cat.color || 'gray'); 
    };
    const saveCat = async () => {
        if(!editCatInputName.trim()) return;
        const updated = customCategories.map(c => c.name === editingCatName ? {name: editCatInputName, color: editCatInputColor} : c);
        await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});

        if(editingCatName !== editCatInputName) {
            const batch = db.batch();
            const itemsWithCat = items.filter(i => i.categorie === editingCatName);
            itemsWithCat.forEach(item => {
                batch.update(db.collection('items').doc(item.id), { categorie: editCatInputName });
            });
            await batch.commit();
        }
        setEditingCatName(null);
    };


    const handleShare = async (e) => {
        e.preventDefault();
        const email = shareEmail.trim().toLowerCase();
        if (!email) return;
        if (email === (user.email || '').toLowerCase()) {
            showNotification('Je kan jezelf niet uitnodigen.', 'error');
            return;
        }
        const existing = await db.collection('shares').where('ownerId', '==', user.uid).where('sharedWithEmail', '==', email).get();
        const active = existing.docs.find(d => d.data().status !== 'declined');
        if (active) {
            showNotification('Deze persoon is al uitgenodigd of heeft al toegang.', 'error');
            return;
        }
        await db.collection('shares').add({ 
            ownerId: user.uid, ownerEmail: user.email, sharedWithEmail: email, role: 'editor', status: 'pending', createdAt: new Date().toISOString()
        });
        showNotification('Uitnodiging verstuurd!', 'success');
        setShareEmail('');
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        await db.collection('users').doc(userId).update({ disabled: !currentStatus }); 
    };

    const toggleUserTabVisibility = async (userId, userHiddenTabs, tabName) => {
        const tabs = userHiddenTabs || [];
        let newTabs;
        if (tabs.includes(tabName)) {
            newTabs = tabs.filter(t => t !== tabName);
        } else {
            newTabs = [...tabs, tabName];
        }
        await db.collection('users').doc(userId).set({ hiddenTabs: newTabs }, { merge: true });
    };

    const toggleUserTourDisabled = async (userId, currentStatus) => {
        try {
            await db.collection('users').doc(userId).set({ tourDisabled: !currentStatus }, { merge: true });
            showNotification(`Tour is nu ${!currentStatus ? 'uitgeschakeld' : 'ingeschakeld'} voor deze gebruiker.`, "success");
        } catch(e) {
            showNotification("Fout bij aanpassen van instelling.", "error");
        }
    };

    const toggleUserHelpButton = async (userId, currentStatus) => {
        try {
            await db.collection('users').doc(userId).set({ showHelpButton: !currentStatus }, { merge: true });
            showNotification(`Hulp knop is nu ${!currentStatus ? 'zichtbaar' : 'verborgen'} voor deze gebruiker.`, "success");
        } catch(e) {
            showNotification("Fout bij aanpassen van instelling.", "error");
        }
    };

    const toggleUserNotifications = async (userId, currentStatus) => {
        try {
            await db.collection('users').doc(userId).set({ notificationsEnabled: !currentStatus }, { merge: true });
            showNotification(`Meldingen zijn nu ${!currentStatus ? 'ingeschakeld' : 'uitgeschakeld'} voor deze gebruiker.`, "success");
        } catch(e) {
            showNotification("Fout bij aanpassen van instelling.", "error");
        }
    };
const toggleUserBalansMode = async (userId, currentStatus) => {
    try {
        await db.collection('users').doc(userId).set({ showBalans: !currentStatus }, { merge: true });
        showNotification(`Controle modus is nu ${!currentStatus ? 'AAN' : 'UIT'} gezet voor deze gebruiker.`, "success");
    } catch(e) {
        showNotification("Fout bij aanpassen van instelling.", "error");
    }
};

    const toggleLade = async (id) => {
        const newSet = new Set(collapsedLades);
        if(newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        
        setCollapsedLades(newSet);

        if(user) {
            const openLadesArray = lades
                .filter(l => !newSet.has(l.id))
                .map(l => l.id);
            try {
                await db.collection('users').doc(user.uid).set({ openLades: openLadesArray }, { merge: true });
            } catch(e) { console.error("Kon lade status niet opslaan", e); }
        }
    };

    const toggleAll = async () => {
        const expanding = collapsedLades.size > 0; 
        const newSet = expanding ? new Set() : new Set(lades.map(l => l.id));
        setCollapsedLades(newSet);

        if (user) {
            const openLadesArray = expanding ? lades.map(l => l.id) : [];
            try {
                await db.collection('users').doc(user.uid).set({ openLades: openLadesArray }, { merge: true });
            } catch(e) { console.error("Kon lade status niet opslaan", e); }
        }
    };

    const finishTutorial = async () => {
        setShowOnboarding(false);
        if (user) {
            await db.collection('users').doc(user.uid).set({ hasSeenTutorial: true }, { merge: true });
        }
        setOnboardingStep(0);
    };

    const nextTourStep = () => {
        if (onboardingStep < tourSteps.length - 1) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            finishTutorial();
        }
    };

    const handleSwipeStart = (e) => {
        isDragging.current = true;
        setTouchEnd(null);
        setTouchStart(e.type.includes('mouse') ? e.clientX : e.targetTouches[0].clientX);
    };

    const handleSwipeMove = (e) => {
        if (!isDragging.current) return;
        setTouchEnd(e.type.includes('mouse') ? e.clientX : e.targetTouches[0].clientX);
    };

    const handleSwipeEnd = () => {
        isDragging.current = false;
        if (touchStart === null || touchEnd === null) return;
        const distance = touchStart - touchEnd;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) {
            nextTourStep();
        } else if (distance < -minSwipeDistance) {
            if (onboardingStep > 0) {
                setOnboardingStep(onboardingStep - 1);
            }
        }
        setTouchStart(null);
        setTouchEnd(null);
    };

    const toggleGlobalOnboardingStatus = async () => {
        await db.collection('settings').doc('onboarding').set({ isActive: !globalOnboardingActive }, { merge: true });
        showNotification(`Tour staat nu ${!globalOnboardingActive ? 'Aan' : 'Uit'} voor iedereen.`, 'success');
    };

    const resetTutorialForEveryone = async () => {
        if(confirm("Weet je zeker dat je de tour voor IEDEREEN wilt resetten? Ze krijgen deze dan weer te zien bij de volgende login.")) {
            try {
                const usersSnap = await db.collection('users').get();
                const batch = db.batch();
                usersSnap.docs.forEach(u => batch.update(u.ref, { hasSeenTutorial: false }));
                await batch.commit();
                showNotification("Tutorial succesvol gereset voor alle gebruikers!", "success");
            } catch (e) {
                showNotification("Fout bij resetten van tutorial.", "error");
            }
        }
    };
const toggleMaintenanceMode = async () => {
        try {
            await db.collection('settings').doc('maintenance').set({ active: !maintenanceMode }, { merge: true });
            showNotification(`Onderhoudsmodus staat nu ${!maintenanceMode ? 'AAN' : 'UIT'}.`, "success");
        } catch (e) {
            showNotification("Fout bij opslaan onderhoudsmodus.", "error");
        }
    };
    const triggerTourForUser = async (userId) => {
        try {
            await db.collection('users').doc(userId).set({ hasSeenTutorial: false, tourDisabled: false }, { merge: true });
            showNotification("Tour staat klaar voor deze gebruiker!", "success");
        } catch (e) {
            showNotification("Fout bij updaten van tour status.", "error");
        }
    };

    const openTourAdmin = () => {
        setEditingTourSteps([...tourSteps]);
        setShowTourAdminModal(true);
    };

    const saveTourStepsToDb = async () => {
        try {
            await db.collection('settings').doc('tourSteps').set({ steps: editingTourSteps }, { merge: true });
            setShowTourAdminModal(false);
            showNotification("Nieuwe tour succesvol opgeslagen!", "success");
        } catch (e) {
            showNotification("Fout bij opslaan van de tour.", "error");
        }
    };

    const handleUpdateEditStep = (index, field, value) => {
        const newSteps = [...editingTourSteps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setEditingTourSteps(newSteps);
    };

    const handleAddEditStep = () => {
        setEditingTourSteps([...editingTourSteps, { title: 'Nieuwe Stap', content: '', icon: 'Info', colorName: 'blue' }]);
    };

    const handleDeleteEditStep = (index) => {
        if(confirm("Weet je zeker dat je deze stap wilt verwijderen?")) {
            setEditingTourSteps(editingTourSteps.filter((_, i) => i !== index));
        }
    };

    const moveEditStep = (index, direction) => {
        const newSteps = [...editingTourSteps];
        if (direction === 'up' && index > 0) {
            [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
        } else if (direction === 'down' && index < newSteps.length - 1) {
            [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
        }
        setEditingTourSteps(newSteps);
    };

    const isSearching = search.trim().length > 0;
    let totalFoundItemsInActiveTab = 0;
    if (isSearching) {
        totalFoundItemsInActiveTab = activeItems.filter(i => {
            if (!smartMatch(i.naam, search)) return false;
            if (activeCategoryFilter && i.categorie !== activeCategoryFilter) return false;
            return true;
        }).length;
    }

    const totalStockValue = items.reduce((acc, item) => acc + (parseFloat(item.prijs) || 0), 0);

    if (!user) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-900 p-4 transition-colors duration-300">
            <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-sm w-full text-center border border-white/20">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-500 mb-4">Voorraad.</h1>
                <p className="text-stone-500 dark:text-stone-400 mb-6 text-sm">Log in om je voorraad te beheren.</p>
                <button onClick={handleGoogleLogin} className="w-full bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 py-3 rounded-xl font-medium hover:scale-105 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24"><g><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></g></svg>
                    Inloggen met Google
                </button>
            </div>
        </div>
    );

    if (maintenanceMode && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-900 p-4 transition-colors duration-300 text-center">
                <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 max-w-sm w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-gradient-to-tr from-teal-50 to-indigo-50 dark:from-teal-900/20 dark:to-indigo-900/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mb-5 relative shadow-inner border border-teal-100/50 dark:border-teal-800/50">
                        <Icon className="animate-pulse" path={Icons.Box} size={32}/>
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center border-4 border-white dark:border-stone-800 shadow-sm translate-x-1 translate-y-1">
                            <Icon path={Icons.Wrench} size={10}/>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-400 mb-1">Voorraad.</h1>
                    <h2 className="text-xs font-bold text-stone-400 dark:text-stone-500 mb-4 uppercase tracking-widest">In Onderhoud</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 leading-relaxed px-2">
                        We zijn achter de schermen bezig met een update. Nog heel even geduld, we zijn zo snel mogelijk weer online!
                    </p>

                    <button onClick={handleLogout} className="px-4 py-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium transition-colors text-xs flex items-center gap-1.5 active:scale-95">
                        <Icon path={Icons.LogOut} size={14}/> Uitloggen
                    </button>
                </div>
            </div>
        );
    }
    const currentVersionData = VERSION_HISTORY.find(v => v.version === APP_VERSION);

    const groupedShoppingList = shoppingList.reduce((acc, item) => {
        const winkelKey = item.winkel || 'Geen winkel gekozen';
        if(!acc[winkelKey]) acc[winkelKey] = [];
        acc[winkelKey].push(item);
        return acc;
    }, {});

    // Bouwt het profielmenu-paneel op; 'positionClasses' bepaalt waar het paneel verschijnt
    // (rechtsboven vanaf de header, of rechtsboven-de-pil vanaf de onderste navigatie).
const renderProfileMenu = (positionClasses) => (
        <div className={`absolute w-56 bg-white/95 dark:bg-stone-800/95 backdrop-blur-md rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 py-2 z-50 ${positionClasses}`}>
            <div className="px-4 py-2 border-b border-stone-50 dark:border-stone-700 mb-1">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{user.displayName || 'Gebruiker'}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
            </div>
            
            <button onClick={toggleDarkMode} className={CX_MENU_ITEM}>
                {darkMode ? (
                    <>
                        <Icon path={Icons.Sun} size={16} /> {t('profile_light')}
                    </>
                ) : (
                    <>
                        <Icon path={Icons.Moon} size={16} /> {t('profile_dark')}
                    </>
                )}
            </button>
            
            {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                <button onClick={requestNotificationPermission} className={CX_MENU_ITEM}>
                    <Icon path={Icons.Bell} size={16} /> {notifPermission === 'denied' ? 'Meldingen geblokkeerd.' : 'Meldingen inschakelen.'}
                </button>
            )}
            {(!myHiddenTabs.includes('balans') || isAdmin) && (
                <button onClick={toggleBalansMode} className={CX_MENU_ITEM}>
                    {myShowBalans ? (
                        <>
                            <Icon path={Icons.CheckSquare} size={16} /> Controle uit.
                        </>
                    ) : (
                        <>
                            <Icon path={Icons.CheckSquare} size={16} /> Controle aan.
                        </>
                    )}
                </button>
            )}
            {isAdmin && (
                <>
                    <button onClick={() => { setShowUserAdminModal(true); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                        <Icon path={Icons.Users} size={16}/> Gebruikers & Wisselen.
                    </button>
                    <button onClick={() => { openTourAdmin(); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                        <Icon path={Icons.Edit2} size={16}/> Tour Aanpassen.
                    </button>
                </>
            )}
            <button onClick={() => { setShowStatsModal(true); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                <Icon path={Icons.PieChart} size={16}/> Statistieken.
            </button>
            <button onClick={() => { setShowLogModal(true); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                <Icon path={Icons.LogBook} size={16}/> Logboek.
            </button>
            <button onClick={() => { setShowShareModal(true); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                <Icon path={Icons.Share} size={16}/> Delen.
            </button>
            <button onClick={() => { setShowExportBackupModal(true); setShowProfileMenu(false); }} className={CX_MENU_ITEM}>
                <Icon path={Icons.Download} size={16}/> Export & Back-up.
            </button>
            <button onClick={handlePrint} className={CX_MENU_ITEM}>
                <Icon path={Icons.Printer} size={16}/> Print.
            </button>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 mt-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-stone-50 dark:border-stone-700 transition-colors">
                <Icon path={Icons.LogOut} size={16}/> {t('profile_logout')}
            </button>
        </div>
    );

    const switchableAccounts = mySharedAccounts.map(s => ({ id: s.ownerId, email: s.ownerEmail }));

    // ===== RENDER =====
    return (
        <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-[#1c1917] font-sans text-stone-800 dark:text-stone-100 transition-colors duration-300">
             {notification && (
                <Toast 
                    message={notification.msg} 
                    type={notification.type} 
                    key={notification.id}
                    onClose={() => setNotification(null)}
                />
            )}

            <header className="bg-white/80 dark:bg-[#1c1917]/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-stone-200 dark:border-stone-800 print:hidden transition-colors duration-300">
                <input ref={backupFileInputRef} type="file" accept="application/json" onChange={importBackupFile} className="hidden" />
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-500 hover:scale-105 transition-transform cursor-default flex-shrink-0">Voorraad.</h1>

                        <nav className="hidden lg:flex items-center gap-1 bg-white/40 dark:bg-stone-800/40 backdrop-blur-md border border-white/50 dark:border-stone-700/50 s6hadow-sm rounded-full p-1 flex-shrink-0">
                            <button onClick={() => { setActiveTab('vriezer'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab==='vriezer' ? 'bg-white dark:bg-stone-700 shadow-sm text-purple-600 dark:text-purple-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}><Icon path={Icons.Snowflake} size={16}/> {t('nav_vriezer_full')}</button>
                            {(!myHiddenTabs.includes('frig') || isAdmin) && (
                                <button onClick={() => { setActiveTab('frig'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 relative ${activeTab==='frig' ? 'bg-white dark:bg-stone-700 shadow-sm text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}>
                                    <Icon path={Icons.Fridge} size={16}/> {t('nav_frig_full')}
                                    {isAdmin && managedUserHiddenTabs.includes('frig') && <Icon path={Icons.Lock} size={11} className="text-stone-400"/>}
                                </button>
                            )}
                            {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                                <button onClick={() => { setActiveTab('voorraad'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 relative ${activeTab==='voorraad' ? 'bg-white dark:bg-stone-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}>
                                    <Icon path={Icons.Box} size={16}/> {t('nav_voorraad_full')}
                                    {isAdmin && managedUserHiddenTabs.includes('voorraad') && <Icon path={Icons.Lock} size={11} className="text-stone-400"/>}
                                </button>
                            )}
                            {(!myHiddenTabs.includes('weekmenu') || isAdmin) && (
                                <button onClick={() => { setActiveTab('weekmenu'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); setWeekOffset(0); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 relative ${activeTab==='weekmenu' ? 'bg-white dark:bg-stone-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}>
                                    <Icon path={Icons.Calendar} size={16}/> {t('nav_weekmenu_full')}
                                    {isAdmin && managedUserHiddenTabs.includes('weekmenu') && <Icon path={Icons.Lock} size={11} className="text-stone-400"/>}
                                </button>
                            )}
                            {(!myHiddenTabs.includes('recepten') || isAdmin) && (
                                <button onClick={() => { setActiveTab('recepten'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab==='recepten' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}>
                                    <Icon path={Icons.BookOpen} size={16}/> {t('nav_recepten_full')}
                                </button>
                            )}
                        </nav>
                    </div>
                    <div className="flex gap-2 relative flex-shrink-0">
                        <button onClick={() => { setSelectedLocatieForBeheer(null); setBeheerdeUserId(beheerdeUserId); setShowBeheerModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all hover:shadow-md active:scale-95" title="Instellingen"><Icon path={Icons.Settings}/></button>

                        <button onClick={() => setShowShoppingModal(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-50/50 dark:bg-stone-800 border dark:border-stone-700 relative hover:bg-teal-100 dark:hover:bg-stone-700 transition-all hover:shadow-md active:scale-95 text-teal-600 dark:text-teal-400" title="Boodschappenlijst">
                            <Icon path={Icons.ShoppingCart}/>
                            {shoppingList.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-tr from-red-500 to-pink-500 rounded-full text-[10px] text-white flex items-center justify-center border border-white dark:border-[#1c1917] font-bold shadow-sm animate-pulse">
                                    {shoppingList.length}
                                </span>
                            )}
                        </button>
                        
                        {myShowHelpButton && (
                            <button onClick={() => { setOnboardingStep(0); setShowOnboarding(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-200 relative hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/50 transition-all hover:shadow-md active:scale-95 shadow-sm" title="Hulp & Rondleiding">
                                <Icon path={Icons.HelpCircle}/>
                            </button>
                        )}
                        
<button onClick={() => setShowWhatsNew(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800 border dark:border-stone-700 relative hover:bg-stone-100 dark:hover:bg-stone-700 transition-all hover:shadow-md active:scale-95" title="Meldingen"><Icon path={Icons.Info}/>{alerts.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-stone-800"></span>}</button>
                        
                        {isAdmin && user && beheerdeUserId !== user.uid && (
                            <div className="relative">
                                <button onClick={() => setShowSwitchMenu(!showSwitchMenu)} className="w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-95 shadow-sm bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50" title="Gedeeld account (Wissel terug)">
                                    <Icon path={Icons.Users} size={18}/>
                                </button>
                                {showSwitchMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-stone-800/95 backdrop-blur-md rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Beherend als</p>
                                        <div className="px-4 py-2 text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                                            <Icon path={Icons.Check} size={16} /> 
                                            <span className="truncate flex-grow">{(usersList.find(u => u.id === beheerdeUserId) || {}).email || 'Ander account'}</span>
                                        </div>
                                        <div className="border-t border-stone-100 dark:border-stone-700 my-1"></div>
                                        <button onClick={() => { setBeheerdeUserId(user.uid); setShowSwitchMenu(false); showNotification('Terug naar je eigen account.', 'success'); }} className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700">
                                            <Icon path={Icons.Home} size={16} /> 
                                            <span className="truncate flex-grow">Terug naar mijn account</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="relative hidden lg:block">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-700 hover:border-teal-500 dark:hover:border-teal-500 transition-all active:scale-95 shadow-sm">
                                {user.photoURL ? <img src={user.photoURL} alt="Profiel" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400"><Icon path={Icons.User} size={20}/></div>}
                            </button>
                            {showProfileMenu && renderProfileMenu('right-0 mt-2 animate-in fade-in slide-in-from-top-2 duration-200')}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 space-y-4 flex-grow w-full pb-32 lg:pb-20 relative">
                {pendingInvites.length > 0 && pendingInvites.map(invite => (
                    <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 print:hidden">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                                <Icon path={Icons.Users} size={18}/>
                            </div>
                            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 min-w-0">
                                <span className="font-bold">{invite.ownerEmail}</span> nodigt je uit om mee te beheren.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => acceptShareInvite(invite)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm">Accepteren</button>
                            <button onClick={() => declineShareInvite(invite)} className="px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold rounded-lg border border-stone-200 dark:border-stone-700 transition-all active:scale-95">Weigeren</button>
                        </div>
                    </div>
                ))}

                {activeTab !== 'weekmenu' && activeTab !== 'recepten' && (locatieGroepen.length > 1 || showAddLocatieGroep) && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide print:hidden pb-1">
                        {locatieGroepen.map(groep => (
                            <button key={groep} onClick={() => setActiveLocatieGroep(groep)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${activeLocatieGroep === groep ? 'bg-teal-600 text-white shadow-sm' : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}>
                                <Icon path={Icons.Home} size={12} className="inline -mt-0.5 mr-1"/>{groep}
                            </button>
                        ))}
                        {showAddLocatieGroep ? (
                            <form onSubmit={(e) => { e.preventDefault(); const naam = newLocatieGroepNaam.trim(); if (naam) { setActiveLocatieGroep(naam); setNewLocatieGroepNaam(''); setShowAddLocatieGroep(false); showNotification(`Locatiegroep "${naam}" aangemaakt — voeg er nu een locatie aan toe.`, 'success'); } }} className="flex items-center gap-1 flex-shrink-0">
                                <input autoFocus value={newLocatieGroepNaam} onChange={e => setNewLocatieGroepNaam(e.target.value)} placeholder="Vakantiehuis..." className="w-32 px-2 py-1.5 text-xs rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 outline-none focus:ring-2 focus:ring-teal-500" />
                                <button type="submit" className="p-1.5 bg-teal-600 text-white rounded-full active:scale-95"><Icon path={Icons.Check} size={12}/></button>
                                <button type="button" onClick={() => setShowAddLocatieGroep(false)} className="p-1.5 text-stone-400 rounded-full active:scale-95"><Icon path={Icons.X} size={12}/></button>
                            </form>
                        ) : (
                            <button onClick={() => setShowAddLocatieGroep(true)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500 hover:border-teal-400 hover:text-teal-600 transition-all active:scale-95">
                                <Icon path={Icons.Plus} size={12} className="inline -mt-0.5 mr-1"/>Nieuwe locatie
                            </button>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-3 print:hidden">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
                        <div className="flex-shrink-0 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-stone-200/50 dark:border-stone-700/50 shadow-sm text-sm font-bold">{activeItems.length} {t('items_label')}</div>
                        {filteredLocaties.map(l => <div key={l.id} className="flex-shrink-0 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-stone-200/50 dark:border-stone-700/50 shadow-sm text-sm font-medium">{items.filter(i=>i.vriezerId===l.id).length} {l.naam}</div>)}
                    </div>

                    {activeTab !== 'weekmenu' && activeTab !== 'recepten' && (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                        <div className="flex gap-2 flex-grow">
                            <div className="relative group flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon path={Icons.Search} size={18} className="text-stone-400"/></div>
                                <input type="text" className="block w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm focus:ring-2 focus:ring-teal-500 outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 shadow-sm transition-all text-sm" placeholder={t('search_placeholder')} value={search} onChange={e=>setSearch(e.target.value)}/>
                            </div>
                            
                            <button onClick={() => setShowFilterModal(true)} className={`flex-none w-10 sm:w-auto sm:px-4 rounded-xl border transition-all flex items-center justify-center gap-2 relative shadow-sm hover:shadow-md active:scale-95 ${activeCategoryFilter || sortBy !== 'name' ? 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-900/40 dark:border-teal-800 dark:text-teal-400' : 'bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`} title="Filter & Sorteer">
                                <Icon path={Icons.Filter} size={18} />
                                <span className="hidden sm:inline font-medium text-sm">{t('btn_filter')}</span>
                                {(activeCategoryFilter || sortBy !== 'name') && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full border border-white dark:border-stone-800 sm:hidden translate-x-1 -translate-y-1"></span>}
                            </button>

                            <button onClick={() => setIsBulkMode(!isBulkMode)} className={`flex-none w-10 sm:w-auto sm:px-4 rounded-xl border transition-all flex items-center justify-center gap-2 relative shadow-sm hover:shadow-md active:scale-95 ${isBulkMode ? 'bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-900/50 dark:border-indigo-500 dark:text-indigo-300' : 'bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`} title="Meerdere selecteren (Bulk Acties)">
                                <Icon path={Icons.CheckSquare} size={18} />
                                <span className="hidden sm:inline font-medium text-sm">{t('btn_select')}</span>
                            </button>
                                    
                            <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className={`flex-none w-10 sm:w-auto sm:px-4 rounded-xl border transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 ${viewMode === 'calendar' ? 'bg-teal-100 border-teal-300 text-teal-600 dark:bg-teal-900/50 dark:border-teal-500 dark:text-teal-300' : 'bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`} title={viewMode === 'list' ? 'Wissel naar Kalender' : 'Wissel naar Lijst'}>
                                <Icon path={viewMode === 'list' ? Icons.Calendar : Icons.LayoutDashboard} size={18} />
                                <span className="hidden sm:inline font-medium text-sm">{viewMode === 'list' ? t('btn_calendar') : t('btn_list')}</span>
                            </button>
                                    
                            <button onClick={() => setShowRapidEntry(!showRapidEntry)} className="flex-none w-10 sm:w-auto sm:px-4 rounded-xl border transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 text-amber-600 dark:from-yellow-900/50 dark:to-amber-900/50 dark:border-yellow-500 dark:text-yellow-300" title="Snelle Invoer">
                            <Icon path={Icons.Lightning} size={18} />
                            <span className="hidden sm:inline font-medium text-sm">{t('btn_rapid')}</span>
                            </button>        
                        </div>
                        
                        <button onClick={toggleAll} className="flex-none bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border border-stone-200 dark:border-stone-700 px-4 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 whitespace-nowrap text-center shadow-sm hover:shadow-md transition-all active:scale-95">
                            {collapsedLades.size > 0 ? t('all_open') : t('all_closed')}
                        </button>
                    </div>
)}
                </div>
{/* Snelle Invoer Balk */}
                {showRapidEntry && (
                    <div className="w-full bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-300 dark:border-yellow-600 rounded-xl p-3 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <Icon path={Icons.Lightning} size={20} className="text-amber-500 flex-shrink-0" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Typ een product en druk op Enter..." 
                            className="flex-grow bg-transparent outline-none font-bold text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm"
                            value={rapidEntryText}
                            onChange={(e) => setRapidEntryText(e.target.value)}
                            onKeyDown={async (e) => {
if (e.key === 'Enter' && rapidEntryText.trim()) {
                                    e.preventDefault();
                                    
                                    const info = analyzeProductName(rapidEntryText.trim()) || { cat: null, emoji: null, dagenHoudbaar: null };
                                    const fallbackCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
                                    
                                    let tht = null;
                                    if (info.dagenHoudbaar && (activeTab === 'frig' || activeTab === 'voorraad')) {
                                        const d = new Date();
                                        d.setDate(d.getDate() + info.dagenHoudbaar);
                                        tht = d;
                                    }

                                    try {
                                        // 1. Zoek of maak "Ongesorteerd" locatie (binnen de huidige tab)
                                        let ongesorteerdLoc = vriezers.find(v => v.naam.toLowerCase() === 'ongesorteerd' && v.type === activeTab);
                                        let locId = ongesorteerdLoc ? ongesorteerdLoc.id : null;
                                        let locNaam = 'Ongesorteerd';

                                        if (!locId) {
                                            const newLocRef = await db.collection('vriezers').add({
                                                naam: 'Ongesorteerd',
                                                type: activeTab,
                                                userId: beheerdeUserId,
                                                color: 'gray',
                                                order: -1 // Zet hem bovenaan de lijst
                                            });
                                            locId = newLocRef.id;
                                        }

                                        // 2. Zoek of maak "Ongesorteerd" lade in deze locatie
                                        let ongesorteerdLade = lades.find(l => l.vriezerId === locId && l.naam.toLowerCase() === 'ongesorteerd');
                                        let ladeId = ongesorteerdLade ? ongesorteerdLade.id : null;
                                        let ladeNaam = 'Ongesorteerd';

                                        if (!ladeId) {
                                            const newLadeRef = await db.collection('lades').add({
                                                naam: 'Ongesorteerd',
                                                vriezerId: locId,
                                                userId: beheerdeUserId
                                            });
                                            ladeId = newLadeRef.id;
                                        }

                                        // 3. Voeg het product toe aan de "Ongesorteerd" locatie en lade
                                        await db.collection('items').add({
                                            naam: rapidEntryText.trim(),
                                            aantal: 1,
                                            eenheid: 'stuks',
                                            categorie: info.cat || fallbackCat,
                                            emoji: info.emoji || '📦',
                                            vriezerId: locId,
                                            ladeId: ladeId,
                                            ladeNaam: ladeNaam,
                                            minimumVoorraad: null,
                                            prijs: null,
                                            ingevrorenOp: new Date(),
                                            houdbaarheidsDatum: tht,
                                            notitie: '',
                                            userId: beheerdeUserId
                                        });
                                        
                                        await logAction('Toevoegen', rapidEntryText.trim(), `Snel ingevoerd in ${locNaam} (${ladeNaam})`, user, beheerdeUserId);
                                        
                                        showNotification(`${rapidEntryText.trim()} razendsnel toegevoegd aan Ongesorteerd!`, 'success');
                                        setRapidEntryText('');
                                    } catch (err) {
                                        showNotification("Fout bij snel toevoegen: " + err.message, "error");
                                    }
                                }
                            }}
                        />
                        {rapidEntryText && (
                            <span className="text-[10px] uppercase font-bold text-amber-500/80 dark:text-amber-400/80 mr-1 flex-shrink-0 animate-pulse tracking-wide bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                                Druk Enter
                            </span>
                        )}
                    </div>
                )}
                
                {isBulkMode && (
                    <div className="sticky top-[68px] z-20 bg-gradient-to-r from-indigo-600 to-teal-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between flex-wrap gap-2 animate-in fade-in slide-in-from-top-4 border border-white/10 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setIsBulkMode(false); setSelectedBulkItems(new Set()); }} className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95" title="Annuleren"><Icon path={Icons.X} size={18}/></button>
                            <span className="font-bold text-sm">{selectedBulkItems.size} geselecteerd</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={handleFindRecipe} disabled={selectedBulkItems.size === 0} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all active:scale-95 ${selectedBulkItems.size > 0 ? 'bg-green-500 hover:bg-green-400 text-white shadow-sm' : 'bg-indigo-400/50 text-indigo-200 cursor-not-allowed'}`}>
                                <Icon path={Icons.Utensils} size={14}/> <span className="hidden sm:inline">Zoek Recept</span>
                            </button>
                            <button onClick={handleBulkDelete} disabled={selectedBulkItems.size === 0} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all active:scale-95 ${selectedBulkItems.size > 0 ? 'bg-red-500 hover:bg-red-400 text-white shadow-sm' : 'bg-indigo-400/50 text-indigo-200 cursor-not-allowed'}`}>
                                <Icon path={Icons.Trash2} size={14}/> <span className="hidden sm:inline">Verwijderen</span>
                            </button>
                            <button onClick={openBulkMoveModal} disabled={selectedBulkItems.size === 0} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all active:scale-95 ${selectedBulkItems.size > 0 ? 'bg-indigo-800 hover:bg-indigo-700 text-white shadow-sm' : 'bg-indigo-400/50 text-indigo-200 cursor-not-allowed'}`}>
                                <Icon path={Icons.Box} size={14}/> <span className="hidden sm:inline">Verplaatsen</span>
                            </button>
                        </div>
                    </div>
                )}

{activeTab === 'recepten' ? (
    <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-center pb-3 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">Mijn Recepten.</h2>
            <button onClick={() => {
                setEditingRecipe(null);
                setRecipeFormData({naam: '', fotoUrl: '', personen: 4, categorie: 'Hoofdgerecht', ingredienten: [], stappen: []});
                setShowRecipeModal(true);
            }} className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 text-sm">
                <Icon path={Icons.Plus} size={16} /> Recept
            </button>
        </div>

        {Object.entries(recepten.reduce((acc, r) => { (acc[r.categorie || 'Ander'] = acc[r.categorie || 'Ander'] || []).push(r); return acc; }, {})).map(([cat, recs]) => (
            <div key={cat} className="mb-6">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-3">{cat}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {recs.map(r => (
                        <div key={r.id} onClick={() => { setEditingRecipe(r); setViewRecipePersons(r.personen || 4); setShowRecipeViewModal(true); }} className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-xl shadow-sm border border-stone-200/50 dark:border-stone-700/50 overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-300 flex flex-col aspect-square group relative">
                            {r.fotoUrl ? (
                                <div className="h-2/3 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{backgroundImage: `url(${r.fotoUrl})`}}></div>
                            ) : (
                                <div className="h-2/3 w-full bg-stone-100/50 dark:bg-stone-700/50 flex items-center justify-center text-stone-400 transition-transform duration-500 group-hover:scale-110">
                                    <Icon path={Icons.Utensils} size={24} />
                                </div>
                            )}
                            <div className="h-1/3 p-2 flex items-center justify-center text-center bg-white dark:bg-stone-800 z-10">
                                <span className="font-medium text-xs text-stone-900 dark:text-stone-100 line-clamp-2 leading-tight">{r.naam}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Recept verwijderen?')) db.collection('recepten').doc(r.id).delete(); }} className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 backdrop-blur-sm">
                                <Icon path={Icons.Trash2} size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        ))}
{recepten.length === 0 && <p className="text-center text-stone-500 italic py-8 text-sm">Nog geen recepten toegevoegd...</p>}
    </div>
) : activeTab === 'weekmenu' ? (() => {
                    const baseDate = new Date();
                    const dayNum = baseDate.getDay() || 7; 
                    baseDate.setHours(0,0,0,0);
                    baseDate.setDate(baseDate.getDate() - dayNum + 1 + (weekOffset * 7));
                    
                    const weekDays = Array.from({length: 7}).map((_, i) => {
                        const d = new Date(baseDate);
                        d.setDate(baseDate.getDate() + i);
                        return d;
                    });

                    return (
                        <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in duration-300 print:block">
                            <div className="flex-1 space-y-3 print:w-full">
                                <div className="flex items-center justify-between mb-2 border-b border-stone-200 dark:border-stone-800 pb-3">
                                    <div>
                                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500 print:text-black">
                                            {weekOffset === 0 ? 'Deze Week.' : weekOffset === 1 ? 'Volgende Week.' : `Week ${weekOffset}`}
                                        </h2>
                                        <p className="text-stone-500 dark:text-stone-400 text-xs print:hidden">Sleep producten of voeg zelf gerechten toe.</p>
                                    </div>
                                    <div className="flex gap-1.5 print:hidden bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-stone-100 dark:border-stone-700">
                                        <button onClick={() => window.print()} className="p-1.5 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 transition-colors flex items-center gap-1 mr-1 font-medium text-xs" title="Print Weekmenu">
                                            <Icon path={Icons.Printer} size={14} /> <span className="hidden sm:inline">Print</span>
                                        </button>
                                        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 rounded-md bg-stone-50 hover:bg-stone-100 dark:bg-stone-700/50 dark:hover:bg-stone-600 transition-colors" title="Vorige Week">
                                            <Icon path={Icons.ChevronRight} size={16} className="rotate-180 text-stone-600 dark:text-stone-300" />
                                        </button>
                                        <button onClick={() => setWeekOffset(0)} className="px-3 rounded-md font-medium text-xs bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 dark:from-pink-900/30 dark:to-rose-900/30 dark:text-pink-300 hover:shadow-sm transition-all">
                                            Vandaag
                                        </button>
                                        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1.5 rounded-md bg-stone-50 hover:bg-stone-100 dark:bg-stone-700/50 dark:hover:bg-stone-600 transition-colors" title="Volgende Week">
                                            <Icon path={Icons.ChevronRight} size={16} className="text-stone-600 dark:text-stone-300" />
                                        </button>
                                    </div>
                                </div>
                                
                                {weekDays.map(dateObj => {
                                    const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                                    const itemsOpDag = items.filter(i => i.geplandeDatum === dateString);
                                    
                                    const dayName = dateObj.toLocaleDateString('nl-BE', { weekday: 'long' });
                                    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                    const visualDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                                    
                                    const isToday = new Date().toDateString() === dateObj.toDateString();
                                    
                                    return (
                                        <div 
                                            key={dateString}
                                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                            onDrop={async (e) => {
                                                e.preventDefault();
                                                if (draggedMenuItem) {
                                                    await db.collection('items').doc(draggedMenuItem).update({ geplandeDatum: dateString });
                                                    setDraggedMenuItem(null);
                                                }
                                            }}
                                            className={`bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm p-4 rounded-xl border-2 border-dashed ${isToday ? 'border-pink-400 dark:border-pink-500 bg-pink-50/40 dark:bg-pink-900/10 shadow-sm' : 'border-stone-200 dark:border-stone-700'} min-h-[100px] transition-all hover:border-pink-300 dark:hover:border-pink-600/50 print:border-stone-400 print:bg-transparent print:break-inside-avoid print:p-2 print:min-h-0`}
                                        >
<div className="flex justify-between items-center mb-3 border-b border-stone-100 dark:border-stone-700 pb-2 print:mb-1 print:pb-1">
                                                <h4 className={`text-base font-bold tracking-tight ${isToday ? 'text-pink-600 dark:text-pink-400 print:text-black' : 'text-stone-800 dark:text-stone-200 print:text-black'}`}>
                                                    {dayNameCap}
                                                </h4>
                                                <span className={`text-xs font-bold ${isToday ? 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 px-2.5 py-0.5 rounded-md dark:from-pink-900/30 dark:to-rose-900/30 dark:text-pink-300 print:bg-transparent print:text-stone-500' : 'text-stone-400 print:text-stone-500'}`}>
                                                    {isToday ? (
                                                        <>
                                                            <span className="print:hidden">Vandaag ({visualDate})</span>
                                                            <span className="hidden print:inline">{visualDate}</span>
                                                        </>
                                                    ) : (
                                                        visualDate
                                                    )}
                                                </span>
                                            </div>
                                            <div className="space-y-2 print:space-y-1">
                                                {itemsOpDag.length === 0 ? (
                                                    <p className="text-xs text-stone-400 italic print:hidden">Niks gepland...</p>
                                                ) : (
                                                    itemsOpDag.map(item => (
                                                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-700/80 rounded-lg border border-pink-100 dark:border-pink-800/50 shadow-sm hover:shadow-md transition-shadow print:bg-transparent print:shadow-none print:border-stone-300 print:p-1 group">
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <span className="text-xl drop-shadow-sm">{item.emoji || '📦'}</span>
                                                                <div>
                                                                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate print:text-black">{item.naam}</p>
                                                                    {item.vriezerId !== 'custom_menu' && (
                                                                        <p className="text-[10px] text-stone-500"><span className="font-medium">{formatAantal(item.aantal)}</span> <span className="font-normal">{item.eenheid}</span></p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (item.vriezerId === 'custom_menu') {
                                                                        await db.collection('items').doc(item.id).delete();
                                                                    } else {
                                                                        await db.collection('items').doc(item.id).update({ geplandeDatum: null });
                                                                    }
                                                                }} 
                                                                className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all print:hidden opacity-100 sm:opacity-0 group-hover:opacity-100"
                                                                title="Verwijder van planning"
                                                            >
                                                                <Icon path={Icons.X} size={16}/>
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                                
                                                <div className="pt-2 mt-2 border-t border-stone-100 dark:border-stone-700 print:hidden">
                                                    <input 
                                                        type="text" 
                                                        placeholder="+ Typ gerecht en druk Enter..." 
                                                        className="w-full text-xs font-medium p-2 rounded-lg bg-stone-50/50 dark:bg-stone-900/50 dark:text-white border border-stone-200 dark:border-stone-700 focus:ring-1 focus:ring-pink-400 outline-none transition-all placeholder-stone-400"
                                                        value={customMenuInput.date === dateString ? customMenuInput.text : ''}
                                                        onChange={(e) => setCustomMenuInput({ date: dateString, text: e.target.value })}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter' && customMenuInput.text.trim() && customMenuInput.date === dateString) {
                                                                e.preventDefault();
                                                                try {
                                                                    await db.collection('items').add({
                                                                        naam: customMenuInput.text.trim(),
                                                                        aantal: 1,
                                                                        eenheid: 'stuks',
                                                                        vriezerId: 'custom_menu', 
                                                                        ladeId: '',
                                                                        categorie: 'Menu',
                                                                        emoji: '🍽️',
                                                                        geplandeDatum: dateString,
                                                                        ingevrorenOp: new Date().toISOString().split('T')[0],
                                                                        userId: beheerdeUserId
                                                                    });
                                                                    setCustomMenuInput({ date: '', text: '' });
                                                                } catch (err) {
                                                                    showNotification("Fout bij toevoegen", "error");
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="w-full lg:w-1/3 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md p-4 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 h-fit sticky top-[80px] shadow-sm print:hidden">
                                <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100 mb-1 tracking-tight">Beschikbaar</h3>
                                <p className="text-xs text-stone-500 mb-3">Vriezer & Koelkast</p>
                                
                                <div className="relative mb-3">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <Icon path={Icons.Search} size={14} className="text-stone-400"/>
                                    </div>
                                    <input 
                                        type="text" 
                                        className="block w-full pl-8 pr-8 py-2 text-xs font-medium border border-stone-200 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:ring-1 focus:ring-pink-500 transition-all" 
                                        placeholder="Zoek in beschikbare producten..." 
                                        value={menuSearch} 
                                        onChange={e => setMenuSearch(e.target.value)}
                                    />
                                    {menuSearch && (
                                        <button type="button" onClick={() => setMenuSearch('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600 active:scale-95 transition-transform">
                                            <Icon path={Icons.X} size={14} />
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {items
                                        .filter(i => !i.geplandeDatum) 
                                        .filter(i => {
                                            const loc = vriezers.find(v => v.id === i.vriezerId);
                                            return loc && (loc.type === 'vriezer' || loc.type === 'frig');
                                        })
                                        .filter(i => i.naam.toLowerCase().includes(menuSearch.toLowerCase()))
                                        .sort((a, b) => a.naam.localeCompare(b.naam))
                                        .map(item => (
                                            <div 
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggedMenuItem(item.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                }}
                                                onDragEnd={() => setDraggedMenuItem(null)}
                                                className="flex items-center gap-2.5 p-2 bg-white dark:bg-stone-700/80 rounded-lg border border-stone-100 dark:border-stone-600 cursor-grab active:cursor-grabbing hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-sm transition-all shadow-sm group"
                                            >
                                                <div className="text-stone-300 group-hover:text-stone-400 transition-colors cursor-grab">
                                                    <Icon path={Icons.GripVertical} size={14}/>
                                                </div>
                                                <span className="text-xl drop-shadow-sm">{item.emoji || '📦'}</span>
                                                <div className="truncate">
                                                    <p className="font-medium text-xs text-stone-800 dark:text-stone-100 truncate">{item.naam}</p>
                                                    <p className="text-[10px] text-stone-500"><span className="font-bold">{formatAantal(item.aantal)}</span> <span className="font-normal">{item.eenheid}</span></p>
                                                </div>
                                            </div>
                                    ))}
                                    {items.filter(i => !i.geplandeDatum && (vriezers.find(v => v.id === i.vriezerId)?.type === 'vriezer' || vriezers.find(v => v.id === i.vriezerId)?.type === 'frig') && i.naam.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 && (
                                        <p className="text-xs text-center text-stone-400 italic py-4">Geen resultaten gevonden...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })() : isSearching && totalFoundItemsInActiveTab === 0 ? (
                    <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-stone-200/50 dark:border-stone-700/50 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Icon path={Icons.Search} size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2 tracking-tight">Niks gevonden voor "{search}"</h3>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 font-medium">
                            Je hebt dit product niet meer op voorraad in de sectie <span className="font-bold text-stone-800 dark:text-stone-200 capitalize">{activeTab}</span>.
                        </p>
                        <button onClick={async () => {
                            try {
                                await db.collection('shoppingList').add({ 
                                    naam: search, 
                                    aantal: 1, 
                                    eenheid: 'stuks', 
                                    winkel: '', 
                                    checked: false, 
                                    userId: beheerdeUserId 
                                });
                                showNotification(`"${search}" toegevoegd aan je boodschappenlijst!`, 'success');
                                setSearch('');
                            } catch(err) {
                                showNotification("Kon product niet toevoegen.", "error");
                            }
                        }} className="bg-gradient-to-r from-teal-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 text-sm">
                            <Icon path={Icons.ShoppingCart} size={18} />
                            Zet "{search}" op het lijstje
                        </button>
                    </div>
) : (
                    viewMode === 'calendar' ? (
                        <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-stone-200/50 dark:border-stone-700/50 animate-in fade-in duration-300">
                            <div className="mb-6 border-b border-stone-100 dark:border-stone-700 pb-3">
                                <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">Vervaldatums & Planning</h3>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Chronologisch overzicht van producten binnen de huidige sectie (<span className="font-bold capitalize">{activeTab}</span>).</p>
                            </div>

                            {(() => {
                                const calendarItems = activeItems.map(item => {
                                    let eventDate = null;
                                    let resterendeDagen = 999;

                                    if (item.houdbaarheidsDatum) {
                                        eventDate = item.houdbaarheidsDatum.toDate ? item.houdbaarheidsDatum.toDate() : new Date(item.houdbaarheidsDatum);
                                        resterendeDagen = getDagenTotTHT(item.houdbaarheidsDatum);
                                    } else if (activeTab === 'vriezer' && item.ingevrorenOp) {
                                        const invriesDatum = item.ingevrorenOp.toDate ? item.ingevrorenOp.toDate() : new Date(item.ingevrorenOp);
                                        eventDate = new Date(invriesDatum);
                                        eventDate.setDate(eventDate.getDate() + 180);
                                        
                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        eventDate.setHours(0,0,0,0);
                                        resterendeDagen = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                                    }

                                    return { ...item, eventDate, resterendeDagen };
                                }).filter(item => item.eventDate !== null); 

                                if (calendarItems.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-stone-400 dark:text-stone-500 italic text-sm">
                                            Geen producten met een vervaldatum of invriesdatum gevonden in deze sectie.
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {calendarItems
                                            .sort((a, b) => a.resterendeDagen - b.resterendeDagen)
                                            .map(item => {
                                                let borderStyle = "border-l-[4px] border-transparent";
                                                if (item.resterendeDagen < 0) borderStyle = "border-l-[4px] border-red-500 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20";
                                                else if (item.resterendeDagen <= 7) borderStyle = "border-l-[4px] border-orange-400 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20";
                                                else if (item.resterendeDagen <= 30) borderStyle = "border-l-[4px] border-yellow-400 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20";

                                                return (
                                                    <div key={item.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border border-stone-100/50 dark:border-stone-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${borderStyle}`}>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-lg border border-stone-200/80 dark:border-stone-700 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                                                                <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider leading-none mt-0.5">
                                                                    {item.eventDate.toLocaleString('nl-BE', { month: 'short' })}
                                                                </span>
                                                                <span className="text-lg font-black text-stone-800 dark:text-white leading-none my-0.5">
                                                                    {item.eventDate.getDate()}
                                                                </span>
                                                                <span className="text-[8px] font-medium text-stone-400 dark:text-stone-500 leading-none mb-0.5">
                                                                    {item.eventDate.getFullYear()}
                                                                </span>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm sm:text-base text-stone-900 dark:text-white whitespace-normal sm:truncate leading-tight flex items-center gap-2">
                                                                    <span className="text-xl flex-shrink-0 drop-shadow-sm">{item.emoji || '📦'}</span>
                                                                    <span>{item.naam}</span>
                                                                </p>
                                                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                                                    Aantal: <span className="font-bold text-stone-800 dark:text-stone-200">{formatAantal(item.aantal)}</span> <span className="font-normal">{item.eenheid}</span>
                                                                    {item.ladeNaam && ` • ${item.ladeNaam}`}
                                                                    {activeTab === 'vriezer' && <span className="text-stone-400 dark:text-stone-500 italic"> (Ingevroren: {formatDate(item.ingevrorenOp)})</span>}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex-shrink-0 ml-3 flex flex-col items-end">
                                                            {item.resterendeDagen < 0 ? (
                                                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm border border-red-100 dark:border-red-800/50">
                                                                    {activeTab === 'vriezer' ? 'Te Oud' : 'Verlopen'}
                                                                </span>
                                                            ) : item.resterendeDagen === 0 ? (
                                                                <span className="text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm animate-pulse border border-orange-400">
                                                                    Vandaag!
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded-md border border-stone-200 dark:border-stone-600 shadow-sm">
                                                                    Nog {item.resterendeDagen} {item.resterendeDagen === 1 ? 'dag' : 'dagen'}
                                                                </span>
                                                            )}
                                                            <div className="mt-2 flex justify-end gap-1.5">
                                                                <button onClick={() => initConsume(item)} className="p-1.5 text-orange-500 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-600 shadow-sm hover:shadow-md hover:border-orange-300 transition-all active:scale-95" title="Verbruik">
                                                                    <Icon path={Icons.Minus} size={14}/>
                                                                </button>
                                                                <button onClick={() => openEdit(item)} className="p-1.5 text-teal-500 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-600 shadow-sm hover:shadow-md hover:border-teal-300 transition-all active:scale-95" title="Bewerk">
                                                                    <Icon path={Icons.Edit2} size={14}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className={`grid gap-5 items-start ${gridClass}`}>
                            {filteredLocaties.map(vriezer => {
                                const gradientKeys = Object.keys(GRADIENTS);
                                let hash = 0;
                                for (let i = 0; i < vriezer.id.length; i++) hash = (hash << 5) - hash + vriezer.id.charCodeAt(i);
                                
                                const colorKey = vriezer.color || gradientKeys[Math.abs(hash) % gradientKeys.length];
                                const gradientClass = GRADIENTS[colorKey] || GRADIENTS.blue;

                                return (
                                    <div key={vriezer.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300 page-break-inside-avoid">
                                        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r ${gradientClass} tracking-tight pl-1`}>{vriezer.naam}</h2>
                                        <div className="space-y-3">
                                            {lades.filter(l => l.vriezerId === vriezer.id).sort((a,b)=>a.naam.localeCompare(b.naam)).map(lade => {
                                                let ladeItems = items.filter(i => i.ladeId === lade.id && smartMatch(i.naam, search));
                                                
                                                if (activeCategoryFilter) {
                                                    ladeItems = ladeItems.filter(i => i.categorie === activeCategoryFilter);
                                                }

                                                ladeItems.sort((a, b) => {
                                                    if (sortBy === 'name') return a.naam.localeCompare(b.naam);
                                                    if (sortBy === 'expiry') {
                                                        const aTHT = getDagenTotTHT(a.houdbaarheidsDatum);
                                                        const bTHT = getDagenTotTHT(b.houdbaarheidsDatum);
                                                        if (aTHT !== bTHT) return aTHT - bTHT;
                                                        return getDagenOud(b.ingevrorenOp) - getDagenOud(a.ingevrorenOp); 
                                                    }
                                                    if (sortBy === 'newest') {
                                                        return getDagenOud(a.ingevrorenOp) - getDagenOud(b.ingevrorenOp);
                                                    }
                                                    return 0;
                                                });

                                                if (ladeItems.length === 0 && (search || activeCategoryFilter)) return null;
                                                const isCollapsed = collapsedLades.has(lade.id) && !search && !activeCategoryFilter;
                                                
                                                return (
                                                    <div key={lade.id} className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-700/50 overflow-hidden page-break-inside-avoid transition-all duration-200">
                                                        <div className="bg-white dark:bg-stone-800 px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex justify-between items-center cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors print:bg-white" onClick={() => toggleLade(lade.id)}>
                                                            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm flex items-center gap-2">
                                                                {isCollapsed ? <Icon path={Icons.ChevronRight} size={18} className="print:hidden text-stone-400"/> : <Icon path={Icons.ChevronDown} size={18} className="print:hidden text-stone-400"/>} 
                                                                {lade.naam} <span className="text-xs font-bold text-stone-500 bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded-full">{ladeItems.length}</span>
                                                            </h3>
                                                            <div className="flex items-center gap-3">
    {/* Dynamische Datum weergave (Laatste wijziging vs Check) ALTIJD ZICHTBAAR */}
    {(() => {
        const checkDate = lade.laatstGecontroleerd ? (lade.laatstGecontroleerd.toDate ? lade.laatstGecontroleerd.toDate() : new Date(lade.laatstGecontroleerd)) : null;
        const modDate = lade.laatstGewijzigd ? (lade.laatstGewijzigd.toDate ? lade.laatstGewijzigd.toDate() : new Date(lade.laatstGewijzigd)) : null;
        
        let displayDate = null;
        let isCheck = true;

        if (checkDate && (!modDate || checkDate >= modDate)) {
            displayDate = checkDate;
            isCheck = true;
        } else if (modDate && (!checkDate || modDate > checkDate)) {
            displayDate = modDate;
            isCheck = false;
        } else if (checkDate) {
            displayDate = checkDate;
            isCheck = true;
        } else if (modDate) {
            displayDate = modDate;
            isCheck = false;
        }

        if (!displayDate) return null;

        return (
            <span className="hidden sm:block text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest print:hidden">
                {isCheck ? 'Check: ' : 'Laatste wijziging: '} {formatDate(displayDate)}
            </span>
        );
    })()}

{/* Controle-knop afhankelijk van instellingen */}
            {(!myHiddenTabs.includes('balans') || isAdmin) && myShowBalans && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setAuditLade(lade); setAuditedItems(new Set()); setAuditItemsToDelete(new Set()); }} 
                    className="text-xs flex items-center gap-1 font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-stone-800 dark:hover:bg-stone-700 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-md shadow-sm transition-all active:scale-95 print:hidden"
                    title="Voorraad-Balans (Snel aftikken)"
                >
                    <Icon path={Icons.CheckSquare} size={14} /> Controle
                </button>
            )}
        </div>
    </div>
    {!isCollapsed && (
                                                            <ul className="block"> 
                                                                {ladeItems.length === 0 ? <li className="p-4 text-center text-stone-400 text-sm font-medium italic">Leeg</li> : 
                                                                ladeItems.map(item => {
                                                                    const dagenOud = getDagenOud(item.ingevrorenOp);
                                                                    const dagenTotTHT = getDagenTotTHT(item.houdbaarheidsDatum);
                                                                    const isStockItem = vriezer.type === 'voorraad' || vriezer.type === 'frig';
                                                                    
                                                                    const isSelected = selectedBulkItems.has(item.id);
                                                                    const bgClass = isBulkMode && isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-transparent';
                                                                    const colorClass = getStatusColor(dagenOud, vriezer.type, dagenTotTHT, item.altijdGoed);
                                                                    const dateColorClass = getDateTextColor(dagenOud, vriezer.type, dagenTotTHT, item.altijdGoed);
                                                                    
                                                                    const catObj = actieveCategorieen.find(c => (c.name || c) === item.categorie);
                                                                    const catColor = catObj ? (catObj.color || 'gray') : 'gray';

                                                                    return (
                                                                        <li 
                                                                            key={item.id} 
                                                                            onClick={() => isBulkMode ? toggleBulkSelection(item.id) : setTappedItemId(tappedItemId === item.id ? null : item.id)}
                                                                            className={`flex items-center justify-between p-3 ${bgClass} ${colorClass} group transition-all duration-200 ${isBulkMode ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : 'cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-700/30'}`}
                                                                        >
                                                                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                                                {isBulkMode && (
                                                                                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-sm' : 'border-stone-300 dark:border-stone-500 bg-white dark:bg-stone-800'}`}>
                                                                                        {isSelected && <Icon path={Icons.Check} size={12} className="text-white"/>}
                                                                                    </div>
                                                                                )}
                                                                                <span className={`text-2xl drop-shadow-sm flex-shrink-0 ${isBulkMode ? 'hidden sm:block' : ''}`}>{item.emoji||'📦'}</span>
                                                                                <div className="min-w-0 flex-grow">
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <p className={`font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 tracking-tight leading-tight transition-all ${tappedItemId === item.id ? 'whitespace-normal' : 'truncate'}`}>{item.naam}</p>
                                                                                        {item.categorie && item.categorie !== "Geen" && (
                                                                                            <Badge type={catColor} text={item.categorie} />
                                                                                        )}
                                                                                        {item.geplandeDatum && (
                                                                                            <Badge type="pink" text={`Menu: ${new Date(item.geplandeDatum).toLocaleDateString('nl-BE', {weekday: 'short', day: '2-digit', month: '2-digit'})}`} />
                                                                                        )}
                                                                                    </div>
                                                                                    {item.tags && item.tags.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                                            {item.tags.map(t => (
                                                                                                <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-stone-100/80 text-stone-600 border border-stone-200/50 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600 shadow-sm">
                                                                                                    {t}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="text-sm text-stone-600 dark:text-stone-400 mt-1 flex flex-wrap items-center gap-x-2">
                                                                                        <span className="font-bold text-stone-800 dark:text-stone-200">{formatAantal(item.aantal)}</span> <span className="font-normal text-stone-600 dark:text-stone-400 ml-0.5">{item.eenheid}</span>
                                                                                        {!isStockItem && <span className={`text-xs ${dateColorClass}`}> • {formatDate(item.ingevrorenOp)}</span>}
                                                                                        {!isStockItem && item.houdbaarheidsDatum && <span className="text-xs text-stone-500 dark:text-stone-500"> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                                                                                        {isStockItem && item.houdbaarheidsDatum && <span className={`text-xs ${dateColorClass}`}> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                                                                                        {item.minimumVoorraad > 0 && <span className="text-[10px] text-orange-600 font-bold px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 shadow-sm">Min: {item.minimumVoorraad}</span>}
                                                                                        {item.prijs > 0 && <span className="text-[10px] text-green-700 font-bold px-1.5 py-0.5 rounded bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800 shadow-sm">€{parseFloat(item.prijs).toFixed(2)}</span>}
                                                                                    </div>
                                                                                    {item.notitie && (
                                                                                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 italic font-medium leading-tight">
                                                                                            {item.notitie}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {!isBulkMode && (
                                                                                <div className={`flex flex-nowrap items-center gap-1 flex-shrink-0 print:hidden transition-all duration-300 overflow-hidden ${tappedItemId === item.id ? 'max-w-[150px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 md:ml-2 md:max-w-[150px] md:opacity-0 md:group-hover:opacity-100'}`}>
                                                                                    <button onClick={(e)=>{e.stopPropagation(); initConsume(item)}} className="p-1.5 text-orange-600 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all hover:scale-105 active:scale-95 shadow-sm border border-orange-100 dark:border-orange-800/50 flex-shrink-0" title="Verbruik"><Icon path={Icons.Minus} size={14}/></button>
                                                                                    <button onClick={(e)=>{e.stopPropagation(); handleDuplicate(item)}} className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all hover:scale-105 active:scale-95 shadow-sm border border-indigo-100 dark:border-indigo-800/50 flex-shrink-0" title="Dupliceer"><Icon path={Icons.Copy} size={14}/></button>
                                                                                    <button onClick={(e)=>{e.stopPropagation(); openEdit(item)}} className="p-1.5 text-teal-600 bg-teal-50 dark:bg-teal-900/30 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all hover:scale-105 active:scale-95 shadow-sm border border-teal-100 dark:border-teal-800/50 flex-shrink-0" title="Bewerken"><Icon path={Icons.Edit2} size={14}/></button>
                                                                                    <button onClick={(e)=>{e.stopPropagation(); initDelete(item)}} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all hover:scale-105 active:scale-95 shadow-sm border border-red-100 dark:border-red-800/50 flex-shrink-0" title="Verwijderen"><Icon path={Icons.Trash2} size={14}/></button>
                                                                                </div>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </main>
<AuditModal auditItemsToDelete={auditItemsToDelete} auditLade={auditLade} auditOriginals={auditOriginals} auditedItems={auditedItems} beheerdeUserId={beheerdeUserId} customUnitsFrig={customUnitsFrig} customUnitsVoorraad={customUnitsVoorraad} customUnitsVries={customUnitsVries} items={items} lades={lades} setAuditItemsToDelete={setAuditItemsToDelete} setAuditLade={setAuditLade} setAuditedItems={setAuditedItems} setFormData={setFormData} setModalType={setModalType} setShowAddModal={setShowAddModal} user={user} vriezers={vriezers} openEdit={openEdit} />
            <BulkMoveModal bulkMoveTarget={bulkMoveTarget} filteredLocaties={filteredLocaties} handleBulkMove={handleBulkMove} items={items} lades={lades} selectedBulkItems={selectedBulkItems} setBulkMoveTarget={setBulkMoveTarget} setShowBulkMoveModal={setShowBulkMoveModal} showBulkMoveModal={showBulkMoveModal} />

<RecipeViewModal editingRecipe={editingRecipe} items={items} setRecipeFormData={setRecipeFormData} setShowRecipeModal={setShowRecipeModal} setShowRecipeViewModal={setShowRecipeViewModal} setViewRecipePersons={setViewRecipePersons} showRecipeViewModal={showRecipeViewModal} viewRecipePersons={viewRecipePersons} />
<RecipeFormModal beheerdeUserId={beheerdeUserId} editingRecipe={editingRecipe} items={items} recepten={recepten} recipeFormData={recipeFormData} setRecipeFormData={setRecipeFormData} setShowRecipeModal={setShowRecipeModal} showNotification={showNotification} showRecipeModal={showRecipeModal} />
                                                                                    
            <ConsumeModal confirmConsume={confirmConsume} consumeAmount={consumeAmount} itemToConsume={itemToConsume} items={items} setConsumeAmount={setConsumeAmount} setShowConsumeModal={setShowConsumeModal} showConsumeModal={showConsumeModal} />

            <FilterModal activeCategoryFilter={activeCategoryFilter} activeTab={activeTab} items={items} mainViewCategories={mainViewCategories} setActiveCategoryFilter={setActiveCategoryFilter} setShowFilterModal={setShowFilterModal} setSortBy={setSortBy} showFilterModal={showFilterModal} sortBy={sortBy} />

            <footer className="bg-transparent border-t border-stone-200/50 dark:border-stone-800/50 py-6 print:hidden transition-colors duration-300 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                         <span className="text-xs font-medium text-stone-400 dark:text-stone-500">&copy;</span>
                         <span className="font-bold text-sm tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-500 drop-shadow-sm">
                             Voorraad.
                         </span>
                         <button onClick={() => setShowVersionHistory(true)} className="text-[10px] font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer border border-teal-100 dark:border-teal-800">
                            v{APP_VERSION}
                        </button>
                    </div>
                    <p className="text-[10px] font-medium text-stone-400 dark:text-stone-500">
                        Beheer je voorraad snel, simpel en met stijl.
                    </p>
                </div>
            </footer>

            {!isBulkMode && (
                <>
                <button onClick={handleOpenAdd} className="hidden lg:flex fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-teal-500 to-indigo-600 text-white rounded-full shadow-lg items-center justify-center z-40 print:hidden hover:scale-105 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-sm"><Icon path={Icons.Plus} size={28}/></button>

                <nav className="fixed left-4 right-4 z-40 print:hidden lg:hidden" style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
                    <div className={`max-w-sm mx-auto flex items-center justify-around bg-white/90 dark:bg-stone-800/90 backdrop-blur-xl rounded-full shadow-xl border border-white/60 dark:border-stone-700/60 transition-all duration-300 ${navCompact ? 'py-1 px-1' : 'py-2 px-2'}`}>
                        <button onClick={() => { setActiveTab('vriezer'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} title={t('tab_vriezer')} className={`flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${activeTab==='vriezer' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'text-stone-400 dark:text-stone-500'}`}>
                            <Icon path={Icons.Snowflake} size={navCompact ? 16 : 19}/>
                        </button>
                        {(!myHiddenTabs.includes('frig') || isAdmin) && (
                            <button onClick={() => { setActiveTab('frig'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} title={t('tab_frig')} className={`relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${activeTab==='frig' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'}`}>
                                <Icon path={Icons.Fridge} size={navCompact ? 16 : 19}/>
                                {isAdmin && managedUserHiddenTabs.includes('frig') && <Icon path={Icons.Lock} size={10} className="absolute top-0.5 right-1 text-stone-400 bg-white dark:bg-stone-900 rounded-full"/>}
                            </button>
                        )}
                        {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                            <button onClick={() => { setActiveTab('voorraad'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} title={t('tab_voorraad')} className={`relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${activeTab==='voorraad' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' : 'text-stone-400 dark:text-stone-500'}`}>
                                <Icon path={Icons.Box} size={navCompact ? 16 : 19}/>
                                {isAdmin && managedUserHiddenTabs.includes('voorraad') && <Icon path={Icons.Lock} size={10} className="absolute top-0.5 right-1 text-stone-400 bg-white dark:bg-stone-900 rounded-full"/>}
                            </button>
                        )}
                        <button onClick={handleOpenAdd} title="Toevoegen" className={`flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-lg border-4 border-white dark:border-stone-800 active:scale-90 transition-all duration-300 ${navCompact ? 'w-9 h-9 -mt-2' : 'w-12 h-12 -mt-5'}`}>
                            <Icon path={Icons.Plus} size={navCompact ? 16 : 22}/>
                        </button>
                        {(!myHiddenTabs.includes('weekmenu') || isAdmin) && (
                            <button onClick={() => { setActiveTab('weekmenu'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); setWeekOffset(0); }} title={t('tab_weekmenu')} className={`relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${activeTab==='weekmenu' ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400' : 'text-stone-400 dark:text-stone-500'}`}>
                                <Icon path={Icons.Calendar} size={navCompact ? 16 : 19}/>
                                {isAdmin && managedUserHiddenTabs.includes('weekmenu') && <Icon path={Icons.Lock} size={10} className="absolute top-0.5 right-1 text-stone-400 bg-white dark:bg-stone-900 rounded-full"/>}
                            </button>
                        )}
                        {(!myHiddenTabs.includes('recepten') || isAdmin) && (
                            <button onClick={() => { setActiveTab('recepten'); setActiveCategoryFilter(null); setIsBulkMode(false); setSelectedBulkItems(new Set()); }} title={t('tab_recepten')} className={`flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${activeTab==='recepten' ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' : 'text-stone-400 dark:text-stone-500'}`}>
                                <Icon path={Icons.BookOpen} size={navCompact ? 16 : 19}/>
                            </button>
                        )}
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} title="Profiel" className={`flex items-center justify-center rounded-full overflow-hidden border-2 transition-all duration-300 active:scale-90 ${navCompact ? 'w-8 h-8' : 'w-10 h-10'} ${showProfileMenu ? 'border-teal-500' : 'border-stone-200 dark:border-stone-700'}`}>
                                {user.photoURL ? <img src={user.photoURL} alt="Profiel" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400"><Icon path={Icons.User} size={navCompact ? 14 : 17}/></div>}
                            </button>
                            {showProfileMenu && renderProfileMenu('right-0 bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200')}
                        </div>
                    </div>
                </nav>
                </>
                            )}

{/* Add/Edit Modal */}
            <AddEditItemModal actieveCategorieen={actieveCategorieen} editingItem={editingItem} formData={formData} formLades={formLades} handleModalTypeChange={handleModalTypeChange} isAdmin={isAdmin} items={items} modalLocaties={modalLocaties} modalType={modalType} myHiddenTabs={myHiddenTabs} rememberLocation={rememberLocation} setFormData={setFormData} setRememberLocation={setRememberLocation} setShowAddModal={setShowAddModal} setShowEmojiPicker={setShowEmojiPicker} showAddModal={showAddModal} alleEenheden={alleEenheden} handleSaveItem={handleSaveItem} />

            {/* Emoji Modal */}
            <EmojiPickerModal setFormData={setFormData} setShowEmojiPicker={setShowEmojiPicker} showEmojiPicker={showEmojiPicker} />

            {/* Shopping List Modal */}
            <ShoppingListModal clearCheckedShopping={clearCheckedShopping} deleteShoppingItem={deleteShoppingItem} groupedShoppingList={groupedShoppingList} handleAddShoppingItem={handleAddShoppingItem} handleShareList={handleShareList} handleShareWhatsApp={handleShareWhatsApp} items={items} moveShoppingToStock={moveShoppingToStock} setShoppingFormData={setShoppingFormData} setShowShoppingModal={setShowShoppingModal} shoppingFormData={shoppingFormData} shoppingList={shoppingList} showShoppingModal={showShoppingModal} toggleShoppingItem={toggleShoppingItem} />

            {/* Delete Confirmation Modal */}
            <DeleteModal confirmDelete={confirmDelete} itemToDelete={itemToDelete} items={items} setShowDeleteModal={setShowDeleteModal} showDeleteModal={showDeleteModal} />

            {/* Shopify Modal */}
            <ShopifyPromptModal aantalForShopifyItem={aantalForShopifyItem} handleAddToShoppingFromDelete={handleAddToShoppingFromDelete} itemToShopify={itemToShopify} items={items} setAantalForShopifyItem={setAantalForShopifyItem} setShopForDeletedItem={setShopForDeletedItem} setShowShopifyModal={setShowShopifyModal} shopForDeletedItem={shopForDeletedItem} showShopifyModal={showShopifyModal} />

            {/* Stats Modal */}
            <StatsModal items={items} setShowStatsModal={setShowStatsModal} showStatsModal={showStatsModal} stats={stats} totalStockValue={totalStockValue} />

            <LogModal isAdmin={isAdmin} items={items} logs={logs} setShowLogModal={setShowLogModal} showLogModal={showLogModal} user={user} />

            <BeheerModal actieveCategorieen={actieveCategorieen} beheerTab={beheerTab} customUnitsFrig={customUnitsFrig} customUnitsVoorraad={customUnitsVoorraad} customUnitsVries={customUnitsVries} cycleLocatieColor={cycleLocatieColor} draggedCatName={draggedCatName} draggedLocId={draggedLocId} draggedUnitName={draggedUnitName} editCatInputColor={editCatInputColor} editCatInputName={editCatInputName} editUnitInput={editUnitInput} editingCatName={editingCatName} editingLadeId={editingLadeId} editingLadeName={editingLadeName} editingUnitName={editingUnitName} eenheidFilter={eenheidFilter} filteredLocaties={filteredLocaties} handleAddCat={handleAddCat} handleAddLade={handleAddLade} handleAddLocatie={handleAddLocatie} handleAddUnit={handleAddUnit} handleDeleteCat={handleDeleteCat} handleDeleteLade={handleDeleteLade} handleDeleteLocatie={handleDeleteLocatie} handleDeleteUnit={handleDeleteUnit} handleDragEnd={handleDragEnd} handleDragOver={handleDragOver} handleDragStart={handleDragStart} handleDragStartCat={handleDragStartCat} handleDragStartUnit={handleDragStartUnit} handleDrop={handleDrop} handleDropCat={handleDropCat} handleDropUnit={handleDropUnit} isAdmin={isAdmin} items={items} lades={lades} myHiddenTabs={myHiddenTabs} newCatColor={newCatColor} newCatName={newCatName} newLadeNaam={newLadeNaam} newLocatieColor={newLocatieColor} newLocatieNaam={newLocatieNaam} newUnitNaam={newUnitNaam} saveCat={saveCat} saveLadeName={saveLadeName} saveUnitName={saveUnitName} selectedLocatieForBeheer={selectedLocatieForBeheer} setBeheerTab={setBeheerTab} setDraggedCatName={setDraggedCatName} setDraggedUnitName={setDraggedUnitName} setEditCatInputColor={setEditCatInputColor} setEditCatInputName={setEditCatInputName} setEditUnitInput={setEditUnitInput} setEditingLadeName={setEditingLadeName} setEenheidFilter={setEenheidFilter} setNewCatColor={setNewCatColor} setNewCatName={setNewCatName} setNewLadeNaam={setNewLadeNaam} setNewLocatieColor={setNewLocatieColor} setNewLocatieNaam={setNewLocatieNaam} setNewUnitNaam={setNewUnitNaam} setSelectedLocatieForBeheer={setSelectedLocatieForBeheer} setShowBeheerModal={setShowBeheerModal} showBeheerModal={showBeheerModal} startEditCat={startEditCat} startEditLade={startEditLade} startEditUnit={startEditUnit} />
            
<UserAdminModal beheerdeUserId={beheerdeUserId} globalOnboardingActive={globalOnboardingActive} items={items} maintenanceMode={maintenanceMode} recepten={recepten} resetTutorialForEveryone={resetTutorialForEveryone} setBeheerdeUserId={setBeheerdeUserId} setDashboardUser={setDashboardUser} setShowDashboardModal={setShowDashboardModal} setShowUserAdminModal={setShowUserAdminModal} showNotification={showNotification} showUserAdminModal={showUserAdminModal} toggleGlobalOnboardingStatus={toggleGlobalOnboardingStatus} toggleUserHelpButton={toggleUserHelpButton} toggleUserStatus={toggleUserStatus} toggleUserTabVisibility={toggleUserTabVisibility} toggleUserTourDisabled={toggleUserTourDisabled} triggerTourForUser={triggerTourForUser} usersList={usersList} toggleMaintenanceMode={toggleMaintenanceMode} toggleUserBalansMode={toggleUserBalansMode} toggleUserNotifications={toggleUserNotifications} />

            <TourAdminModal editingTourSteps={editingTourSteps} handleAddEditStep={handleAddEditStep} handleDeleteEditStep={handleDeleteEditStep} handleUpdateEditStep={handleUpdateEditStep} items={items} moveEditStep={moveEditStep} saveTourStepsToDb={saveTourStepsToDb} setShowTourAdminModal={setShowTourAdminModal} showTourAdminModal={showTourAdminModal} />

            <WhatsNewModal alerts={alerts} alertsExpanded={alertsExpanded} currentVersionData={currentVersionData} items={items} setAlertsExpanded={setAlertsExpanded} setShowWhatsNew={setShowWhatsNew} showOnboarding={showOnboarding} showWhatsNew={showWhatsNew} tourSteps={tourSteps} vriezers={vriezers} />

            {tourSteps && tourSteps[onboardingStep] && (
                <OnboardingTourModal finishTutorial={finishTutorial} handleSwipeEnd={handleSwipeEnd} handleSwipeMove={handleSwipeMove} handleSwipeStart={handleSwipeStart} items={items} onboardingStep={onboardingStep} showOnboarding={showOnboarding} showWhatsNew={showWhatsNew} tourSteps={tourSteps} />
            )}

            <VersionHistoryModal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
            <ShareModal showShareModal={showShareModal} setShowShareModal={setShowShareModal} shareEmail={shareEmail} setShareEmail={setShareEmail} handleShare={handleShare} myOutgoingShares={myOutgoingShares} revokeShare={revokeShare} setShowPublicLinkModal={setShowPublicLinkModal} />
            <PublicLinkModal showPublicLinkModal={showPublicLinkModal} setShowPublicLinkModal={setShowPublicLinkModal} myPublicShareEnabled={myPublicShareEnabled} togglePublicShare={togglePublicShare} publicShareToken={publicShareToken} regeneratePublicLink={regeneratePublicLink} />
            <ExportBackupModal showExportBackupModal={showExportBackupModal} setShowExportBackupModal={setShowExportBackupModal} exportToCSV={exportToCSV} exportToPDF={exportToPDF} exportBackup={exportBackup} backupFileInputRef={backupFileInputRef} />

            <DashboardModal dashboardData={dashboardData} dashboardUser={dashboardUser} items={items} lades={lades} openDashboardLades={openDashboardLades} openEditFromDashboard={openEditFromDashboard} setDashboardUser={setDashboardUser} setOpenDashboardLades={setOpenDashboardLades} setShowDashboardModal={setShowDashboardModal} showDashboardModal={showDashboardModal} usersList={usersList} vriezers={vriezers} />


        </div>
    );
}

// Publieke, alleen-lezen weergave zonder account nodig. Wordt getoond wanneer de URL
// een ?deel=TOKEN parameter bevat. Zoekt de eigenaar op via hun publicShareToken en
// toont hun voorraad read-only, gegroepeerd per locatie/lade.
// LET OP: dit vereist een Firestore Security Rule die publiek lezen toestaat wanneer
// het token geldig is. Zie de meegeleverde voorbeeldregel voor de exacte rule-syntax.
const PublicShareView = ({ token }) => {
    const [status, setStatus] = useState('loading'); // loading | notfound | ok
    const [ownerLabel, setOwnerLabel] = useState('');
    const [vriezers, setVriezers] = useState([]);
    const [items, setItems] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const userSnap = await db.collection('users').where('publicShareToken', '==', token).where('publicShareEnabled', '==', true).limit(1).get();
                if (userSnap.empty) { setStatus('notfound'); return; }
                const ownerDoc = userSnap.docs[0];
                const ownerId = ownerDoc.id;
                setOwnerLabel(ownerDoc.data().displayName || ownerDoc.data().email || 'Iemand');

                const [vSnap, iSnap] = await Promise.all([
                    db.collection('vriezers').where('userId', '==', ownerId).get(),
                    db.collection('items').where('userId', '==', ownerId).get()
                ]);
                setVriezers(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setItems(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setStatus('ok');
            } catch (e) {
                console.error('Kon gedeelde voorraad niet laden:', e);
                setStatus('notfound');
            }
        };
        load();
    }, [token]);

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 text-stone-500">Laden...</div>;
    }
    if (status === 'notfound') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900 p-6 text-center gap-3">
                <Icon path={Icons.Lock} size={40} className="text-stone-300"/>
                <h1 className="text-lg font-bold text-stone-700 dark:text-stone-200">Deze deel-link is niet (meer) geldig.</h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">Vraag de eigenaar om een nieuwe link te delen.</p>
            </div>
        );
    }

    const grouped = vriezers.map(v => ({ locatie: v, producten: items.filter(i => i.vriezerId === v.id) }));

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 font-sans">
            <header className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-stone-200 dark:border-stone-800 p-4">
                <h1 className="text-xl font-bold text-teal-600">Voorraad. <span className="text-sm font-medium text-stone-400">— bekeken via deel-link</span></h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">Voorraad van {ownerLabel} · alleen-lezen</p>
            </header>
            <main className="max-w-3xl mx-auto p-4 space-y-4">
                {grouped.map(g => g.producten.length > 0 && (
                    <div key={g.locatie.id} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 p-4">
                        <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-2">{g.locatie.naam}</h3>
                        <ul className="space-y-1.5">
                            {g.producten.map(p => (
                                <li key={p.id} className="flex justify-between text-sm text-stone-600 dark:text-stone-300">
                                    <span>{p.emoji} {p.naam}</span>
                                    <span className="text-stone-400">{formatAantal(p.aantal)} {p.eenheid}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {items.length === 0 && <p className="text-center text-stone-400 text-sm py-10">Geen producten gevonden.</p>}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
const publicShareToken = new URLSearchParams(window.location.search).get('deel');
root.render(publicShareToken ? <PublicShareView token={publicShareToken} /> : <App />);
