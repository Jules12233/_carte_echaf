// =============================
// CONFIG GOOGLE FORM + API
// =============================

const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfbclx6nrgmB311-Rmx7z3tJ_8Kq2Ao1eaZETsrPoemIY130A/formResponse";

const GF_ENTRY = {
  id: "entry.1330851147",
  service: "entry.662387729",
  etat: "entry.1551408270",
  nom: "entry.1649010906",
  date_iso: "entry.1826740746"   // ✅ Champ unique "date" du Google Form
};

const API_URL = "https://script.google.com/macros/s/AKfycbzwzovtRNEPYVuhoPlkS5dMPXJI1Ai5TZgH3tXS80y9mrxA7YRtNVYw1iNtB5IimpD1aQ/exec";


// =============================
// UTILISATEUR
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
// NORMALISATION
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
// CARTE
// =============================

var map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, zoomControl: false });
var bounds = [[0,0], [4967,7021]];
L.imageOverlay('carte.jpeg', bounds).addTo(map);
map.fitBounds(bounds);


// =============================
// ICONES
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
};


// =============================
// POPUP DYNAMIQUE
// =============================
function popupContent(marker) {

  let infoHTML = "";

  if (marker.state === "utile" && marker.serviceUtile && marker.dateLimite) {
    infoHTML = `
      <br><b>Échafaudage utile pour ${marker.serviceUtile} jusqu’au ${marker.dateLimite}</b><br><br>
    `;
  }

  return `
    <b>${marker.titre}</b><br>
    ${marker.image}<br>
    ${infoHTML}
    <button onclick="sendVote('${marker.id}','utile')">Utile</button>
    <button onclick="sendVote('${marker.id}','demontable')">Démontable</button>
    <button onclick="sendVote('${marker.id}','attente')">En attente</button>
  `;
}


// =============================
// CREATION MARQUEURS
// =============================
var markers = [];
var zonesCenters = {};

points.forEach(function(p){
  const normID = normalize(p.titre);

  var marker = L.marker([p.x, p.y], { icon: icons.attente })
    .bindPopup(() => popupContent(marker));

  marker.id = normID;
  marker.zone = p.zone;
  marker.titre = p.titre;
  marker.image = `<img src="${p.image}" style="width:300px;border-radius:8px;">`;

  marker.state = "attente";
  marker.serviceUtile = null;
  marker.dateLimite = null;

  markers.push(marker);
  marker.addTo(map);

  if (!zonesCenters[p.zone])
    zonesCenters[p.zone] = { sumX:0, sumY:0, count:0 };

  zonesCenters[p.zone].sumX += p.x;
  zonesCenters[p.zone].sumY += p.y;
  zonesCenters[p.zone].count += 1;
});


// =============================
// ZONES
// =============================
var zones = [...new Set(points.map(p => p.zone))];
var zoneList = document.getElementById("zoneList");

zones.forEach(function(zone){
  var li = document.createElement("li");
  li.textContent = zone;
  li.onclick = function(){ filtrer(zone); };
  zoneList.appendChild(li);
});

function filtrer(zone){
  markers.forEach(function(m){
    if (m.zone === zone) map.addLayer(m);
    else map.removeLayer(m);
  });

  var z = zonesCenters[zone];
  map.setView([z.sumX / z.count, z.sumY / z.count], map.getZoom());
}

function afficherTous(){
  markers.forEach(m => map.addLayer(m));
  map.fitBounds(bounds);
}


// =============================
// SIDEBAR
// =============================
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("closed");
}


// =============================
// MODALE DATE
// =============================
let votePendingID = null;
let votePendingEtat = null;

function ouvrirDateModal(){
  document.getElementById("dateModal").classList.remove("hidden");
}
function fermerDateModal(){
  document.getElementById("dateModal").classList.add("hidden");
}

function validerDateLimite(){
  const d = document.getElementById("dateDay").value;
  const m = document.getElementById("dateMonth").value;
  const y = document.getElementById("dateYear").value;

  if (!(d && m && y)) {
    alert("Date incomplète !");
    return;
  }

  // ✅ Format ISO
  const iso = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  fermerDateModal();
  envoyerVote(votePendingID, votePendingEtat, iso);
}


// =============================
// ENVOI DU VOTE
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

  if (etat === "utile") {
    votePendingID = id;
    votePendingEtat = etat;
    ouvrirDateModal();
    return;
  }

  envoyerVote(id, etat, null);
}


// =============================
// ENVOI GOOGLE FORMS (ISO)
// =============================
function envoyerVote(id, etat, isoDate){

  const body = new URLSearchParams();
  body.append(GF_ENTRY.id, id);
  body.append(GF_ENTRY.service, currentService);
  body.append(GF_ENTRY.etat, etat);
  body.append(GF_ENTRY.nom, currentUser);

  let marker = markers.find(m => m.id === id);

  if (etat === "utile" && isoDate){
    marker.serviceUtile = currentService;

    const [y,m,d] = isoDate.split("-");
    marker.dateLimite = `${d}/${m}/${y}`;

    body.append(GF_ENTRY.date_iso, isoDate);
  } else {
    marker.serviceUtile = null;
    marker.dateLimite = null;
  }

  fetch(FORM_ACTION, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  })
  .then(() => {
    marker.state = etat;
    marker.setIcon(icons[etat] || icons.attente);
    refreshStates();
  })
  .catch(err => console.error("Erreur POST:", err));
}


// =============================
// RÉCUPERATION API
// =============================
function refreshStates(){
  fetch(API_URL + "?v=" + Date.now(), { cache:"no-store" })
    .then(r => r.json())
    .then(data => {

      markers.forEach(m => {
        const info = data[m.id];

        if (!info) {
          m.state = "attente";
          m.setIcon(icons.attente);
          return;
        }

        m.state = info.etat || "attente";
        m.serviceUtile = info.service || null;

        if (info.year && info.month && info.day) {
          m.dateLimite = `${info.day}/${info.month}/${info.year}`;
        } else {
          m.dateLimite = null;
        }

        m.setIcon(icons[m.state] || icons.attente);
      });
    })
    .catch(err => console.error("Erreur GET:", err));
}

refreshStates();


// =============================
// AIDE
// =============================
function ouvrirLegendePopup() {
  document.getElementById("helpModal").classList.remove("hidden");
}
function fermerLegendePopup() {
  document.getElementById("helpModal").classList.add("hidden");
}
