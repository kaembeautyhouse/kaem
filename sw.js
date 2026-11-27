/* KAÉM App · Service worker
   Objetivo único: que la app ABRA aunque no haya señal, sin cambiar cómo funciona con internet.
   · index.html (la app): primero la red; si no responde en 4 s o no hay señal, la última copia guardada.
   · Librerías con versión fija (CDN) y fuentes: se guardan la primera vez y se reutilizan.
   · NUNCA intercepta el servidor (Apps Script), Shopify, WhatsApp ni el catálogo público.
   Para desactivarlo en un equipo: abrir la app con  #reset  al final de la dirección. */
var VERSION = 'kaem-app-v2';
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

/* ——— Avisos (notificaciones push de Firebase) ———
   El servidor manda solo datos (titulo, cuerpo, url, tag); aquí se muestran. Sin datos del cliente. */
self.addEventListener('push', function (e) {
  var d = {};
  try { var p = e.data ? e.data.json() : {}; d = (p && (p.data || p.notification)) ? (p.data || p.notification) : (p || {}); } catch (x) { d = {}; }
  var titulo = d.titulo || d.title || 'KAÉM';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.cuerpo || d.body || '', icon: 'logo.png', badge: 'logo.png', tag: d.tag || 'kaem', renotify: true, data: { url: d.url || './index.html' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { try { cs[i].postMessage({ kaem: 'abrir-empaque' }); } catch (x) {} return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});

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
      // 'no-cache': siempre revalida contra el servidor (una petición liviana). Sin esto, el caché HTTP del navegador
      // (GitHub Pages permite 10 min) podía seguir entregando la app VIEJA después de una actualización.
      fetch(req, { cache: 'no-cache' }).then(function (resp) {
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
