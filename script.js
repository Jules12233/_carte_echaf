// =============================
// CONFIG OTP
// =============================

const SEND_OTP_URL =
  "https://script.google.com/macros/s/AKfycbzAzJ-J3eryTHwyetoMif6lydo7OUd3G0FQuKjCcmt_QMQgnacnAFglOewQj5QjScOhdQ/exec?action=send";

const VERIFY_OTP_URL =
  "https://script.google.com/macros/s/AKfycbzAzJ-J3eryTHwyetoMif6lydo7OUd3G0FQuKjCcmt_QMQgnacnAFglOewQj5QjScOhdQ/exec?action=verify";

let authenticatedEmail = localStorage.getItem("authEmail") || null;


// =============================
// CONFIG GOOGLE FORM + API
// =============================

const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfbclx6nrgmB311-Rmx7z3tJ_8Kq2Ao1eaZETsrPoemIY130A/formResponse";

const GF_ENTRY = {
  id: "entry.1330851147",
  service: "entry.662387729",
  etat: "entry.1551408270",
  email: "entry.2001127738",
  date_iso: "entry.1826740746"
};

const API_URL = "https://script.google.com/macros/s/AKfycbzwzovtRNEPYVuhoPlkS5dMPXJI1Ai5TZgH3tXS80y9mrxA7YRtNVYw1iNtB5IimpD1aQ/exec";


// =============================
// UTILISATEUR
// =============================

let currentUser = null;

function ouvrirServiceModal() {
  document.getElementById("autreServiceBlock").style.display = "none";
  document.getElementById("autreServiceInput").value = "";
  document.getElementById("serviceModal").classList.remove("hidden");
}

function fermerServiceModal() {
  document.getElementById("serviceModal").classList.add("hidden");
}

function choisirService(s) {
  if (s === "Autre") {
    document.getElementById("autreServiceBlock").style.display = "block";
    return;
  }
  currentService = s;
  fermerServiceModal();
  _apresService();
}

function validerAutreService() {
  const val = document.getElementById("autreServiceInput").value.trim();
  if (!val) {
    alert("Veuillez indiquer votre service.");
    return;
  }
  currentService = val;
  fermerServiceModal();
  _apresService();
}

function _apresService() {
  if (votePendingEtat === "utile") {
    ouvrirDateModal();
  } else {
    envoyerVote(votePendingID, votePendingEtat, null);
  }
}


// =============================
// AUTHENTIFICATION OTP
// =============================

async function authenticateUser() {
  if (authenticatedEmail) return authenticatedEmail;

  const email = prompt("Entrez votre adresse VINCI (prenom.nom@vinci-construction.com)");
  if (!email) return null;

  const regexVINCI = /^[a-zA-Z]+(?:[.-][a-zA-Z]+)*@vinci-construction\.com$/;
  if (!regexVINCI.test(email.trim())) {
    alert("Adresse mail invalide !");
    return null;
  }

  const sendReq = await fetch(SEND_OTP_URL + "&email=" + encodeURIComponent(email));
  const sendRes = await sendReq.json();

  if (!sendRes.success) {
    alert("Erreur lors de l'envoi du code.");
    return null;
  }

  const otp = prompt("Un code à usage unique vous a été envoyé.\nVeuillez le saisir :");
  if (!otp) return null;

  const verifyReq = await fetch(
    VERIFY_OTP_URL +
    "&email=" + encodeURIComponent(email) +
    "&otp=" + encodeURIComponent(otp)
  );
  const verifyRes = await verifyReq.json();

  if (!verifyRes.valid) {
    alert("Code incorrect ou expiré.");
    return null;
  }

  authenticatedEmail = email.trim();
  localStorage.setItem("authEmail", authenticatedEmail);
  alert("Identification réussie !");
  return authenticatedEmail;
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
  utile:      coloredIcon("green"),
  demontable: coloredIcon("red"),
  attente:    coloredIcon("grey"),
  urgent:     coloredIcon("yellow"),
  expire:     coloredIcon("blue")
};


// =============================
// POPUP DYNAMIQUE
// =============================

function popupContent(marker) {
  let infoHTML = "";

  if (marker.state === "utile" && marker.serviceUtile && marker.dateLimite) {
    infoHTML = `
      <br>
      <b>Utile pour ${marker.serviceUtile} jusqu'au ${marker.dateLimite}</b><br>
      <span style="font-size:12px;color:#555;">Déclaré par : ${marker.emailUtile || "inconnu"}</span>
      <br><br>
    `;
  }

  return `
    <b>${marker.titre}</b><br>
    ${marker.image}<br>
    ${infoHTML}
    <button onclick="sendVote('${marker.id}','utile')">Utile</button>
    <button onclick="sendVote('${marker.id}','demontable')">Démontable</button>
    `;

}


// =============================
// CREATION MARQUEURS
// =============================

var markers = [];
var zonesCenters = {};

