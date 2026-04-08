// =============================
// CONFIG OTP
// =============================

const SEND_OTP_URL =
  "https://script.google.com/macros/s/AKfycbzAzJ-J3eryTHwyetoMif6lydo7OUd3G0FQuKjCcmt_QMQgnacnAFglOewQj5QjScOhdQ/exec?action=send";

const VERIFY_OTP_URL =
  "https://script.google.com/macros/s/AKfycbzAzJ-J3eryTHwyetoMif6lydo7OUd3G0FQuKjCcmt_QMQgnacnAFglOewQj5QjScOhdQ/exec?action=verify";


// =============================
// CONFIG GOOGLE FORM + API
// =============================

const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfbclx6nrgmB311-Rmx7z3tJ_8Kq2Ao1eaZETsrPoemIY130A/formResponse";

const GF_ENTRY = {
  id:       "entry.1330851147",
  service:  "entry.662387729",
  etat:     "entry.1551408270",
  email:    "entry.2001127738",
  date_iso: "entry.1826740746"
};

const API_URL = "https://script.google.com/macros/s/AKfycbzwzovtRNEPYVuhoPlkS5dMPXJI1Ai5TZgH3tXS80y9mrxA7YRtNVYw1iNtB5IimpD1aQ/exec";


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
// UTILITAIRES
// =============================

function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
