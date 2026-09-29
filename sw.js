/* KAÉM App · Service worker
   Objetivo único: que la app ABRA aunque no haya señal, sin cambiar cómo funciona con internet.
   · index.html (la app): primero la red; si no responde en 4 s o no hay señal, la última copia guardada.
   · Librerías con versión fija (CDN) y fuentes: se guardan la primera vez y se reutilizan.
   · NUNCA intercepta el servidor (Apps Script), Shopify, WhatsApp ni el catálogo público.
   Para desactivarlo en un equipo: abrir la app con  #reset  al final de la dirección. */
var VERSION = 'kaem-app-v1';
var APP = './index.html';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.add(APP); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('kaem-') === 0 && k !== VERSION; })
                         .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function esLaApp(req, url) {
  return req.mode === 'navigate' && url.origin === self.location.origin && /\/(index\.html)?$/.test(url.pathname);
}
function esLibreriaFija(url) {
  return url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com' ||
         url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (x) { return; }

  if (esLaApp(req, url)) {
    e.respondWith(new Promise(function (resolve) {
      var listo = false;
      var deCache = function () { return caches.match(APP).then(function (r) { return r || caches.match(req); }); };
      var reloj = setTimeout(function () {
        deCache().then(function (r) { if (r && !listo) { listo = true; resolve(r); } });
      }, 4000);
      fetch(req).then(function (resp) {
        clearTimeout(reloj);
        if (resp && resp.ok) { var copia = resp.clone(); caches.open(VERSION).then(function (c) { c.put(APP, copia); }); }
        if (!listo) { listo = true; resolve(resp); }
      }).catch(function () {
        clearTimeout(reloj);
        deCache().then(function (r) { if (!listo) { listo = true; resolve(r || Response.error()); } });
      });
    }));
    return;
  }

  if (esLibreriaFija(url)) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) { var copia = resp.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
        return resp;
      });
    }));
  }
  // Todo lo demás (servidor, Shopify, catálogo, imágenes) sigue exactamente igual que sin service worker.
});
