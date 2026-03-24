// =============================
// CONFIG GOOGLE FORM + API
// =============================

// POST vers Google Forms (ton ID public)
const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfbclx6nrgmB311-Rmx7z3tJ_8Kq2Ao1eaZETsrPoemIY130A/formResponse";

// Entrées Google Forms identifiées
const GF_ENTRY = {
  id: "entry.1330851147",        // champ texte "id"
  service: "entry.662387729",    // radio: MONT | ELEC | Autre
  etat: "entry.1551408270",      // radio: utile | demontable | attente
  nom: "entry.1649010906"        // texte: nom utilisateur
};

// API Apps Script existante pour récupérer les états (GET)
const API_URL = "https://script.google.com/macros/s/AKfycbzwzovtRNEPYVuhoPlkS5dMPXJI1Ai5TZgH3tXS80y9mrxA7YRtNVYw1iNtB5IimpD1aQ/exec";

// =============================
// GESTION UTILISATEUR (service + nom)
// =============================
let currentService = null;
let currentUser = null;

function setService(s) {
  currentService = s;

  const nom = prompt("Entrez votre nom :");
  if (!nom || nom.trim() === "") {
    alert("Nom obligatoire !");
    currentService = null;
    return;
  }

  currentUser = nom.trim();
  alert("Bienvenue " + currentUser + " (" + currentService + ")");
}

// =============================
// UTIL: normaliser
// =============================
function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// =============================
// INITIALISATION CARTE
// =============================
var map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, zoomControl: false });
var bounds = [[0,0], [4967,7021]];
L.imageOverlay('carte.jpeg', bounds).addTo(map);
map.fitBounds(bounds);

// =============================
// MARQUEURS: icons colorées
// =============================
function coloredIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

const icons = {
  utile: coloredIcon("green"),
  demontable: coloredIcon("red"),
  attente: coloredIcon("grey")
  // (plus tard) demande: coloredIcon("blue")
};

// X & Y cnsole
map.on("click", function(e) {
  console.log("X:", Math.round(e.latlng.lat), "Y:", Math.round(e.latlng.lng));
});

// =============================
// DONNÉES & MARQUEURS
// =============================
var markers = [];
var zonesCenters = {};

points.forEach(function(p){
  const normID = normalize(p.titre);

  var marker = L.marker([p.x, p.y], { icon: icons.attente })
    .bindPopup(`
      <b>${p.titre}</b><br>
      <img src="${p.image}" alt="${p.titre}" style="width:300px;border-radius:8px;"><br><br>
      <button onclick="sendVote('${normID}','utile')">Utile</button>
      <button onclick="sendVote('${normID}','demontable')">Démontable</button>
      <button onclick="sendVote('${normID}','attente')">En attente</button>
    `);

  marker.id = normID;
  marker.zone = p.zone;
  markers.push(marker);
  marker.addTo(map);

  if (!zonesCenters[p.zone])
    zonesCenters[p.zone] = { sumX:0, sumY:0, count:0 };

  zonesCenters[p.zone].sumX += p.x;
  zonesCenters[p.zone].sumY += p.y;
  zonesCenters[p.zone].count += 1;
});

// =============================
// LISTE ZONES
// =============================
var zones = [...new Set(points.map(p => p.zone))];
var zoneList = document.getElementById("zoneList");

zones.forEach(function(zone){
  var li = document.createElement("li");
  li.textContent = zone;
  li.onclick = function(){ filtrer(zone); };
  zoneList.appendChild(li);
});

// =============================
// FILTRAGE ZONES
// =============================
function filtrer(zone){
  markers.forEach(function(m){
    if (m.zone === zone) map.addLayer(m);
    else map.removeLayer(m);
  });

  var z = zonesCenters[zone];
  var centerX = z.sumX / z.count;
  var centerY = z.sumY / z.count;

  map.setView([centerX, centerY], map.getZoom());
}

function afficherTous(){
  markers.forEach(function(m){ map.addLayer(m); });
  map.fitBounds(bounds);
}

// =============================
// SIDEBAR
// =============================
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("closed");
}

// =============================
// POST VOTE (Google Form)
// =============================
function sendVote(id, etat){
  if (!currentService){
    alert("Choisissez d'abord votre service.");
    return;
  }
  if (!currentUser){
    const nom = prompt("Entrez votre nom :");
    if (!nom || nom.trim() === "") {
      alert("Nom obligatoire !");
      return;
    }
    currentUser = nom.trim();
  }

  const body = new URLSearchParams();
  body.append(GF_ENTRY.id, id);
  body.append(GF_ENTRY.service, currentService); // MONT | ELEC | Autre
  body.append(GF_ENTRY.etat, etat);              // utile | demontable | attente
  body.append(GF_ENTRY.nom, currentUser);        // nom

  fetch(FORM_ACTION, {
    method: "POST",
    mode: "no-cors", // CORS opaque, mais l'envoi est bien effectué
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  })
  .then(() => {
    // Mise à jour optimiste
    const m = markers.find(m => m.id === id);
    if (m) {
      m.closePopup();
      m.setIcon(icons[etat] || icons.attente);
    }
    // Confirmation depuis l'API (source de vérité)
    setTimeout(refreshStates, 1200);
  })
  .catch(err => console.error("Erreur POST vers Google Forms:", err));
}

// =============================
// GET ETATS (anti-cache)
// =============================
function refreshStates(){
  const url = API_URL + "?v=" + Date.now();

  fetch(url, { cache: "no-store" })
    .then(r => r.json())
    .then(etats => {
      const normalizedData = {};
      Object.keys(etats).forEach(k => {
        normalizedData[normalize(k)] = normalize(etats[k]);
      });

      markers.forEach(m => {
        const etat = normalizedData[m.id] || "attente"; // utile | demontable | attente
        m.state = etat; // pour de futurs filtres par type
        m.closePopup();
        m.setIcon(icons[etat] || icons.attente);
      });
    })
    .catch(err => console.error("Erreur GET:", err));
}

// Premier chargement des états
refreshStates();

// (Optionnel) petit filet pour repérer les erreurs JS en prod
window.addEventListener('error', (e) => {
  console.error("JS error:", e.message, e.filename, e.lineno);
});

//ouvrir/fermer légende
function ouvrirLegendePopup() {
  document.getElementById("helpModal").classList.remove("hidden");
}

function fermerLegendePopup() {
  document.getElementById("helpModal").classList.add("hidden");
}
