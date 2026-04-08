// =============================
// INITIALISATION CARTE
// =============================

var map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, zoomControl: false });
var bounds = [[0,0], [4967,7021]];
L.imageOverlay('carte.jpeg', bounds).addTo(map);
map.fitBounds(bounds);

map.on("click", function(e) {
  console.log("X:", Math.round(e.latlng.lat), "Y:", Math.round(e.latlng.lng));
});

// Bouton d'aide sur la carte
L.Control.HelpButton = L.Control.extend({
  options: { position: 'topright' },
  onAdd: function () {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    container.style.cssText = "background:#fff;width:34px;height:34px;line-height:34px;text-align:center;cursor:pointer;font-weight:bold;font-size:18px;";
    container.innerHTML = '?';
    container.onclick = function () { ouvrirHelpToolModal(); };
    L.DomEvent.disableClickPropagation(container);
    return container;
  }
});
new L.Control.HelpButton().addTo(map);


// =============================
// ÉTAT GLOBAL MARQUEURS
// =============================

var markers      = [];
var zonesCenters = {};
var currentDate  = new Date().toISOString().split("T")[0];


// =============================
// LOADING
// =============================

function afficherLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.remove("hidden");
}

function masquerLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.classList.add("hidden");
}


// =============================
// CHARGEMENT DYNAMIQUE DES MARQUEURS
// =============================

function chargerMarqueurs(dateRef) {
  afficherLoading();

  markers.forEach(m => map.removeLayer(m));
  markers = [];
  zonesCenters = {};
  document.getElementById("zoneList").innerHTML = "";

  fetch(`${API_URL}?type=points&date=${dateRef}&v=${Date.now()}`, { cache: "no-store" })
    .then(r => r.json())
    .then(points => {

      if (!Array.isArray(points)) {
        console.error("Format points invalide :", points);
        return;
      }

      points.forEach(p => {
        const marker = L.marker([p.x, p.y], { icon: icons.attente });

        marker.id           = p.id;
        marker.zone         = p.zone;
        marker.titre        = p.titre;
        marker.imageUrl     = p.image;
        marker.state        = "attente";
        marker.serviceUtile = null;
        marker.emailUtile   = null;
        marker.dateLimite   = null;

        marker.bindPopup(() => popupContent(marker));
        marker.addTo(map);
        markers.push(marker);

        if (!zonesCenters[p.zone])
          zonesCenters[p.zone] = { sumX: 0, sumY: 0, count: 0 };

        zonesCenters[p.zone].sumX  += p.x;
        zonesCenters[p.zone].sumY  += p.y;
        zonesCenters[p.zone].count += 1;
      });

      // Reconstruire la liste des zones
      const zoneList = document.getElementById("zoneList");
      Object.keys(zonesCenters).sort().forEach(zone => {
        const li = document.createElement("li");
        li.textContent = zone;
        li.onclick = () => filtrer(zone);
        zoneList.appendChild(li);
      });

      mettreAJourIndicateurDate(dateRef);
      refreshStates();
    })
    .catch(err => {
      console.error("Erreur chargement échafaudages :", err);
      alert("Erreur lors du chargement des échafaudages.");
    })
    .finally(() => masquerLoading());
}


// =============================
// INDICATEUR DATE
// =============================

function mettreAJourIndicateurDate(dateRef) {
  const today = new Date().toISOString().split("T")[0];
  const el    = document.getElementById("dateIndicator");

  if (dateRef === today) {
    el.textContent      = "Aujourd'hui";
    el.style.background = "#fff";
    el.style.color      = "#333";
  } else {
    const [y, m, d]     = dateRef.split("-");
    el.textContent      = `📅 Vue du ${d}/${m}/${y}`;
    el.style.background = "#fff3cd";
    el.style.color      = "#856404";
  }
}


// =============================
// FILTRAGE ZONES
// =============================

function filtrer(zone) {
  markers.forEach(m => {
    if (m.zone === zone) map.addLayer(m);
    else map.removeLayer(m);
  });
  const z = zonesCenters[zone];
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
// SÉLECTEUR DE DATE
// =============================

function onDateChange() {
  const val = document.getElementById("datePicker").value;
  if (!val) return;
  currentDate = val;
  chargerMarqueurs(currentDate);
}

function resetToToday() {
  currentDate = new Date().toISOString().split("T")[0];
  document.getElementById("datePicker").value = currentDate;
  chargerMarqueurs(currentDate);
}


// =============================
// POPUP DYNAMIQUE
// =============================

function popupContent(marker) {
  let infoHTML = "";

  if (marker.state === "utile" && marker.serviceUtile && marker.dateLimite) {
    infoHTML = `
      <br>
      <b>Utile pour ${marker.serviceUtile} jusqu'au ${marker.dateLimite}</b><br>
      <span style="font-size:12px;color:#555;">
        Déclaré par : ${marker.emailUtile || "inconnu"}
      </span>
      <br><br>
    `;
  }

  return `
    <b>${marker.titre}</b><br>
    <img src="${marker.imageUrl}" style="width:300px;border-radius:8px;margin-top:6px;"><br>
    ${infoHTML}
    <button onclick="sendVote('${marker.id}','utile')">Utile</button>
    <button onclick="sendVote('${marker.id}','demontable')">Démontable</button>
  `;
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

          if (isExpire)       m.setIcon(icons.expire);
          else if (isUrgent)  m.setIcon(icons.urgent);
          else                m.setIcon(icons.utile);
        } else {
          m.setIcon(icons[m.state] || icons.attente);
        }
      });

    })
    .catch(err => console.error("Erreur GET:", err));
}


// =============================
// MODALES AIDE
// =============================

function ouvrirLegendePopup()  { document.getElementById("helpModal").classList.remove("hidden"); }
function fermerLegendePopup()  { document.getElementById("helpModal").classList.add("hidden"); }
function ouvrirHelpToolModal() { document.getElementById("helpToolModal").classList.remove("hidden"); }
function fermerHelpToolModal() { document.getElementById("helpToolModal").classList.add("hidden"); }
