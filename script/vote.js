// =============================
// ÉTAT VOTE EN ATTENTE
// =============================

let votePendingID   = null;
let votePendingEtat = null;


// =============================
// MODALE DATE
// =============================

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

function preselectDate(joursAjoutes) {
  const date = new Date();
  date.setDate(date.getDate() + joursAjoutes);

  document.getElementById("dateDay").value   = date.getDate();
  document.getElementById("dateMonth").value = date.getMonth() + 1;
  document.getElementById("dateYear").value  = date.getFullYear();
}


// =============================
// ENVOI DU VOTE
// =============================

async function sendVote(id, etat) {
  const email = await authenticateUser();
  if (!email) return;
  currentUser = email;

  votePendingID   = id;
  votePendingEtat = etat;

  if (!currentService) {
    ouvrirServiceModal();
    return;
  }

  if (etat === "utile") {
    ouvrirDateModal();
  } else {
    envoyerVote(id, etat, null);
  }
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

  const marker = markers.find(m => m.id === id);

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
    setTimeout(refreshStates, 3000);
  })
  .catch(err => console.error("Erreur POST:", err));
}
