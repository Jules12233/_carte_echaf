// =============================
// ÉTAT UTILISATEUR
// =============================

let authenticatedEmail = localStorage.getItem("authEmail") || null;
let currentUser        = null;
let currentService     = null;


// =============================
// AUTHENTIFICATION OTP
// =============================

// =============================
// MODALE OTP
// =============================

let _otpResolve = null; // résout la promesse en attente

function ouvrirOtpModal() {
  document.getElementById("otpStep1").style.display = "block";
  document.getElementById("otpStep2").style.display = "none";
  document.getElementById("otpEmail").value = "";
  document.getElementById("otpCode").value  = "";
  document.getElementById("otpMessage").textContent = "";
  document.getElementById("otpModal").classList.remove("hidden");
}

function fermerOtpModal() {
  document.getElementById("otpModal").classList.add("hidden");
  if (_otpResolve) {
    _otpResolve(null); // annulation → vote abandonné
    _otpResolve = null;
  }
}

async function otpEnvoyerCode() {
  const email = document.getElementById("otpEmail").value.trim();
  const msg   = document.getElementById("otpMessage");

  const regexVINCI = /^[a-zA-Z]+(?:[.-][a-zA-Z]+)*@vinci-construction\.com$/;
  if (!regexVINCI.test(email)) {
    msg.textContent = "Adresse mail invalide.";
    return;
  }

  msg.textContent = "Envoi en cours…";

  const res = await fetch(SEND_OTP_URL + "&email=" + encodeURIComponent(email));
  const data = await res.json();

  if (!data.success) {
    msg.textContent = "Erreur lors de l'envoi du code.";
    return;
  }

  msg.textContent = "";
  document.getElementById("otpStep1").style.display = "none";
  document.getElementById("otpStep2").style.display = "block";
  document.getElementById("otpCode").focus();

  // Stocker l'email temporairement pour la vérification
  document.getElementById("otpEmail").dataset.pending = email;
}

async function otpVerifierCode() {
  const email = document.getElementById("otpEmail").dataset.pending;
  const otp   = document.getElementById("otpCode").value.trim();
  const msg   = document.getElementById("otpMessage");

  if (!otp) {
    msg.textContent = "Veuillez saisir le code.";
    return;
  }

  msg.textContent = "Vérification…";

  const res = await fetch(
    VERIFY_OTP_URL +
    "&email=" + encodeURIComponent(email) +
    "&otp="   + encodeURIComponent(otp)
  );
  const data = await res.json();

  if (!data.valid) {
    msg.textContent = "Code incorrect ou expiré.";
    return;
  }

  // ✅ Succès
  authenticatedEmail = email;
  localStorage.setItem("authEmail", authenticatedEmail);

  document.getElementById("otpModal").classList.add("hidden");

  if (_otpResolve) {
    _otpResolve(authenticatedEmail);
    _otpResolve = null;
  }
}

async function authenticateUser() {
  if (authenticatedEmail) return authenticatedEmail;

  // Ouvrir la modale et attendre la résolution
  return new Promise(resolve => {
    _otpResolve = resolve;
    ouvrirOtpModal();
  });
}


// =============================
// MODALE SERVICE
// =============================

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
