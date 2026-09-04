/* ==========================================================================
   BASTAKLIM light – geführter Ablauf

   Wird nur von light.html geladen. Daten und Bildkacheln kommen aus app.js
   (window.BZT_KERN), die Klimastufe unter dem Mauszeiger aus
   data/klimaraster.js.

   Drei Schritte:
     1. Klick in die Karte  -> Klimastufe
     2. Wasserhaushalt -> Feuchtestufe -> Nährkraft (-> Besonderheit)
     3. Baumarten mit ihrem höchsten möglichen Anteil

   Bestockungszieltypen kommen hier bewusst nicht vor. Sie stecken in der
   Rechnung, werden aber nicht angezeigt – dafür gibt es index.html.
   ========================================================================== */
(function () {
  "use strict";

  // Beide Ansichten liegen jetzt in derselben Seite. Maßgeblich ist
  // deshalb nicht mehr die Betriebsart, sondern ob die Markierungen des
  // geführten Ablaufs überhaupt da sind – in intern.html etwa sind sie es
  // nicht, dort tut diese Datei nichts.
  if (!document.getElementById("schritt-1")) return;

  var K = window.BZT_KERN;
  if (!K) return;                       // app.js hat abgebrochen (Daten fehlen)
  var D = K.daten;

  /* ------------------------------------------------------------------ *
   * KARTE
   *
   * Maßstab: Mecklenburg-Vorpommern ist rund 290 km breit, das Raster
   * 360 Zellen – also grob 0,8 km je Zelle. Der Wert geht nur in die
   * Beschriftung ein ("im Umkreis von 5 km"), nicht in die Auswertung.
   * ------------------------------------------------------------------ */
  var KM_JE_ZELLE = 0.8;

  // Suchradien in Rasterzellen. Der erste Radius, in dem überhaupt Wald
  // liegt, entscheidet. Ohne Treffer im größten Radius sagt die App das.
  var RADIEN = [6, 12, 25];

  /* ------------------------------------------------------------------ *
   * REIHENFOLGEN UND BESCHRIFTUNGEN
   * ------------------------------------------------------------------ */

  // Der Zusatz im Standortkürzel. Steht in den Daten als kurzer Klartext;
  // hier nur die Beschriftung für die Schaltfläche.
  var ZUSATZ_TEXT = {
    "": "ohne Besonderheit",
    "wechselfeucht / wechselnass": "wechselfeucht oder wechselnass",
    "grundfeucht": "grundfeucht",
    "Plus-Standort": "Plus-Standort",
    "zeitweise überflutet": "zeitweise überflutet"
  };

  var GRADIENT_STUFEN = [
    { feld: "wasserhaushalt", titel: "Wasserhaushalt",
      frage: "Wie steht das Wasser?" },
    { feld: "feuchte", titel: "Feuchtestufe",
      frage: "Wie feucht ist der Boden?" },
    { feld: "naehrstoff", titel: "Nährkraft",
      frage: "Wie nährstoffreich ist der Boden?" },
    { feld: "zusatz", titel: "Besonderheit",
      frage: "Trifft eine Besonderheit zu?" }
  ];

  /* ------------------------------------------------------------------ *
   * ZUSTAND
   * ------------------------------------------------------------------ */

  var zustand = {
    schritt: 1,
    kli: null,               // "Tf" | "Tm" | "Tt"
    gradient: {},            // feld -> gewählter Wert
    stgr: [],                // Kürzel der passenden Standortgruppen
    stgrModus: "gefuehrt",
    mischung: []             // gewählte Baumarten (Kürzel), Reihenfolge = Klick
  };

  /* ------------------------------------------------------------------ *
   * KLEINE HELFER
   * ------------------------------------------------------------------ */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function id(s) { return document.getElementById(s); }

  // Reihenfolge, in der ein Feld in den Daten zuerst vorkommt. Die
  // Standortgruppen sind in build_data.py schon sinnvoll sortiert
  // (terrestrisch -> nass, reich -> arm); die übernehmen wir einfach.
  function werteInDatenreihenfolge(feld, menge) {
    var out = [];
    D.standorte.forEach(function (s) {
      if (!menge.has(s.id)) return;
      if (out.indexOf(s[feld]) === -1) out.push(s[feld]);
    });
    return out;
  }

  /* ================================================================== *
   * SCHRITT 1 – KLIMASTUFE AUS DER KARTE
   * ================================================================== */

  var raster = null;   // Uint8Array, 0 = kein Wald, 1..3 = Klimastufe

  // Kodierung: Anzahl (Ziffern) + ein Buchstabe, z. B. "240." oder "3b".
  // "." = kein Wald, "a".."c" = Index in stufen. Die Werte sind bewusst
  // Buchstaben – mit Ziffern wäre "831" mehrdeutig (Lauflänge 831 oder
  // Lauflänge 83 mit dem Wert 1?).
  function rasterDekodieren(r) {
    var feld = new Uint8Array(r.breite * r.hoehe);
    var pos = 0, i = 0, n = r.raster.length;
    while (i < n) {
      var zahl = 0;
      // Anzahl lesen – mindestens eine Ziffer
      while (i < n) {
        var c = r.raster.charCodeAt(i);
        if (c < 48 || c > 57) break;
        zahl = zahl * 10 + (c - 48);
        i++;
      }
      if (i >= n) break;
      var z = r.raster.charAt(i);
      i++;
      var wert = z === "." ? 0 : (z.charCodeAt(0) - 96);   // "a" -> 1
      for (var k = 0; k < zahl && pos < feld.length; k++) feld[pos++] = wert;
    }
    return feld;
  }

  /**
   * Klimastufen im Umkreis eines Rasterpunkts.
   * Sucht in wachsenden Radien, bis überhaupt Wald gefunden wird.
   * Liefert { radius, km, anteile: [{id, n}] } oder null.
   */
  function stufenUm(gx, gy) {
    var r = window.BZT_KLIMARASTER;
    for (var ri = 0; ri < RADIEN.length; ri++) {
      var rad = RADIEN[ri];
      var zaehler = [0, 0, 0];
      var gefunden = 0;
      for (var dy = -rad; dy <= rad; dy++) {
        var y = gy + dy;
        if (y < 0 || y >= r.hoehe) continue;
        var halb = Math.floor(Math.sqrt(rad * rad - dy * dy));
        for (var dx = -halb; dx <= halb; dx++) {
          var x = gx + dx;
          if (x < 0 || x >= r.breite) continue;
          var w = raster[y * r.breite + x];
          if (w) { zaehler[w - 1]++; gefunden++; }
        }
      }
      if (gefunden >= 8 || (gefunden > 0 && ri === RADIEN.length - 1)) {
        var anteile = r.stufen.map(function (s, i) {
          return { id: s, n: zaehler[i] };
        }).filter(function (a) { return a.n > 0; })
          .sort(function (a, b) { return b.n - a.n; });
        return {
          radius: rad,
          km: Math.round(rad * KM_JE_ZELLE),
          gesamt: gefunden,
          anteile: anteile
        };
      }
    }
    return null;
  }

  function karteAufbauen() {
    var halter = id("karte-halter");
    var bild = id("karte-bild");
    var marke = id("karte-marke");
    var befund = id("karte-befund");

    var r = window.BZT_KLIMARASTER;
    if (!r) {
      id("karte-fehlt").hidden = false;
      bild.hidden = true;
      return;
    }
    raster = rasterDekodieren(r);

    // Fehlt das Bild, bleibt die Direktwahl übrig.
    bild.addEventListener("error", function () {
      bild.hidden = true;
      id("karte-fehlt").hidden = false;
    });

    halter.addEventListener("click", function (ev) {
      if (bild.hidden) return;
      var kasten = bild.getBoundingClientRect();
      var fx = (ev.clientX - kasten.left) / kasten.width;
      var fy = (ev.clientY - kasten.top) / kasten.height;
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;

      marke.hidden = false;
      marke.style.left = (fx * 100) + "%";
      marke.style.top = (fy * 100) + "%";

      var treffer = stufenUm(Math.floor(fx * r.breite), Math.floor(fy * r.hoehe));
      befundZeigen(treffer, befund);
    });
  }

  function befundZeigen(treffer, befund) {
    befund.textContent = "";
    if (!treffer) {
      befund.className = "karte-befund karte-befund--leer";
      befund.appendChild(el("strong", null, "Dort liegt kein Wald."));
      befund.appendChild(el("span", null,
        " Im Umkreis von rund " + Math.round(RADIEN[RADIEN.length - 1] * KM_JE_ZELLE) +
        " km ist keine Fläche eingefärbt. Bitte näher an einen Wald klicken " +
        "oder die Klimastufe rechts direkt wählen."));
      return;
    }

    befund.className = "karte-befund";
    var beste = treffer.anteile[0];
    var stufe = D.klimastufen[iKli(beste.id)];

    befund.appendChild(el("strong", null,
      "Klimastufe " + stufe.kurz + " – " + stufe.name));

    var teile = treffer.anteile.map(function (a) {
      return a.id + " " + Math.round(100 * a.n / treffer.gesamt) + " %";
    }).join(" · ");
    befund.appendChild(el("span", "karte-befund-detail",
      "Wald im Umkreis von rund " + treffer.km + " km: " + teile));

    if (treffer.anteile.length > 1) {
      befund.appendChild(el("span", "karte-befund-detail",
        "Gemischtes Gebiet – bitte prüfen und gegebenenfalls rechts ändern."));
    }
    // Der Klick in die Karte ist die Antwort auf Schritt 1 – also geht es
    // gleich weiter. Vorher musste man die vorgeschlagene Klimastufe rechts
    // noch einmal bestätigen, was niemand erwartet.
    klimaWahlSetzen(beste.id, true);
  }

  function iKli(kuerzel) {
    for (var i = 0; i < D.klimastufen.length; i++) {
      if (D.klimastufen[i].id === kuerzel) return i;
    }
    return 0;
  }

  function klimaWahlAufbauen() {
    var box = id("klima-wahl");
    box.textContent = "";
    D.klimastufen.forEach(function (k) {
      var b = el("button", "klima-knopf");
      b.type = "button";
      b.dataset.kli = k.id;
      b.appendChild(K.thumb("kli", k.kurz, k.slug));
      var txt = el("span", "klima-text");
      txt.appendChild(el("strong", null, k.kurz));
      txt.appendChild(el("span", null, k.name));
      b.appendChild(txt);
      b.addEventListener("click", function () { klimaWahlSetzen(k.id, true); });
      box.appendChild(b);
    });
  }

  function klimaWahlSetzen(kuerzel, weiter) {
    zustand.kli = kuerzel;
    Array.prototype.forEach.call(
      document.querySelectorAll("#klima-wahl .klima-knopf"),
      function (b) { b.classList.toggle("ist-gewaehlt", b.dataset.kli === kuerzel); });
    if (weiter) zeigeSchritt(2);
    gradientAufbauen();
    abgleichen();
  }

  /* ================================================================== *
   * SCHRITT 2 – STANDORT
   * ================================================================== */

  // Standortgruppen, die es mit der gewählten Klimastufe überhaupt gibt.
  function moeglicheStandorte() {
    var ki = iKli(zustand.kli);
    var menge = new Set();
    D.kombis.forEach(function (r) {
      if (r[0] === ki) menge.add(D.standorte[r[1]].id);
    });
    return menge;
  }

  // Die noch passenden Standortgruppen nach den bisher gesetzten Stufen.
  function passendeStandorte(bisStufe) {
    var moeglich = moeglicheStandorte();
    return D.standorte.filter(function (s) {
      if (!moeglich.has(s.id)) return false;
      for (var i = 0; i < GRADIENT_STUFEN.length; i++) {
        if (bisStufe != null && i >= bisStufe) break;
        var feld = GRADIENT_STUFEN[i].feld;
        var gewaehlt = zustand.gradient[feld];
        if (gewaehlt != null && s[feld] !== gewaehlt) return false;
      }
      return true;
    });
  }

  function gradientAufbauen() {
    var box = id("gradient");
    if (!box) return;
    box.textContent = "";

    for (var stufe = 0; stufe < GRADIENT_STUFEN.length; stufe++) {
      var def = GRADIENT_STUFEN[stufe];
      var kandidaten = passendeStandorte(stufe);
      var menge = new Set(kandidaten.map(function (s) { return s.id; }));
      var werte = werteInDatenreihenfolge(def.feld, menge);

      // Die vierte Stufe (Besonderheit) ist nur nötig, wenn danach
      // tatsächlich mehrere Standortgruppen übrig blieben. In 41 von 59
      // Fällen ist das Tripel eindeutig – dann wird sie weggelassen.
      if (def.feld === "zusatz") {
        if (kandidaten.length <= 1 || werte.length <= 1) break;
      }
      if (!werte.length) break;

      box.appendChild(stufeZeichnen(def, werte, stufe));

      // Weiter nur, wenn diese Stufe beantwortet ist
      if (zustand.gradient[def.feld] == null) break;
    }

    gradientAuswerten();
  }

  function stufeZeichnen(def, werte, nummer) {
    var block = el("div", "gradient-stufe");
    var kopf = el("div", "gradient-kopf");
    kopf.appendChild(el("b", null, def.titel));
    kopf.appendChild(el("span", null, def.frage));
    block.appendChild(kopf);

    var reihe = el("div", "gradient-reihe");
    werte.forEach(function (w) {
      var b = el("button", "gradient-knopf");
      b.type = "button";
      b.textContent = def.feld === "zusatz" ? (ZUSATZ_TEXT[w] || w || "ohne") : w;
      if (zustand.gradient[def.feld] === w) b.classList.add("ist-gewaehlt");
      b.addEventListener("click", function () {
        if (zustand.gradient[def.feld] === w) {
          delete zustand.gradient[def.feld];
        } else {
          zustand.gradient[def.feld] = w;
        }
        // Alles Feinere verwerfen, sonst bleiben unmögliche Reste stehen
        for (var i = nummer + 1; i < GRADIENT_STUFEN.length; i++) {
          delete zustand.gradient[GRADIENT_STUFEN[i].feld];
        }
        gradientAufbauen();
      });
      reihe.appendChild(b);
    });
    block.appendChild(reihe);
    return block;
  }

  function gradientAuswerten() {
    var befund = id("gradient-befund");
    var treffer = passendeStandorte(null);

    // Die ersten drei Stufen müssen beantwortet sein. Die vierte
    // (Besonderheit) nicht: Bleiben danach mehrere Standortgruppen übrig,
    // wird das Ergebnis über sie vereinigt und die Stufe steht als
    // Verfeinerung bereit. So sieht man sofort etwas.
    var offen = ["wasserhaushalt", "feuchte", "naehrstoff"].some(function (f) {
      return zustand.gradient[f] == null;
    });

    if (offen) {
      befund.textContent = treffer.length + " Standortgruppen kommen noch in Frage.";
      zustand.stgr = [];
      zeigeErgebnis(false);
      return;
    }

    // Die Mischung gilt für einen Standort; ändert er sich, ist sie hinfällig.
    zustand.mischung = [];
    zustand.stgr = treffer.map(function (s) { return s.id; });
    if (!treffer.length) {
      befund.textContent = "Diese Kombination kommt in der Zieltabelle nicht vor.";
      zeigeErgebnis(false);
      return;
    }

    befund.textContent = treffer.length === 1
      ? "Standortgruppe " + treffer[0].id + " (" + treffer[0].kartiercode + ")"
      : "Mehrere Standortgruppen passen: " +
        treffer.map(function (s) { return s.id; }).join(", ") +
        ". Das Ergebnis gilt für alle zusammen – mit der Besonderheit oben " +
        "lässt es sich eingrenzen.";
    zeigeErgebnis(true);
  }

  /* --- Standortgruppe direkt wählen ----------------------------------- */

  function direktAufbauen() {
    var liste = id("stgr-liste");
    var suche = (id("stgr-suche").value || "").trim().toLowerCase();
    var moeglich = moeglicheStandorte();
    liste.textContent = "";

    var gruppeAktuell = null;
    D.standorte.forEach(function (s) {
      if (!moeglich.has(s.id)) return;
      var text = (s.id + " " + s.kartiercode + " " + s.gruppe + " " +
                  s.feuchte + " " + s.naehrstoff + " " + s.zusatz).toLowerCase();
      if (suche && text.indexOf(suche) === -1) return;

      if (s.gruppe !== gruppeAktuell) {
        gruppeAktuell = s.gruppe;
        liste.appendChild(el("p", "tiles-group", s.gruppe));
      }

      // Gleicher Kachelaufbau wie in der Profi-Version, damit das
      // Aussehen und das CSS dieselben bleiben.
      var b = el("button", "tile");
      b.type = "button";
      b.setAttribute("aria-pressed",
        zustand.stgr.length === 1 && zustand.stgr[0] === s.id ? "true" : "false");
      b.title = [s.id, s.kartiercode, s.gruppe, s.feuchte, s.naehrstoff, s.zusatz]
        .filter(Boolean).join(" · ");
      b.appendChild(K.thumb("stgr", s.id, s.slug));
      var t = el("span", "tile-body");
      t.appendChild(el("span", "tile-code", s.id));
      t.appendChild(el("span", "tile-name", s.feuchte + " · " + s.naehrstoff));
      if (s.zusatz) t.appendChild(el("span", "tile-meta", s.zusatz));
      b.appendChild(t);
      b.addEventListener("click", function () {
        zustand.mischung = [];
        zustand.stgr = [s.id];
        zustand.gradient = {
          wasserhaushalt: s.wasserhaushalt,
          feuchte: s.feuchte,
          naehrstoff: s.naehrstoff,
          zusatz: s.zusatz
        };
        direktAufbauen();
        gradientAufbauen();
        zeigeErgebnis(true);
        id("schritt-3").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      liste.appendChild(b);
    });
  }

  /* ================================================================== *
   * SCHRITT 3 – BAUMARTEN
   * ================================================================== */

  // Baumarten je Zieltyp mit Rang und Höchstanteil. Aufgebaut wie in
  // app.js: Die Gruppen stehen nach Rang sortiert, die erste gewinnt.
  var artenJeBzt = D.bzt.map(function (b) {
    var m = new Map();
    b.gruppen.forEach(function (g) {
      g.arten.forEach(function (a) {
        if (!m.has(a)) m.set(a, { rang: g.rang, max: g.max || 0 });
      });
    });
    return m;
  });

  /**
   * Werte je Baumart über eine Menge von Kombinationen.
   * max  = höchster Anteil in einem dieser Zieltypen
   * rang = bester Rang (1 = führende Baumart)
   */
  function artStatistik(rows) {
    var stat = new Map();
    rows.forEach(function (r) {
      artenJeBzt[r[2]].forEach(function (info, code) {
        var e = stat.get(code);
        if (!e) { e = { code: code, max: 0, rang: 9 }; stat.set(code, e); }
        if (info.max > e.max) e.max = info.max;
        if (info.rang < e.rang) e.rang = info.rang;
      });
    });
    return stat;
  }

  // Nur die Zieltypen, die alle gewählten Baumarten zugleich enthalten.
  // Genau das heißt "mischbar": Es muss einen Zieltyp geben, in dem sie
  // gemeinsam vorkommen dürfen – nicht jede Art passt zu jeder.
  function rowsFuerMischung(rows, mischung) {
    if (!mischung.length) return rows;
    return rows.filter(function (r) {
      var arten = artenJeBzt[r[2]];
      for (var i = 0; i < mischung.length; i++) {
        if (!arten.has(mischung[i])) return false;
      }
      return true;
    });
  }

  function zeigeErgebnis(an) {
    var abschnitt = id("schritt-3");
    if (!an || !zustand.kli || !zustand.stgr.length) {
      abschnitt.hidden = true;
      schrittLeiste(2);
      abgleichen();          // Klimastufe allein soll auch schon greifen
      return;
    }

    var alleRows = K.baumartenFuer(zustand.kli, zustand.stgr).rows;

    // Baumarten, die auf diesem Standort überhaupt vorkommen
    var statAlle = artStatistik(alleRows);

    // Baumarten, die zur bisherigen Auswahl noch dazupassen. Ohne Auswahl
    // ist das dieselbe Menge.
    var passendRows = rowsFuerMischung(alleRows, zustand.mischung);
    var statJetzt = artStatistik(passendRows);

    var arten = [];
    statAlle.forEach(function (e) {
      var art = D.baumarten[iBa(e.code)];
      if (!art) return;
      var jetzt = statJetzt.get(e.code);
      arten.push({
        art: art,
        gewaehlt: zustand.mischung.indexOf(e.code) !== -1,
        moeglich: !!jetzt,
        // Anteil und Rang gelten für die aktuelle Mischung: Kommt eine
        // Baumart dazu, fallen Zieltypen weg und der Höchstanteil der
        // übrigen sinkt oft.
        max: jetzt ? jetzt.max : e.max,
        rang: jetzt ? jetzt.rang : e.rang
      });
    });
    arten.sort(function (a, b) {
      return b.max - a.max || a.rang - b.rang ||
             a.art.name.localeCompare(b.art.name, "de");
    });

    var gewaehlt = arten.filter(function (a) { return a.gewaehlt; });
    // Rang 1 und 2 sind die bestandesbildenden Baumarten des Zieltyps,
    // Rang 3 ist die lange Liste der Mischbaumarten.
    var haupt = arten.filter(function (a) {
      return !a.gewaehlt && a.moeglich && a.rang <= 2;
    });
    var rest = arten.filter(function (a) {
      return !a.gewaehlt && a.moeglich && a.rang > 2;
    });
    var raus = arten.filter(function (a) { return !a.moeglich; });

    var stufe = D.klimastufen[iKli(zustand.kli)];
    id("ergebnis-kopf").textContent =
      "Klimastufe " + stufe.kurz + " (" + stufe.name + "), Standort " +
      zustand.stgr.join(" / ") + " – " + arten.length + " Baumarten möglich.";

    mischungZeigen(gewaehlt, raus.length);

    baumlisteZeichnen(id("baumliste-haupt"), haupt);
    baumlisteZeichnen(id("baumliste-rest"), rest);
    baumlisteZeichnen(id("baumliste-raus"), raus);

    var mehr = id("baumliste-mehr");
    mehr.hidden = rest.length === 0;
    id("mehr-anzahl").textContent =
      rest.length + " weitere Mischbaumarten anzeigen";

    var raus_box = id("baumliste-raus-box");
    raus_box.hidden = raus.length === 0;
    id("raus-anzahl").textContent = raus.length +
      " Baumarten passen nicht zu dieser Mischung";

    abschnitt.hidden = false;
    schrittLeiste(3);
    abgleichen();
  }

  /* --- Hinüber in die Profi-Ansicht ------------------------------------- *
   *
   * Beide Ansichten stehen in derselben Seite. Wer hier einen Standort
   * gefunden hat und oben auf "professional" umschaltet, soll ihn dort
   * gesetzt vorfinden – sonst wäre der Umschalter ein Neuanfang.
   *
   * Übergeben werden Klimastufe, Standort und die gewählte Mischung; die
   * BZT bleiben offen, sie ergeben sich dort aus den Filtern. Gibt es die
   * vier Spalten nicht (eigenständige Light-Seite), tut setzeAuswahl
   * nichts.
   * --------------------------------------------------------------------- */

  function abgleichen() {
    if (!K.setzeAuswahl) return;
    K.setzeAuswahl({
      kli: zustand.kli ? [zustand.kli] : [],
      stgr: zustand.stgr.slice(),
      bzt: [],
      ba: zustand.mischung.slice()
    });
  }

  /* --- Die gewählte Mischung ------------------------------------------- */

  function mischungZeigen(gewaehlt, ausgeschlossen) {
    var box = id("mischung");
    var chips = id("mischung-arten");
    var text = id("mischung-text");
    chips.textContent = "";

    if (!gewaehlt.length) {
      box.classList.remove("ist-aktiv");
      text.textContent =
        "Baumarten anklicken, um eine Mischung zusammenzustellen. " +
        "Es werden dann nur noch die Baumarten angeboten, die sich damit " +
        "tatsächlich mischen lassen – und die Anteile gelten für die Mischung.";
      return;
    }

    box.classList.add("ist-aktiv");
    gewaehlt.forEach(function (a) {
      var chip = el("button", "mischung-chip");
      chip.type = "button";
      chip.title = "aus der Mischung nehmen";
      chip.appendChild(el("b", null, a.art.name));
      chip.appendChild(el("span", null, "bis " + a.max + " %"));
      chip.appendChild(el("i", null, "×"));
      chip.addEventListener("click", function () { mischungUmschalten(a.art.code); });
      chips.appendChild(chip);
    });

    var summe = gewaehlt.reduce(function (n, a) { return n + a.max; }, 0);
    text.textContent = gewaehlt.length === 1
      ? "Eine Baumart gewählt. Die Liste unten zeigt jetzt nur noch, was " +
        "sich damit mischen lässt" +
        (ausgeschlossen ? " – " + ausgeschlossen + " fallen weg." : ".")
      : gewaehlt.length + " Baumarten gewählt, zusammen bis " + summe + " %. " +
        "Die Höchstanteile gelten für diese Mischung" +
        (ausgeschlossen ? "; " + ausgeschlossen + " Baumarten passen nicht dazu." : ".");
  }

  function mischungUmschalten(code) {
    var i = zustand.mischung.indexOf(code);
    if (i === -1) zustand.mischung.push(code);
    else zustand.mischung.splice(i, 1);
    zeigeErgebnis(true);
  }

  // Rang der Baumart im Zieltyp – das ist etwas anderes als ihr Anteil.
  // Jeder BZT hat drei Baumartengruppen: die führende Baumart, die zweite
  // bestandesbildende und die Mischbaumarten. Zwei Arten können denselben
  // Höchstanteil haben und trotzdem in verschiedenen Rängen stehen; genau
  // das kodiert die grüne Hinterlegung, deshalb steht sie auch in der
  // Legende über der Liste.
  var RANG_TEXT = {
    1: "führende Baumart",
    2: "bestandesbildend",
    3: "Mischbaumart"
  };

  function baumlisteZeichnen(box, arten) {
    box.textContent = "";
    arten.forEach(function (a) {
      // Jede Karte ist ein Schalter: anklicken nimmt die Baumart in die
      // Mischung auf, nochmal anklicken wieder heraus.
      var karte = el("button", "baum" +
        (a.rang === 1 && a.moeglich ? " baum--fuehrend" : "") +
        (a.gewaehlt ? " baum--gewaehlt" : "") +
        (a.moeglich ? "" : " baum--raus"));
      karte.type = "button";
      karte.setAttribute("aria-pressed", a.gewaehlt ? "true" : "false");
      karte.disabled = !a.moeglich;
      karte.title = a.moeglich
        ? a.art.latVoll + (a.gewaehlt ? " – aus der Mischung nehmen"
                                      : " – zur Mischung hinzufügen")
        : a.art.latVoll + " – lässt sich mit der gewählten Mischung nicht " +
          "in einem Zieltyp zusammenbringen";

      karte.appendChild(K.thumb("ba", a.art.code, a.art.slug));
      var t = el("div", "baum-text");
      t.appendChild(el("b", null, a.art.name));
      t.appendChild(el("i", null, a.art.lat));
      karte.appendChild(t);
      var wert = el("div", "baum-anteil");
      wert.appendChild(el("b", null, a.moeglich ? "bis " + a.max + " %" : "–"));
      wert.appendChild(el("span", null,
        a.moeglich ? (RANG_TEXT[a.rang] || "") : "nicht mischbar"));
      karte.appendChild(wert);
      karte.addEventListener("click", function () {
        mischungUmschalten(a.art.code);
      });
      box.appendChild(karte);
    });
  }

  function iBa(code) {
    for (var i = 0; i < D.baumarten.length; i++) {
      if (D.baumarten[i].code === code) return i;
    }
    return -1;
  }

  /* ================================================================== *
   * ABLAUF
   * ================================================================== */

  function zeigeSchritt(n) {
    zustand.schritt = Math.max(zustand.schritt, n);
    var war = id("schritt-2").hidden;
    id("schritt-2").hidden = n < 2;
    if (n >= 2) {
      direktAufbauen();
      // Nur beim ersten Öffnen scrollen. Wer in der Karte nachkorrigiert,
      // soll nicht jedes Mal nach unten gerissen werden.
      if (war) id("schritt-2").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    schrittLeiste(n);
  }

  function schrittLeiste(n) {
    Array.prototype.forEach.call(id("schritte").children, function (li) {
      var s = Number(li.dataset.schritt);
      li.classList.toggle("ist-aktiv", s === n);
      li.classList.toggle("ist-fertig", s < n);
    });
  }

  function zuruecksetzen() {
    zustand.kli = null;
    zustand.gradient = {};
    zustand.stgr = [];
    zustand.mischung = [];
    zustand.schritt = 1;
    id("karte-marke").hidden = true;
    id("karte-befund").className = "karte-befund";
    id("karte-befund").textContent = "Noch nichts ausgewählt.";
    Array.prototype.forEach.call(
      document.querySelectorAll("#klima-wahl .klima-knopf"),
      function (b) { b.classList.remove("ist-gewaehlt"); });
    id("schritt-2").hidden = true;
    id("schritt-3").hidden = true;
    id("stgr-suche").value = "";
    schrittLeiste(1);
    abgleichen();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --- Ereignisse ------------------------------------------------------ */

  document.querySelectorAll("[data-stgrmodus]").forEach(function (b) {
    b.addEventListener("click", function () {
      zustand.stgrModus = b.dataset.stgrmodus;
      document.querySelectorAll("[data-stgrmodus]").forEach(function (o) {
        var an = o === b;
        o.classList.toggle("is-on", an);
        o.setAttribute("aria-pressed", an ? "true" : "false");
      });
      id("stgr-gefuehrt").hidden = zustand.stgrModus !== "gefuehrt";
      id("stgr-direkt").hidden = zustand.stgrModus !== "direkt";
      if (zustand.stgrModus === "direkt") direktAufbauen();
    });
  });

  id("stgr-suche").addEventListener("input", direktAufbauen);
  id("light-reset").addEventListener("click", zuruecksetzen);
  id("light-zurueck").addEventListener("click", function () {
    id("schritt-2").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  id("light-drucken").addEventListener("click", function () { window.print(); });

  /* --- Start ----------------------------------------------------------- */

  klimaWahlAufbauen();
  karteAufbauen();
  schrittLeiste(1);
})();
