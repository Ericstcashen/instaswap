// Resolves where the app talks to, in both contexts:
//  - Served from the web (https://…onrender.com)  → same-origin, relative API.
//  - Inside the native app (origin = capacitor://…) → call the live backend,
//    and always build share links against the public web URL so guests can open them.
window.INSTASWAP = (function () {
  var PUBLIC_URL = 'https://instaswap.onrender.com';
  var onWeb = (location.origin || '').indexOf('http') === 0;
  return {
    api: onWeb ? '' : PUBLIC_URL,   // prefix for /api/* fetches
    site: onWeb ? location.origin : PUBLIC_URL // base for QR + share links
  };
})();
