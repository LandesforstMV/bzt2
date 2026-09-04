/* ==========================================================================
   BASTAKLIM – Service Worker

   Er macht aus der Seite eine installierbare App: Ohne ihn bietet der
   Browser bestenfalls eine Verknüpfung an, kein eigenes Symbol und keinen
   Start ohne Adresszeile. Nebenbei läuft die App danach auch ohne Netz.

   Wird von app.js registriert, aber NUR über http/https. Beim Öffnen per
   Doppelklick (file://) sperrt der Browser Service Worker ganz – die App
   muss dort auch ohne funktionieren, und sie tut es.

   Zwei Vorräte, mit Absicht getrennt:

     RUMPF   Die wenigen Dateien, ohne die nichts geht: HTML, CSS, die
             Skripte und die Daten. Zusammen unter 400 kB. Sie werden beim
             Installieren komplett geholt, damit die App auch beim ersten
             Start ohne Netz vollständig ist.

     LAUFEND Alles andere – Kachelbilder, Karten, Piktogramme. Davon gibt
             es über 200 Dateien mit zusammen 32 MB; die alle im Voraus zu
             laden wäre unhöflich. Sie landen im Vorrat, sobald sie zum
             ersten Mal gebraucht werden.

   Die PDFs unter dokumente/ bleiben außen vor: 23 MB, die niemand im
   Hintergrund heruntergeladen haben will. Sie kommen aus dem Netz.

   ⚠️ Beim Ändern von Dateien VERSION hochzählen. Sonst behält der Browser
   den alten Vorrat und die Änderung kommt nie an.
   ========================================================================== */

var VERSION = "bastaklim-v5";
var RUMPF_VORRAT = VERSION + "-rumpf";
var LAUFEND_VORRAT = VERSION + "-laufend";

// Relativ zum Ort dieser Datei – so läuft es auch unter
// https://name.github.io/projekt/ ohne Anpassung.
var RUMPF = [
  "./",
  "./index.html",
  "./light.html",
  "./styles.css",
  "./app.js",
  "./light.js",
  "./data/bzt_data.js",
  "./data/klimaraster.js",
  "./assets/klimastufe/karte.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./manifest.webmanifest"
];

// Nicht in den Vorrat: zu groß und selten gebraucht.
var NIE_SPEICHERN = /\/dokumente\//;

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(RUMPF_VORRAT).then(function (vorrat) {
      // Einzeln statt addAll: Fehlt eine Datei (etwa light.html in einer
      // Teilveröffentlichung), soll nicht die ganze Installation scheitern.
      return Promise.all(RUMPF.map(function (pfad) {
        return vorrat.add(pfad).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) {
        return n.indexOf("bastaklim-") === 0 &&
               n !== RUMPF_VORRAT && n !== LAUFEND_VORRAT;
      }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  var anfrage = ev.request;
  if (anfrage.method !== "GET") return;

  var url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;
  if (NIE_SPEICHERN.test(url.pathname)) return;

  // Seitenaufrufe: erst Netz, dann Vorrat. So kommt eine neue Fassung an,
  // sobald es Netz gibt, und offline zeigt sie trotzdem etwas.
  if (anfrage.mode === "navigate") {
    ev.respondWith(
      fetch(anfrage).then(function (antwort) {
        var kopie = antwort.clone();
        caches.open(RUMPF_VORRAT).then(function (v) { v.put(anfrage, kopie); });
        return antwort;
      }).catch(function () {
        return caches.match(anfrage).then(function (t) {
          return t || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // Alles andere: erst Vorrat, dann Netz. Bilder und Daten ändern sich
  // nur, wenn neu veröffentlicht wird – dann greift die neue VERSION.
  ev.respondWith(
    caches.match(anfrage).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(anfrage).then(function (antwort) {
        // Fehlende Bilder nicht aufheben: thumb() probiert mehrere
        // Endungen durch, da sind 404er der Normalfall.
        if (antwort && antwort.ok && antwort.type === "basic") {
          var kopie = antwort.clone();
          caches.open(LAUFEND_VORRAT).then(function (v) {
            v.put(anfrage, kopie);
          });
        }
        return antwort;
      });
    })
  );
});