points.forEach(function(p) {
  const normID = normalize(p.titre);

  var marker = L.marker([p.x, p.y], { icon: icons.attente })
    .bindPopup(() => popupContent(marker));

  marker.id          = normID;
  marker.zone        = p.zone;
  marker.titre       = p.titre;
  marker.image       = `<img src="${p.image}" style="width:300px;border-radius:8px;">`;
  marker.state       = "attente";
  marker.serviceUtile = null;
  marker.emailUtile  = null;   // ← ajout
  marker.dateLimite  = null;

  markers.push(marker);
  marker.addTo(map);

  if (!zonesCenters[p.zone])
    zonesCenters[p.zone] = { sumX: 0, sumY: 0, count: 0 };

  zonesCenters[p.zone].sumX  += p.x;
  zonesCenters[p.zone].sumY  += p.y;
  zonesCenters[p.zone].count += 1;
});


// =============================
// ZONES
// =============================

var zones = [...new Set(points.map(p => p.zone))];
var zoneList = document.getElementById("zoneList");

zones.forEach(function(zone) {
  var li = document.createElement("li");
  li.textContent = zone;
  li.onclick = function() { filtrer(zone); };
  zoneList.appendChild(li);
});

function filtrer(zone) {
  markers.forEach(function(m) {
    if (m.zone === zone) map.addLayer(m);
    else map.removeLayer(m);
  });
  var z = zonesCenters[zone];
  map.setView([z.sumX / z.count, z.sumY / z.count], map.getZoom());
}

function afficherTous() {
  markers.forEach(m => map.addLayer(m));
  map.fitBounds(bounds);
}


// =============================
// SIDEBAR
// =============================

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("closed");
}


// =============================
// MODALE DATE
// =============================

let votePendingID   = null;
let votePendingEtat = null;

function ouvrirDateModal() {
  document.getElementById("dateModal").classList.remove("hidden");
}
function fermerDateModal() {
  document.getElementById("dateModal").classList.add("hidden");
}

function validerDateLimite() {
  const d = document.getElementById("dateDay").value;
  const m = document.getElementById("dateMonth").value;
  const y = document.getElementById("dateYear").value;

  if (!(d && m && y)) {
    alert("Date incomplète !");
    return;
  }

  const iso = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  fermerDateModal();
  envoyerVote(votePendingID, votePendingEtat, iso);
}


// =============================
// ENVOI DU VOTE
// =============================

async function sendVote(id, etat) {
  const email = await authenticateUser();
  if (!email) return;

  currentUser = email;

  if (etat === "utile") {
    votePendingID   = id;
    votePendingEtat = etat;
    ouvrirServiceModal();  // ← service d'abord, puis date
    return;
  }

  // Pour démontable/attente : service aussi requis
  votePendingID   = id;
  votePendingEtat = etat;
  ouvrirServiceModal();
}


// =============================
// ENVOI GOOGLE FORMS
// =============================

function envoyerVote(id, etat, isoDate) {
  const body = new URLSearchParams();
  body.append(GF_ENTRY.id,      id);
  body.append(GF_ENTRY.service, currentService);
  body.append(GF_ENTRY.etat,    etat);
  body.append(GF_ENTRY.email,   currentUser);

  let marker = markers.find(m => m.id === id);

  if (etat === "utile" && isoDate) {
    marker.serviceUtile = currentService;
    marker.emailUtile   = currentUser;
    const [y, mo, d]    = isoDate.split("-");
    marker.dateLimite   = `${d}/${mo}/${y}`;
    body.append(GF_ENTRY.date_iso, isoDate);
  } else {
    marker.serviceUtile = null;
    marker.emailUtile   = null;
    marker.dateLimite   = null;
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
    // Rafraîchir depuis la Synthese après un court délai
    setTimeout(refreshStates, 3000);
  })
  .catch(err => console.error("Erreur POST:", err));
}


// =============================
// RÉCUPÉRATION API (Synthese)
// =============================

function refreshStates() {
  fetch(API_URL + "?v=" + Date.now(), { cache: "no-store" })
    .then(r => r.json())
    .then(data => {

      markers.forEach(m => {
        const info = data[m.id];

        if (!info) {
          m.state = "attente";
          m.setIcon(icons.attente);
          return;
        }

        m.state        = info.etat    || "attente";
        m.serviceUtile = info.service || null;
        m.emailUtile   = info.email   || null;

        if (info.date_iso) {
          const [y, mo, d] = info.date_iso.split("-");
          m.dateLimite = `${d}/${mo}/${y}`;
        } else {
          m.dateLimite = null;
        }

        if (m.state === "utile") {
          const isExpire = String(info.expire).toUpperCase() === "TRUE";
          const isUrgent = String(info.urgent).toUpperCase() === "TRUE";

          if (isExpire) {
            m.setIcon(icons.expire);
          } else if (isUrgent) {
            m.setIcon(icons.urgent);
          } else {
            m.setIcon(icons.utile);
          }
        } else {
          m.setIcon(icons[m.state] || icons.attente);
        }

      });  // ← fermeture markers.forEach manquante

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
