// Apartamenty Pilice – service worker
// Strategia "najpierw sieć": gdy telefon jest online, zawsze pobieramy najnowszą
// wersję strony. Kopia z pamięci podręcznej jest używana tylko offline.
// Zmiana CACHE_NAME usuwa stare kopie zapisane u gości.

const CACHE_NAME = 'pilice-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/index_en.html',
  '/index_de.html',
  '/trasy.html',
  '/trasy.js',
  '/css/style.css',
  '/js/main.js',
  '/manifest.json'
];

// Instalacja: zapisz podstawowe strony i od razu przejmij kontrolę
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Aktywacja: usuń stare pamięci podręczne (np. 'pilice-v1')
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Pobieranie: najpierw sieć, a gdy brak internetu – kopia z pamięci podręcznej
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return; // linki zewnętrzne (Google Maps, YouTube itp.) obsługuje przeglądarka
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          cached || (request.mode === 'navigate' ? caches.match('/index.html') : undefined)
        )
      )
  );
});
