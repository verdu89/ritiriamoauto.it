// /js/klaro-config.js
var klaroConfig = {
  version: 1,
  elementID: "klaro",
  storageMethod: "localStorage",
  cookieName: "ra-consent",
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  default: false,
  privacyPolicy: "/privacy.html",
  cookiePolicy: "/cookie.html",

  translations: {
    it: {
      consentModal: {
        title: "Preferenze cookie",
        description:
          "Usiamo cookie tecnici e, previo consenso, servizi di terze parti (es. Google Maps) per migliorare la navigazione.",
      },
      consentNotice: {
        description:
          "Usiamo cookie tecnici e, con il tuo consenso, cookie di terze parti (es. Google Maps).",
        learnMore: "Personalizza",
      },
      purposes: {
        necessary: "Tecnici",
        maps: "Mappe",
        analytics: "Statistiche",
        marketing: "Marketing",
      },
    },
  },

  services: [
    {
      name: "maps",
      title: "Google Maps",
      purposes: ["maps"],
      required: false,
      default: false,
      onlyOnce: true,
      cookies: [/^NID$/, /^CONSENT$/, /^SOCS$/],
    },
    {
      name: "analytics",
      title: "Analytics",
      purposes: ["analytics"],
      required: false,
      default: false,
    },
    {
      name: "marketing",
      title: "Marketing",
      purposes: ["marketing"],
      required: false,
      default: false,
    },
  ],
};
