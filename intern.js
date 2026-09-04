/* ==========================================================================
   BASTAKLIM intern – Vorbelegung über die Forstadresse

   Wird nur von intern.html geladen und sitzt über der gewohnten
   Profi-Ansicht: Forstamt wählen, Fläche suchen – die App setzt Klimastufe,
   Standort und die dort möglichen BZT als Filter. Ab da ist alles wie in
   index.html.

   Daten: data/forstadressen/index.js (Verzeichnis, wird sofort geladen) und
   data/forstadressen/fa-<n>.js (je ein Forstamt, wird bei Bedarf
   nachgeladen). Erzeugt von tools/build_forstadressen.py.

   Warum aufgeteilt: Der Datensatz hat rund 754.000 Flächen. Auf einmal wären
   das knapp 19 MB, die beim Öffnen der Seite gelesen werden müssten. So sind
   es 11 kB sofort und einmalig unter 800 kB, sobald ein Forstamt gewählt
   wird. Nachgeladen wird über ein eingefügtes <script>-Tag – das
   funktioniert auch unter file://, fetch() wäre dort gesperrt.
   ========================================================================== */
(function () {
  "use strict";

  // Die drei Ansichten liegen in derselben Seite. Maßgeblich ist deshalb,
  // ob es die Anmeldung überhaupt gibt – nicht die Betriebsart.
  if (!document.getElementById("anmeldung")) return;

  var K = window.BZT_KERN;
  if (!K) return;                       // app.js hat abgebrochen (Daten fehlen)
  var D = K.daten;

  var MAX_VORSCHLAEGE = 12;

  // Kartierhinweise, die als Warnung gelten. Trifft einer zu, wird der
  // Hinweis hervorgehoben statt nur klein mitgeführt: Ein Zieltyp, der auf
  // einer veralteten Standortkartierung beruht, ist mit Vorsicht zu lesen.
  // Weitere Muster hier ergänzen.
  var KARTIERUNG_WARNUNG = /veraltet|nicht kartiert|überschlägig|unsicher|fraglich/i;
  var TEIL_PFAD = function (nr) { return "data/forstadressen/fa-" + nr + ".js"; };

  // Wird erst nach der Anmeldung nachgeladen – vorher stehen die Namen der
  // Forstämter nirgends in der Seite.
  var index = null;
  var VERZEICHNIS = "data/forstadressen/index.js";

  // BZT-Nummer -> Kennung, für die Sätze aus den Teildateien
  var bztNachNr = {};
  D.bzt.forEach(function (b) { bztNachNr[b.nr] = b; });

  var amtWahl = document.getElementById("forstamt-wahl");
  var revierWahl = document.getElementById("revier-wahl");
  var feld = document.getElementById("adresse-suche");
  var liste = document.getElementById("adresse-liste");
  var treffer = document.getElementById("adresse-treffer");
  var warnung = document.getElementById("adresse-warnung");
  var stand = document.getElementById("adresse-stand");
  var loeschen = document.getElementById("adresse-loeschen");

  var teil = null;        // geladenes Forstamt
  var flaechen = [];      // ausgepackte Zeilen des geladenen Forstamts
  var revier = -1;        // gewähltes Revier, -1 = alle
  var markiert = -1;

  /* --- Hilfen ---------------------------------------------------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Angezeigt wird "kurz", nicht die Kennung: Die blaue Stufe heißt
  // "Tf, Tlf, Tlm", intern aber "Tf" (daran hängen Adresszeile, Raster und
  // Bilddateien). Beides auseinanderzuhalten ist Absicht.
  function kliStufe(kuerzel) {
    for (var i = 0; i < D.klimastufen.length; i++) {
      if (D.klimastufen[i].id === kuerzel) return D.klimastufen[i];
    }
    return null;
  }

  function kliAnzeige(kuerzel) {
    var k = kliStufe(kuerzel);
    return k ? k.kurz : kuerzel;
  }

  function nameKli(kuerzel) {
    var k = kliStufe(kuerzel);
    return k ? k.name : "";
  }

  // Klartext für Kürzel, die keine Standortgruppe sind ("nk" = nicht
  // kartiert, "Kx" = Komplexstandort, "SEE" = See). Die Tabelle steht in
  // tools/build_forstadressen.py und kommt über den Index mit.
  function sonderName(kuerzel) {
    var t = (index && index.sonderstandorte) || {};
    if (t[kuerzel]) return t[kuerzel];
    for (var k in t) {
      if (k.toLowerCase() === String(kuerzel).toLowerCase()) return t[k];
    }
    return null;
  }

  function standort(kuerzel) {
    for (var i = 0; i < D.standorte.length; i++) {
      if (D.standorte[i].id === kuerzel) return D.standorte[i];
    }
    return null;
  }

  // Die Forstadresse, wie sie gesprochen wird: Revier, Abteilung, dann die
  // Teilflächen. Eine Teilfläche heißt Unterabteilung + Nummer + Standort-
  // fläche, also "a2.2" – so tief, wie SCHL_GIS reicht ("4139_a_2_2").
  function adresse(f) {
    return teil.reviere[f.revier] + " " + f.abt +
           (f.teile.length ? " " + f.teile.join(", ") : "");
  }

  function kurzadresse(f) {
    return teil.reviere[f.revier] + " " + f.abt;
  }

  /* --- Zustand des Datensatzes ----------------------------------------- */

  function zustandMelden() {
    if (!index) {
      warnung.hidden = false;
      warnung.className = "adresse-warnung adresse-warnung--fehlt";
      warnung.textContent =
        "Der Forstadress-Datensatz fehlt (data/forstadressen/index.js). " +
        "Er entsteht aus data/intern_data.csv – siehe " +
        "tools/build_forstadressen.py. Die Filter darunter arbeiten " +
        "unverändert weiter.";
      amtWahl.disabled = true;
      revierWahl.disabled = true;
      feld.disabled = true;
      return false;
    }
    stand.textContent = Number(index.zeilen).toLocaleString("de-DE") +
      " Flächen · " + index.forstaemter.length + " Forstämter · Stand " +
      index.stand;
    return true;
  }

  /* --- Forstamt nachladen ---------------------------------------------- */

  function amtLaden(nr, danach) {
    if (teil && teil.nr === nr) { danach(); return; }

    feld.disabled = true;
    feld.placeholder = "wird geladen …";

    // Kein fetch: unter file:// ist es gesperrt. Ein <script>-Tag geht.
    var s = document.createElement("script");
    s.src = TEIL_PFAD(nr);
    s.onload = function () {
      teil = window.BZT_FORST_TEIL;
      flaechen = auspacken(teil);
      feld.disabled = false;
      feld.placeholder = "Revier, Abteilung, Unterabteilung …";
      s.remove();
      danach();
    };
    s.onerror = function () {
      feld.placeholder = "Datei nicht gefunden";
      warnung.hidden = false;
      warnung.className = "adresse-warnung adresse-warnung--fehlt";
      warnung.textContent = "Die Datei " + TEIL_PFAD(nr) + " fehlt. " +
        "Bitte tools/build_forstadressen.py erneut ausführen.";
      s.remove();
    };
    document.head.appendChild(s);
  }

  // Die Flächen stehen als eine Zeichenkette da: eine Zeile je Abteilung,
  // Felder mit Semikolon getrennt, alle Texte über Indizes, dahinter die
  // Teilflächen. Das ist gut halb so groß wie einzelne Objekte.
  //
  // Zusammengefasst ist nach allem, was die Antwort bestimmt. Innerhalb
  // einer Abteilung haben die Teilflächen dieselbe BASTA_ID und damit
  // dieselbe Klimastufe, denselben Standort und dieselben BZT – sie
  // getrennt aufzuführen brächte nichts als längere Vorschlagslisten.
  function auspacken(t) {
    var roh = t.flaechen ? t.flaechen.split("\n") : [];
    var aus = new Array(roh.length);
    for (var i = 0; i < roh.length; i++) {
      var f = roh[i].split(";");
      var teile = f[9] ? f[9].split(",") : [];
      aus[i] = {
        revier: +f[0], abt: f[1], kli: +f[2], stgr: +f[3], satz: +f[4],
        holzboden: f[5] === "1", boden: +f[6], hinweis: +f[7],
        altkartierung: f[8] === "1", teile: teile,
        // Suchtext einmal vorbereiten – das Feld sucht bei jedem Tastendruck
        suche: (t.reviere[+f[0]] + " " + f[1] + " " + teile.join(" ")).toLowerCase()
      };
    }
    return aus;
  }

  /* --- Suche ------------------------------------------------------------ */

  /**
   * Flächen des geladenen Forstamts, eingeschränkt auf das gewählte Revier
   * und auf die eingetippten Wörter.
   *
   * Ist ein Revier gewählt, liefert leerer Text die ersten Abteilungen –
   * so sieht man nach dem Klick aufs Revier sofort, was es dort gibt,
   * ohne raten zu müssen.
   */
  function suchen(text) {
    if (!flaechen.length) return [];
    var q = text.trim().toLowerCase();
    if (!q && revier < 0) return [];
    var worte = q ? q.split(/\s+/) : [];
    var out = [];
    for (var i = 0; i < flaechen.length && out.length < MAX_VORSCHLAEGE; i++) {
      var f = flaechen[i];
      if (revier >= 0 && f.revier !== revier) continue;
      var alle = true;
      for (var w = 0; w < worte.length; w++) {
        if (f.suche.indexOf(worte[w]) === -1) { alle = false; break; }
      }
      if (alle) out.push(f);
    }
    return out;
  }

  function vorschlaegeZeigen(gefunden) {
    liste.textContent = "";
    markiert = -1;
    if (!gefunden.length) {
      liste.hidden = true;
      feld.setAttribute("aria-expanded", "false");
      return;
    }
    gefunden.forEach(function (f, i) {
      var li = el("li", "adresse-vorschlag");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.dataset.pos = String(i);
      li.appendChild(el("b", null,
        revier >= 0 ? "Abt. " + f.abt +
                      (f.teile.length ? " " + f.teile.join(", ") : "")
                    : adresse(f)));
      // Der Standort steht vorn: Eine Abteilung kann mehrere Standorte
      // tragen, und dann unterscheiden sich zwei Vorschläge nur darin.
      var z = el("span", null);
      z.appendChild(el("b", "adresse-stgr", teil.stgr[f.stgr]));
      z.appendChild(document.createTextNode(
        " · " + kliAnzeige(index.klimastufen[f.kli]) +
        (f.teile.length > 1 ? " · " + f.teile.length + " Teilflächen" : "") +
        (f.altkartierung ? " · Alt-Kartierung" : "") +
        (f.holzboden ? "" : " · Nichtholzboden")));
      li.appendChild(z);
      li.addEventListener("mousedown", function (ev) {
        ev.preventDefault();          // Feld soll den Fokus behalten
        uebernehmen(f);
      });
      liste.appendChild(li);
    });
    liste.hidden = false;
    feld.setAttribute("aria-expanded", "true");
  }

  function markierungSetzen(neu) {
    var kinder = liste.children;
    if (!kinder.length) return;
    if (markiert >= 0) {
      kinder[markiert].classList.remove("ist-markiert");
      kinder[markiert].setAttribute("aria-selected", "false");
    }
    markiert = (neu + kinder.length) % kinder.length;
    kinder[markiert].classList.add("ist-markiert");
    kinder[markiert].setAttribute("aria-selected", "true");
    kinder[markiert].scrollIntoView({ block: "nearest" });
  }

  /* --- Übernehmen ------------------------------------------------------- */

  function uebernehmen(f) {
    feld.value = adresse(f);
    liste.hidden = true;
    feld.setAttribute("aria-expanded", "false");

    var kli = index.klimastufen[f.kli];
    var stgr = teil.stgr[f.stgr];
    var satz = teil.saetze[f.satz];
    var bzts = satz ? satz.split(",").map(function (nr) {
      var b = bztNachNr[+nr];
      return b ? b.id : null;
    }).filter(Boolean) : [];

    // Nicht jede Fläche lässt sich einem Zieltyp zuordnen: Nichtholzboden
    // trägt keinen, und ein Teil der Standortgruppen ("nk", "SEE", "Kx" …)
    // steht in der Zieltabelle gar nicht.
    //
    // In dem Fall wird bewusst KEIN Filter gesetzt – auch nicht die
    // Klimastufe allein. Sonst stünde unten eine gefilterte Liste, die so
    // aussähe, als gälte sie für diese Fläche. Stattdessen bleibt die
    // Ansicht unangetastet und der Treffer sagt, woran es liegt.
    var st = standort(stgr);
    var grund = !f.holzboden
      ? "Nichtholzboden – für solche Flächen ist kein Bestockungszieltyp " +
        "vorgesehen."
      : !st
        ? "Der Standort ist als „" + stgr + "“ geführt" +
          (sonderName(stgr) ? " (" + sonderName(stgr) + ")" : "") +
          " und damit keine der 83 Gruppen der Zieltabelle. Für diese Fläche " +
          "lässt sich kein Bestockungszieltyp bestimmen."
        : !bzts.length
          ? "Für Klimastufe " + kliAnzeige(kli) + " und Standort " + stgr +
            " verzeichnet " +
            "die Zieltabelle keinen Bestockungszieltyp."
          : null;

    if (grund) {
      K.setzeAuswahl({ kli: [], stgr: [], bzt: [], ba: [] });
    } else {
      // Die Vorbelegung geht durch dieselbe Auswahl wie ein Klick in den
      // Spalten – ab hier verhält sich die Seite wie die Profi-Version.
      K.setzeAuswahl({ kli: [kli], stgr: [stgr], bzt: bzts, ba: [] });
    }

    trefferZeigen(f, kli, stgr, grund ? [] : bzts, grund);
    loeschen.hidden = false;
  }

  function trefferZeigen(f, kli, stgr, bzts, grund) {
    treffer.textContent = "";
    treffer.hidden = false;
    treffer.className = "adresse-treffer" + (grund ? " adresse-treffer--ohne" : "");

    var kopf = el("div", "adresse-kopf");
    kopf.appendChild(el("b", null, teil.forstamt + ", " + kurzadresse(f)));
    if (f.teile.length) {
      kopf.appendChild(el("span", null,
        (f.teile.length === 1 ? "Teilfläche " : "Teilflächen ") +
        f.teile.join(", ")));
    }
    if (!f.holzboden) {
      kopf.appendChild(el("span", "adresse-marke", "Nichtholzboden"));
    }
    treffer.appendChild(kopf);

    var dl = el("dl", "adresse-werte");

    dl.appendChild(el("dt", null, "Klimastufe"));
    dl.appendChild(el("dd", null, kliAnzeige(kli) + " – " + nameKli(kli)));

    var st = standort(stgr);
    dl.appendChild(el("dt", null, "Standort"));
    dl.appendChild(el("dd", null, st
      ? stgr + " (" + st.kartiercode + ") – " + st.feuchte + " · " +
        st.naehrstoff + (st.zusatz ? " · " + st.zusatz : "")
      : stgr + (sonderName(stgr) ? " – " + sonderName(stgr)
                                  : " – keine Standortgruppe der Zieltabelle")));

    var bod = teil.boden[f.boden] || ["", ""];
    if (bod[0] && bod[0] !== "kein Langname") {
      dl.appendChild(el("dt", null, "Bodenform"));
      dl.appendChild(el("dd", null, bod[1] ? bod[0] + " – " + bod[1] : bod[0]));
    }

    if (bzts.length) {
      dl.appendChild(el("dt", null, "mögliche BZT"));
      dl.appendChild(el("dd", null, bzts.map(function (id) {
        for (var i = 0; i < D.bzt.length; i++) {
          if (D.bzt[i].id === id) return D.bzt[i].typ;
        }
        return id;
      }).join(" · ") + " (" + bzts.length + ")"));
    }

    treffer.appendChild(dl);

    // Antwort auf die naheliegende Frage: Gelten die aufgeführten
    // Teilflächen alle für diesen Standort? Ja – zusammengefasst wird nach
    // allem, was die Antwort bestimmt. Eine Teilfläche kann aber in
    // MEHREREN Gruppen stecken, wenn sie mehrere Standortzeilen trägt.
    // Dann steht sie in beiden Listen, und das muss dastehen.
    var weitere = flaechen.filter(function (g) {
      return g !== f && g.revier === f.revier && g.abt === f.abt;
    });
    if (weitere.length) {
      var codes = [];
      var doppelt = [];
      weitere.forEach(function (g) {
        var c = teil.stgr[g.stgr];
        if (codes.indexOf(c) === -1) codes.push(c);
        g.teile.forEach(function (t) {
          if (f.teile.indexOf(t) !== -1 && doppelt.indexOf(t) === -1) {
            doppelt.push(t);
          }
        });
      });
      var p2 = el("p", "adresse-weitere");
      p2.appendChild(el("strong", null,
        "Die Abteilung trägt weitere Standorte: "));
      p2.appendChild(document.createTextNode(codes.join(", ") + ". "));
      p2.appendChild(document.createTextNode(doppelt.length
        ? "Die Teilfläche" + (doppelt.length > 1 ? "n " : " ") +
          doppelt.join(", ") + (doppelt.length > 1 ? " kommen" : " kommt") +
          " dort ebenfalls vor – dieselbe Fläche ist mehrfach kartiert. " +
          "Die Angaben oben gelten für den Standort " + stgr + "."
        : "Die oben genannten Teilflächen gehören zu " + stgr + "."));
      treffer.appendChild(p2);
    }

    if (f.altkartierung) {
      var alt2 = el("p", "adresse-kartierhinweis adresse-kartierhinweis--warnung");
      alt2.appendChild(el("span", "adresse-kartierhinweis-zeichen", "⚠"));
      var at = el("span", "adresse-kartierhinweis-text");
      at.appendChild(el("strong", null, "Übertragene Alt-Kartierung. "));
      at.appendChild(document.createTextNode(
        "Der Standort stand im Datensatz in einer älteren Schreibweise und " +
        "wurde auf " + stgr + " übertragen. Vorsicht: alte " +
        "Standortsbeschreibung."));
      alt2.appendChild(at);
      treffer.appendChild(alt2);
    }

    var hinweis = teil.hinweise[f.hinweis];
    if (hinweis) {
      var warnt = KARTIERUNG_WARNUNG.test(hinweis);
      var box = el("p", "adresse-kartierhinweis" +
                       (warnt ? " adresse-kartierhinweis--warnung" : ""));
      if (warnt) {
        box.appendChild(el("span", "adresse-kartierhinweis-zeichen", "⚠"));
      }
      var txt = el("span", "adresse-kartierhinweis-text");
      txt.appendChild(el("strong", null, "Kartierung: "));
      txt.appendChild(document.createTextNode(hinweis));
      if (warnt) {
        txt.appendChild(el("span", "adresse-kartierhinweis-folge",
          "Standort und damit auch die Zieltypen beruhen auf dieser " +
          "Kartierung – bitte vor Ort prüfen."));
      }
      box.appendChild(txt);
      treffer.appendChild(box);
    }
    if (grund) {
      var box = el("p", "adresse-ohne");
      box.appendChild(el("strong", null, "Keine Zuweisung möglich. "));
      box.appendChild(document.createTextNode(grund));
      box.appendChild(el("span", null,
        " Es wurde deshalb kein Filter gesetzt – die Ansicht unten gilt " +
        "nicht für diese Fläche."));
      treffer.appendChild(box);
    } else {
      treffer.appendChild(el("p", "adresse-hinweis",
        "Als Filter gesetzt. Unten lässt sich wie gewohnt weiter eingrenzen."));
    }
  }

  function zuruecksetzen() {
    feld.value = "";
    liste.hidden = true;
    treffer.hidden = true;
    loeschen.hidden = true;
    if (revierWahl.options.length) revierWahl.selectedIndex = 0;
    revier = -1;
    K.setzeAuswahl({ kli: [], stgr: [], bzt: [], ba: [] });
  }

  /* --- Reviere ---------------------------------------------------------- */

  // Nach der Wahl des Forstamts stehen dessen Reviere zur Auswahl, mit der
  // Zahl der Abteilungen dahinter. Ein Revier zu wählen ist der übliche
  // Weg – die Abteilungsnummer allein ist über das ganze Forstamt nicht
  // unbedingt eindeutig.
  function reviereFuellen() {
    revierWahl.textContent = "";
    revier = -1;
    if (!teil) { revierWahl.disabled = true; return; }

    var anzahl = [];
    flaechen.forEach(function (f) {
      anzahl[f.revier] = (anzahl[f.revier] || 0) + 1;
    });

    revierWahl.appendChild(new Option(
      "alle Reviere (" + flaechen.length.toLocaleString("de-DE") + ")", "-1"));
    teil.reviere.map(function (name, i) {
      return { name: name, i: i, n: anzahl[i] || 0 };
    }).filter(function (r) {
      return r.n > 0;
    }).sort(function (a, b) {
      return a.name.localeCompare(b.name, "de");
    }).forEach(function (r) {
      revierWahl.appendChild(new Option(
        r.name + "  (" + r.n.toLocaleString("de-DE") + ")", String(r.i)));
    });
    revierWahl.disabled = false;
  }

  /* ================================================================== *
   * ANMELDUNG
   *
   * Forstamt und eines seiner Reviere. Verglichen wird nicht im Klartext:
   * data/forstadressen/zugang.js enthält gesalzene PBKDF2-Hashes der
   * gültigen Paare, die Eingabe wird genauso durchgerechnet.
   *
   * ⚠️ Das hält niemanden auf, der es darauf anlegt. Die Teildateien
   * (fa-<n>.js) liegen als gewöhnliche Dateien auf dem Server und sind
   * unter ihrer Adresse direkt abrufbar; und die Forstämter und Reviere
   * sind öffentlich bekannt, die Hashes also durchprobierbar. Es verhindert
   * das beiläufige Mitlesen, mehr nicht – und genau so steht es auch im
   * Anmeldeformular.
   * ================================================================== */

  var formular = document.getElementById("anmeldung");
  var fAmt = document.getElementById("anmeldung-amt");
  var fRevier = document.getElementById("anmeldung-revier");
  var fFehler = document.getElementById("anmeldung-fehler");
  var fKnopf = document.getElementById("anmeldung-los");
  var abmelden = document.getElementById("abmelden");

  function vereinheitlichen(text) {
    return String(text || "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  }

  function hexZuBytes(hex) {
    var a = new Uint8Array(hex.length / 2);
    for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
    return a;
  }

  function bytesZuHex(puffer) {
    return Array.prototype.map.call(new Uint8Array(puffer), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  /** PBKDF2 über "forstamt|revier", wie es build_forstadressen.py rechnet. */
  function pruefen(amt, revier) {
    var z = window.BZT_ZUGANG;
    // Die beiden Fälle auseinanderhalten: Ohne zugang.js gibt es gar keinen
    // Datensatz – dann ist "keine Kryptofunktionen" die falsche Auskunft
    // und schickt jemanden auf die Suche nach dem falschen Fehler.
    if (!z) return Promise.reject(new Error("kein-datensatz"));
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error("kryptolos"));
    }
    var text = vereinheitlichen(amt) + "|" + vereinheitlichen(revier);
    return crypto.subtle.importKey(
      "raw", new TextEncoder().encode(text), "PBKDF2", false, ["deriveBits"]
    ).then(function (schluessel) {
      return crypto.subtle.deriveBits({
        name: "PBKDF2", salt: hexZuBytes(z.salz),
        iterations: z.runden, hash: "SHA-256"
      }, schluessel, 128);
    }).then(function (bits) {
      return z.paare.indexOf(bytesZuHex(bits)) !== -1;
    });
  }

  function angemeldet(ja) {
    document.documentElement.dataset.intern = ja ? "frei" : "gesperrt";
    formular.hidden = ja;
    document.getElementById("adresse").hidden = !ja;
    try {
      if (ja) window.sessionStorage.setItem("bzt-intern", "frei");
      else window.sessionStorage.removeItem("bzt-intern");
    } catch (e) {}
  }

  function verzeichnisLaden(danach) {
    if (index) { danach(); return; }
    var s = document.createElement("script");
    s.src = VERZEICHNIS;
    s.onload = function () {
      index = window.BZT_FORST_INDEX || null;
      s.remove();
      danach();
    };
    s.onerror = function () {
      index = null; s.remove(); danach();
    };
    document.head.appendChild(s);
  }

  formular.addEventListener("submit", function (ev) {
    ev.preventDefault();
    fFehler.hidden = true;
    fKnopf.disabled = true;
    fKnopf.textContent = "wird geprüft …";

    pruefen(fAmt.value, fRevier.value).then(function (ok) {
      fKnopf.disabled = false;
      fKnopf.textContent = "Anmelden";
      if (!ok) {
        fFehler.hidden = false;
        fFehler.textContent =
          "Forstamt und Revier passen nicht zusammen. Das Revier muss zu " +
          "diesem Forstamt gehören.";
        fRevier.value = "";
        fRevier.focus();
        return;
      }
      fRevier.value = "";
      verzeichnisLaden(function () {
        angemeldet(true);
        starten();
      });
    }).catch(function (fehler) {
      fKnopf.disabled = false;
      fKnopf.textContent = "Anmelden";
      fFehler.hidden = false;
      fFehler.textContent = fehler && fehler.message === "kein-datensatz"
        ? "Es liegt noch kein Forstadress-Datensatz vor " +
          "(data/forstadressen/ fehlt). Er entsteht aus intern_data.csv " +
          "mit tools/build_forstadressen.py; erst danach ist eine " +
          "Anmeldung möglich."
        : "Die Anmeldung lässt sich in diesem Browser nicht prüfen " +
          "(keine Kryptofunktionen verfügbar).";
    });
  });

  if (abmelden) {
    abmelden.addEventListener("click", function () {
      zuruecksetzen();
      angemeldet(false);
      fAmt.focus();
    });
  }

  // Innerhalb einer Sitzung angemeldet bleiben – nicht darüber hinaus.
  var nochAngemeldet = false;
  try { nochAngemeldet = window.sessionStorage.getItem("bzt-intern") === "frei"; } catch (e) {}
  if (nochAngemeldet) {
    verzeichnisLaden(function () { angemeldet(true); starten(); });
  } else {
    angemeldet(false);
  }

  /* --- Aufbau ----------------------------------------------------------- */

  // Nur einmal aufbauen – nach Ab- und erneuter Anmeldung stünden sonst
  // die Forstämter doppelt in der Liste.
  var gestartet = false;

  function starten() {
  if (gestartet) return;
  gestartet = true;
  if (zustandMelden()) {
    amtWahl.appendChild(new Option("Forstamt wählen …", ""));
    index.forstaemter.forEach(function (a) {
      var o = new Option(
        a.forstamt + "  (" + Number(a.n).toLocaleString("de-DE") + ")", a.nr);
      amtWahl.appendChild(o);
    });

    amtWahl.addEventListener("change", function () {
      zuruecksetzen();
      var nr = Number(amtWahl.value);
      if (!nr) {
        teil = null; flaechen = [];
        reviereFuellen();
        feld.disabled = true; feld.value = "";
        return;
      }
      amtLaden(nr, function () {
        reviereFuellen();
        revierWahl.focus();
      });
    });

    revierWahl.addEventListener("change", function () {
      revier = Number(revierWahl.value);
      feld.value = "";
      treffer.hidden = true;
      feld.placeholder = revier >= 0
        ? "Abteilung, z. B. 4139"
        : "Revier, Abteilung, Teilfläche …";
      feld.focus();
      // Mit gewähltem Revier gleich die ersten Abteilungen anbieten
      vorschlaegeZeigen(suchen(""));
    });

    feld.addEventListener("input", function () {
      vorschlaegeZeigen(suchen(feld.value));
    });

    feld.addEventListener("focus", function () {
      if (!feld.value.trim() && revier >= 0) vorschlaegeZeigen(suchen(""));
    });

    feld.addEventListener("keydown", function (ev) {
      if (liste.hidden) return;
      if (ev.key === "ArrowDown") { ev.preventDefault(); markierungSetzen(markiert + 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); markierungSetzen(markiert - 1); }
      else if (ev.key === "Enter") {
        var gefunden = suchen(feld.value);
        var pos = markiert >= 0 ? markiert : 0;
        if (gefunden[pos]) { ev.preventDefault(); uebernehmen(gefunden[pos]); }
      } else if (ev.key === "Escape") {
        liste.hidden = true;
        feld.setAttribute("aria-expanded", "false");
      }
    });

    feld.addEventListener("blur", function () {
      window.setTimeout(function () { liste.hidden = true; }, 120);
    });
  }

    loeschen.addEventListener("click", zuruecksetzen);
  }
})();
