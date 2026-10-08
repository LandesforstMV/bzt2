/* ==========================================================================
   BZT-Filter – Anwendungslogik

   Daten:  data/bzt_data.js  (erzeugt von tools/build_data.py)
   Bilder: siehe BILD_PFADE weiter unten
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * BILDER
   *
   * Hier stehen die Pfade zu den Kachelbildern. Zum Austauschen genügt es,
   * die PNG-Dateien in die passenden Ordner zu legen – die Dateinamen
   * stehen vollständig in assets/DATEILISTE.md.
   *
   * Andere Endung (z. B. .jpg) oder anderer Ordner? Einfach hier ändern.
   * Fehlt eine Datei, zeigt die Kachel automatisch einen Platzhalter.
   * ------------------------------------------------------------------ */
  var BILD_PFADE = {
    kli:  function (slug) { return "assets/klimastufe/" + slug; },
    stgr: function (slug) { return "assets/standort/"   + slug; },
    bzt:  function (slug) { return "assets/bzt/"        + slug; },
    ba:   function (slug) { return "assets/baumart/"    + slug; }
  };

  // Reihenfolge, in der Dateiendungen probiert werden – nur noch als
  // Rückfall, wenn data/bilder.js die Kachel nicht kennt.
  //
  // ⚠️ Nicht wieder zum Regelfall machen. Unter file:// kostet das
  // Durchprobieren nichts: Das Dateisystem sagt sofort "gibt es nicht",
  // es entsteht keine Netzanfrage. ÜBER HTTP IST JEDE PROBE EINE ECHTE
  // ANFRAGE. Gemessen an einem Seitenaufruf: 504 Anfragen, 496 davon mit
  // Antwort 404 – GitHub hat die Seite daraufhin gedrosselt und statt der
  // App "Rate limit exceeded" ausgeliefert. Besonders teuer waren die
  // erzeugten SVG: ".svg" steht hier an letzter Stelle, also kostete jede
  // Standorts- und Baumartenkachel fünf Anfragen, vier davon vergeblich.
  //
  // Weil pruefen.js über file:// läuft, ist das jahrelang nicht
  // aufgefallen – dort SIND die Fehlschläge folgenlos.
  var BILD_ENDUNGEN = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

  /**
   * Welche Datei gehört zu dieser Kachel?
   *
   * data/bilder.js (aus tools/make_bilderliste.py) nennt zu jedem Slug
   * den tatsächlichen Dateinamen samt Endung. Dann wird genau eine Datei
   * geholt. Fehlt die Tabelle oder der Eintrag, bleibt es beim alten
   * Durchprobieren – eine neu abgelegte Datei funktioniert also auch ohne
   * neuen Lauf des Skripts, nur eben wieder teuer.
   */
  function bildKandidaten(facet, slug) {
    var t = window.BZT_BILDER;
    var name = t && t[facet] && t[facet][slug];
    var ordner = BILD_PFADE[facet]("");
    if (name) return [ordner + name];
    var basis = ordner + slug;
    return BILD_ENDUNGEN.map(function (e) { return basis + e; });
  }

  /* ------------------------------------------------------------------ *
   * QUELLDOKUMENTE
   *
   * Die PDFs liegen unter dokumente/. SEITEN_BILD zeigt auf die daraus
   * erzeugten Seitenbilder (tools/extract_images.py), die die App in der
   * Seitenansicht anzeigt.
   * ------------------------------------------------------------------ */
  var DOKUMENTE = {
    erlass: {
      pdf: "dokumente/BZT_Erlass.pdf",
      titel: "Bestockungszieltypen im Klimawandel (Erlass MV)"
    },
    klima: {
      pdf: "dokumente/Klimastufen_BZT.pdf",
      titel: "Klimastufen nach BAS Standorts-Karte 2023 (KS_41_10)"
    }
  };
  var SEITEN_BILD = function (nr) { return "assets/seiten/seite-" + nr + ".jpg"; };
  var KLIMA_BILD = "assets/seiten/klimastufen.jpg";

  /* ------------------------------------------------------------------ */

  var D = window.BZT_DATA;
  if (!D) {
    // Haeufigster Fall: beim Hochladen ist der Ordner data/ nicht mitgekommen.
    document.body.innerHTML =
      '<div style="max-width:46rem;margin:3rem auto;padding:0 1.5rem;' +
      'font:15px/1.6 system-ui,sans-serif;color:#1c2320">' +
      '<h1 style="font-size:20px">Die Daten wurden nicht geladen</h1>' +
      '<p>Die Datei <code>data/bzt_data.js</code> konnte nicht gefunden werden. ' +
      'Sie muss im Ordner <code>data/</code> direkt neben dieser ' +
      '<code>index.html</code> liegen.</p>' +
      '<ul>' +
      '<li><b>Nach dem Hochladen (GitHub, Webspace):</b> Meist fehlt der Ordner ' +
      '<code>data/</code> – bitte prüfen, ob er mit übertragen wurde.</li>' +
      '<li><b>Groß- und Kleinschreibung:</b> Auf einem Server zählt sie. Der Name ' +
      'muss genau <code>data/bzt_data.js</code> lauten.</li>' +
      '<li><b>Frisch aus den Quelltabellen:</b> ' +
      '<code>python3 tools/build_data.py</code> erzeugt die Datei neu.</li>' +
      '</ul></div>';
    return;
  }

  /* ------------------------------------------------------------------ *
   * BETRIEBSART
   *
   * Die drei Einstiegsdateien setzen vor dem Laden dieser Datei je eine
   * Zeile, sonst sind sie gleich:
   *
   *     <script>window.BZT_MODUS = "light";</script>
   *
   *   professional   vier Spalten, voller Zugriff        index.html
   *   light          gefuehrter Ablauf, BZT unsichtbar   light.html
   *   intern         wie professional + Forstadresse     intern.html
   *
   * Daten, Filterkern und Kachelbilder sind fuer alle drei dieselben.
   * Die Light-Version bringt ihre eigene Oberflaeche mit (light.js) und
   * benutzt von hier nur den Datenteil - deshalb wird der Aufbau der vier
   * Spalten uebersprungen, wenn es sie auf der Seite gar nicht gibt.
   * ------------------------------------------------------------------ */

  var MODUS = ({ light: "light", intern: "intern" })[window.BZT_MODUS] || "professional";
  document.documentElement.dataset.modus = MODUS;
  var SPALTEN_DA = !!document.getElementById("columns");

  var FACETS = ["kli", "stgr", "bzt", "ba"];
  var LISTE = { kli: D.klimastufen, stgr: D.standorte, bzt: D.bzt, ba: D.baumarten };
  var ID = {
    kli:  function (o) { return o.id; },
    stgr: function (o) { return o.id; },
    bzt:  function (o) { return o.id; },
    ba:   function (o) { return o.code; }
  };

  /* --- Indizes ------------------------------------------------------- */

  var idxKli  = mapIndex(D.klimastufen, "id");
  var idxStgr = mapIndex(D.standorte, "id");
  var idxBzt  = mapIndex(D.bzt, "id");
  var idxBa   = mapIndex(D.baumarten, "code");

  // Baumarten je BZT: Set der Kürzel + Detailinfo (Rang, Min, Max)
  var bztArten = D.bzt.map(function (b) {
    var set = new Set();
    b.gruppen.forEach(function (g) { g.arten.forEach(function (a) { set.add(a); }); });
    return set;
  });
  var bztArtInfo = D.bzt.map(function (b) {
    var m = new Map();
    b.gruppen.forEach(function (g) {
      g.arten.forEach(function (a) {
        if (!m.has(a)) m.set(a, { rang: g.rang, min: g.min, max: g.max, label: g.label });
      });
    });
    return m;
  });

  // Maximalanteil einer Baumart über alle BZT hinweg (für die Gesamtsortierung)
  var artMaxGesamt = new Map();
  bztArtInfo.forEach(function (m) {
    m.forEach(function (info, code) {
      artMaxGesamt.set(code, Math.max(artMaxGesamt.get(code) || 0, info.max || 0));
    });
  });

  var KOMBIS = D.kombis;   // [ [kliIdx, stgrIdx, bztIdx], ... ]

  /* --- Zustand ------------------------------------------------------- */

  var sel = { kli: new Set(), stgr: new Set(), bzt: new Set(), ba: new Set() };
  var baMode = "und";                  // "und" = alle gewählten Baumarten, "oder" = mindestens eine
  var suche = { kli: "", stgr: "", bzt: "", ba: "" };
  var zeigeNichtMoegliche = false;
  var fokusBzt = null;                 // BZT, dessen Karte hervorgehoben wird

  /* --- Filterprüfung ------------------------------------------------- */

  // skip: Facette, deren eigene Auswahl ignoriert wird (für die Optionslisten)
  function passt(k, s, b, skip) {
    if (skip !== "kli"  && sel.kli.size  && !sel.kli.has(D.klimastufen[k].id)) return false;
    if (skip !== "stgr" && sel.stgr.size && !sel.stgr.has(D.standorte[s].id))  return false;
    if (skip !== "bzt"  && sel.bzt.size  && !sel.bzt.has(D.bzt[b].id))         return false;
    if (skip !== "ba"   && sel.ba.size) {
      var arten = bztArten[b];
      if (baMode === "und") {
        var alle = true;
        sel.ba.forEach(function (a) { if (!arten.has(a)) alle = false; });
        if (!alle) return false;
      } else {
        var eine = false;
        sel.ba.forEach(function (a) { if (arten.has(a)) eine = true; });
        if (!eine) return false;
      }
    }
    return true;
  }

  function filtern(skip) {
    var out = [];
    for (var i = 0; i < KOMBIS.length; i++) {
      var r = KOMBIS[i];
      if (passt(r[0], r[1], r[2], skip)) out.push(r);
    }
    return out;
  }

  /* --- Auswertung ---------------------------------------------------- */

  function zaehle(rows, pos) {
    var c = new Map();
    rows.forEach(function (r) { c.set(r[pos], (c.get(r[pos]) || 0) + 1); });
    return c;
  }

  // Baumarten der Treffermenge inkl. Anzahl, Maximalanteil und bestem Rang
  function baumartStatistik(rows) {
    var stat = new Map();
    rows.forEach(function (r) {
      var b = r[2];
      bztArtInfo[b].forEach(function (info, code) {
        var e = stat.get(code);
        if (!e) { e = { code: code, n: 0, max: 0, rang: 9, bzt: new Set() }; stat.set(code, e); }
        e.n++;
        e.bzt.add(b);
        if ((info.max || 0) > e.max) e.max = info.max || 0;
        if (info.rang < e.rang) e.rang = info.rang;
      });
    });
    return stat;
  }

  /* --- DOM-Hilfen ---------------------------------------------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Ereignis nur binden, wenn es das Element in dieser Betriebsart gibt.
  function bei(id, ereignis, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener(ereignis, fn);
    return n;
  }

  function mapIndex(arr, key) {
    var m = new Map();
    arr.forEach(function (o, i) { m.set(o[key], i); });
    return m;
  }

  // Bildkachel: Platzhalter im Hintergrund, Bild darüber (falls vorhanden).
  // Welche Datei das ist, sagt bildKandidaten() – im Normalfall genau eine.
  //
  // ⚠️ Der Platzhalter darf nur so lange stehen, wie es kein Bild gibt.
  // Beides gleichzeitig sichtbar zu lassen war ein Fehler: Die Kacheln der
  // Klimastufe, des BZT und des Standorts zeigen ihr Bild mit
  // object-fit: contain – also mit Rand –, und viele PNG und alle SVG sind
  // an den Rändern durchsichtig. Durch beides schien das gezeichnete
  // Ersatzmotiv hindurch. Deshalb bekommt die Kachel beim ersten
  // erfolgreichen Laden die Klasse "thumb--geladen"; das CSS nimmt dann
  // das Hintergrundbild weg und blendet das Bild ein.
  //
  // Das Einblenden erledigt zugleich das zweite Ärgernis: Ein <img> mit
  // fehlgeschlagener Quelle zeigt das Kaputt-Symbol des Browsers, und bei
  // fünf durchprobierten Endungen blitzt es bis zu fünfmal auf. Solange
  // "thumb--geladen" fehlt, steht das Bild auf opacity: 0 und man sieht
  // nichts davon.
  function thumb(facet, code, slug, extraKlasse) {
    var box = el("span", "thumb thumb--" + facet + (extraKlasse ? " " + extraKlasse : ""));
    box.appendChild(el("span",
      "thumb-code" + (String(code).length > 7 ? " thumb-code--lang" : ""), code));
    var kandidaten = bildKandidaten(facet, slug);
    var i = 0;
    var img = new Image();
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("load", function () {
      box.classList.add("thumb--geladen");
    });
    img.addEventListener("error", function () {
      i++;
      if (i < kandidaten.length) img.src = kandidaten[i];
      else img.remove();
    });
    img.src = kandidaten[0];
    box.appendChild(img);
    return box;
  }

  function prozent(v) { return (v == null ? "–" : v + " %"); }

  /* --- Kachel-Beschriftungen je Spalte -------------------------------- */

  var TILE = {
    kli: function (o) {
      return { code: o.kurz, name: o.name, meta: o.beschreibung, slug: o.slug };
    },
    stgr: function (o) {
      var meta = o.wasserhaushalt;
      if (o.zusatz && o.zusatz !== o.wasserhaushalt) meta += " · " + o.zusatz;
      return {
        code: o.id,
        name: o.naehrstoff + " · " + o.feuchte,
        meta: meta,
        slug: o.slug
      };
    },
    bzt: function (o) {
      return {
        code: o.typ,
        name: o.name,
        meta: "Nr. " + o.nr + " · " + o.baAnzahl + " BA · LH " +
              Math.round((o.lhAnteil || 0) * 100) + " %",
        slug: o.slug
      };
    },
    ba: function (o) {
      return { code: o.code, name: o.name, lat: o.lat, slug: o.slug,
               nb: o.gruppe === "NB" };
    }
  };

  /* --- Spalten rendern ------------------------------------------------ */

  var colEl = {};
  FACETS.forEach(function (f) {
    colEl[f] = document.querySelector('.col[data-facet="' + f + '"]');
  });

  function renderSpalte(facet, eintraege, gesamt) {
    var wrap = colEl[facet].querySelector("[data-tiles]");
    var leer = colEl[facet].querySelector("[data-empty]");
    var q = suche[facet].trim().toLowerCase();

    wrap.textContent = "";
    var gruppeAktuell = null;
    var sichtbar = 0;

    eintraege.forEach(function (e) {
      var o = e.obj;
      var t = TILE[facet](o);
      var id = ID[facet](o);
      var gewaehlt = sel[facet].has(id);
      var moeglich = e.n > 0;

      if (!moeglich && !gewaehlt && !zeigeNichtMoegliche) return;
      if (q) {
        /* Gesucht wird in allem, was auf der Kachel steht – und bei den
           Baumarten zusaetzlich im wissenschaftlichen Namen. Wer
           „Sorbus“ eingibt, meint Elsbeere und Eberesche, und das weiss
           kein deutscher Name; „Quercus“ bringt alle vier Eichen.
           ⚠️ Nur lat, nicht latVoll: Der Autor im vollen Namen stiftet
           Unfug – „EB“ fand damit auch die Traubeneiche, weil deren
           Autor „LIEBL.“ heisst. Die anderen Spalten haben kein lat und
           merken von alldem nichts. */
        var hay = (t.code + " " + t.name + " " + (t.meta || "") + " " +
                   (o.gruppe || "") + " " +
                   (o.lat || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }

      if (facet === "stgr" && o.gruppe !== gruppeAktuell) {
        gruppeAktuell = o.gruppe;
        wrap.appendChild(el("p", "tiles-group", o.gruppe));
      }

      var btn = el("button", "tile" + (moeglich ? "" : " is-off"));
      btn.type = "button";
      btn.setAttribute("aria-pressed", gewaehlt ? "true" : "false");
      btn.dataset.facet = facet;
      btn.dataset.id = id;
      btn.title = [t.code, t.name, t.lat, t.meta, o.beschreibung, o.gruppe]
        .filter(Boolean).join(" · ");
      if (!moeglich && !gewaehlt) btn.disabled = true;

      btn.appendChild(thumb(facet, t.code, t.slug));

      var body = el("span", "tile-body");
      body.appendChild(el("span", "tile-code", t.code));
      body.appendChild(el("span", "tile-name", t.name));
      if (t.lat) body.appendChild(el("span", "tile-lat", t.lat));
      if (facet === "ba") {
        var meta = el("span", "tile-meta");
        meta.appendChild(el("span", "pill", o.gruppe === "NB" ? "NB" : "LB"));
        meta.appendChild(document.createTextNode(
          "max. " + prozent(e.max) + " · in " + e.nBzt + " BZT"));
        body.appendChild(meta);
        var bar = el("span", "bar" + (o.gruppe === "NB" ? " bar--nb" : ""));
        var fill = el("i");
        fill.style.width = Math.max(2, e.max || 0) + "%";
        bar.appendChild(fill);
        body.appendChild(bar);
      } else if (t.meta) {
        body.appendChild(el("span", "tile-meta", t.meta));
      }
      btn.appendChild(body);

      var rechts = el("span", "tile-right");
      rechts.appendChild(el("span", "tile-count", String(e.n)));
      if (facet === "kli" || facet === "bzt") {
        var lupe = el("button", "tile-doc");
        lupe.type = "button";
        lupe.title = facet === "kli"
          ? "Klimastufen-Karte im Original ansehen"
          : "Erlass-Seite " + o.seite + " ansehen";
        lupe.setAttribute("aria-label", lupe.title);
        lupe.textContent = "⤢";
        lupe.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (facet === "kli") zeigeKlimakarte(o); else zeigeErlassSeite(o);
        });
        rechts.appendChild(lupe);
      }
      btn.appendChild(rechts);
      wrap.appendChild(btn);
      sichtbar++;
    });

    leer.hidden = sichtbar > 0;

    var verfuegbar = eintraege.filter(function (e) { return e.n > 0; }).length;
    colEl[facet].querySelector("[data-count]").textContent = String(verfuegbar);
    colEl[facet].querySelector("[data-total]").textContent = " / " + gesamt;
    colEl[facet].querySelector("[data-clear]").hidden = sel[facet].size === 0;
  }

  /* --- Ergebnisbereich ------------------------------------------------ */

  function renderErgebnis(rows) {
    var body = document.getElementById("results-body");
    var summary = document.getElementById("results-summary");
    body.textContent = "";

    if (!rows.length) {
      summary.textContent = "";
      var leer = el("div", "leer",
        "Diese Kombination kommt in der Zieltabelle nicht vor. " +
        "Bitte einen Filter lockern.");
      body.appendChild(leer);
      return;
    }

    var proBzt = new Map();
    rows.forEach(function (r) {
      var e = proBzt.get(r[2]);
      if (!e) { e = { n: 0, stgr: new Set(), kli: new Set() }; proBzt.set(r[2], e); }
      e.n++;
      e.stgr.add(r[1]);
      e.kli.add(r[0]);
    });

    var stgrGesamt = new Set(rows.map(function (r) { return r[1]; })).size;
    summary.textContent =
      rows.length + " Kombination" + (rows.length === 1 ? "" : "en") + " · " +
      proBzt.size + " Bestandeszieltyp" + (proBzt.size === 1 ? "" : "en") + " · " +
      stgrGesamt + " Standortgruppe" + (stgrGesamt === 1 ? "" : "n");

    // Nach BZT-Nummer, nicht nach Häufigkeit. Vorher stand der Zieltyp mit
    // den meisten Kombinationen oben – ohne Filter ergab das die Folge
    // 12, 4, 10, …, die von außen wie Zufall aussieht. Die Nummern des
    // Erlasses sind dagegen eine Ordnung, die man kennt (Eiche → Buche →
    // Edellaubbäume → Erle → Birke → Kiefer → Douglasie → Lärche), und
    // jede Karte trägt ihr "Nr. X" sichtbar.
    //
    // Die Häufigkeit geht dabei nichts verloren: Sobald Klimastufe und
    // Standort gewählt sind, kommt ohnehin jeder Zieltyp genau einmal vor
    // – die alte Sortierung wirkte also nur in dem Zustand, in dem sie am
    // wenigsten zu erklären war.
    var cards = el("div", "bzt-cards");
    Array.from(proBzt.keys())
      .sort(function (a, b) { return D.bzt[a].nr - D.bzt[b].nr; })
      .forEach(function (bi) { cards.appendChild(bztKarte(bi, proBzt.get(bi))); });
    body.appendChild(cards);
  }

  function bztKarte(bi, info) {
    var b = D.bzt[bi];
    var card = el("article", "card" + (fokusBzt === b.id ? " is-focus" : ""));
    card.id = "card-" + b.slug;

    var banner = el("button", "card-bild");
    banner.type = "button";
    banner.title = "Bestandesbild und Erlass-Seite " + b.seite + " ansehen";
    banner.appendChild(thumb("bzt", b.typ, b.slug, "thumb--breit"));
    banner.addEventListener("click", function () { zeigeErlassSeite(b); });
    card.appendChild(banner);

    var head = el("header", "card-head");
    var htxt = el("div");
    htxt.appendChild(el("h3", null, b.typ + " – " + b.name));
    htxt.appendChild(el("p", "sub",
      "Nr. " + b.nr + " · Laubholzanteil " + Math.round((b.lhAnteil || 0) * 100) + " %"));
    head.appendChild(htxt);
    if (b.seite) {
      var seitenBtn = el("button", "btn btn--klein", "Seite " + b.seite + " ↗");
      seitenBtn.type = "button";
      seitenBtn.title = "Beschreibung im Erlass ansehen";
      seitenBtn.addEventListener("click", function () { zeigeErlassSeite(b); });
      head.appendChild(seitenBtn);
    }
    card.appendChild(head);

    b.gruppen.forEach(function (g) {
      var box = el("div", "grp");
      var gh = el("div", "grp-head");
      gh.appendChild(el("span", null, "Baumartengruppe " + g.rang));
      var anteil = el("span");
      anteil.appendChild(el("b", null, g.label || (g.min + "–" + g.max + " %")));
      gh.appendChild(anteil);
      box.appendChild(gh);

      var arten = el("div", "arten");
      g.arten
        .slice()
        .sort(function (x, y) { return artName(x).localeCompare(artName(y), "de"); })
        .forEach(function (code) {
          var a = D.baumarten[idxBa.get(code)];
          var chip = el("button", "art" +
            (a && a.gruppe === "NB" ? " is-nb" : "") +
            (sel.ba.has(code) ? " is-sel" : ""));
          chip.type = "button";
          chip.dataset.facet = "ba";
          chip.dataset.id = code;
          chip.title = (a ? a.name + (a.latVoll ? " – " + a.latVoll : "") : code) +
            " · anklicken, um nach dieser Baumart zu filtern";
          chip.appendChild(document.createTextNode(code));
          var txt = el("span", "art-txt");
          txt.appendChild(el("small", null, a ? a.name : ""));
          if (a && a.lat) txt.appendChild(el("i", null, a.lat));
          chip.appendChild(txt);
          arten.appendChild(chip);
        });
      box.appendChild(arten);
      card.appendChild(box);
    });

    var foot = el("div", "card-foot");
    var kliNamen = Array.from(info.kli).sort().map(function (i) {
      return D.klimastufen[i].kurz;
    }).join(", ");
    foot.appendChild(el("div", null,
      "Klimastufe: " + kliNamen + " · " + info.stgr.size +
      " Standortgruppe" + (info.stgr.size === 1 ? "" : "n")));
    var liste = el("div", "stgr-liste");
    Array.from(info.stgr)
      .sort(function (a, b2) { return a - b2; })
      .forEach(function (si) { liste.appendChild(el("span", null, D.standorte[si].id)); });
    foot.appendChild(liste);
    card.appendChild(foot);
    return card;
  }


  function artName(code) {
    var i = idxBa.get(code);
    return i == null ? code : D.baumarten[i].name;
  }

  /* --- Seitenleiste: Kurzfassung der Auswahl --------------------------- */

  function renderSeitenleiste(rows) {
    var box = document.getElementById("sidebar-status");
    if (!box) return;
    box.textContent = "";
    var gesetzt = FACETS.filter(function (f) { return sel[f].size > 0; });
    if (!gesetzt.length) {
      box.appendChild(el("p", null, "keine Filter gesetzt"));
    } else {
      gesetzt.forEach(function (f) {
        var z = el("p");
        z.appendChild(el("b", null, LABEL[f] + ": "));
        z.appendChild(document.createTextNode(
          Array.from(sel[f]).map(function (id) { return beschriftung(f, id); }).join(", ")));
        box.appendChild(z);
      });
    }
    box.appendChild(el("p", "sidebar-zahl",
      rows.length + " Kombination" + (rows.length === 1 ? "" : "en")));
  }

  /* --- Aktive Filter -------------------------------------------------- */

  var LABEL = { kli: "Klimastufe", stgr: "Standort", bzt: "BZT", ba: "Baumart" };

  function renderAktiveFilter() {
    var box = document.getElementById("active-filters");
    box.textContent = "";
    var leer = FACETS.every(function (f) { return sel[f].size === 0; });
    box.hidden = leer;
    if (leer) return;

    FACETS.forEach(function (f) {
      sel[f].forEach(function (id) {
        var chip = el("span", "chip");
        chip.appendChild(el("b", null, LABEL[f] + ": "));
        chip.appendChild(document.createTextNode(beschriftung(f, id)));
        var x = el("button", null, "×");
        x.type = "button";
        x.title = "Filter entfernen";
        x.addEventListener("click", function () { sel[f].delete(id); render(); });
        chip.appendChild(x);
        box.appendChild(chip);
      });
    });
  }

  function beschriftung(facet, id) {
    var i = { kli: idxKli, stgr: idxStgr, bzt: idxBzt, ba: idxBa }[facet].get(id);
    if (i == null) return id;
    var o = LISTE[facet][i];
    if (facet === "bzt") return o.typ + " (" + o.name + ")";
    if (facet === "ba") return o.code + " (" + o.name + ")";
    if (facet === "kli") return o.kurz;
    return o.id;
  }

  /* --- Gesamt-Render -------------------------------------------------- */

  function render() {
    var rows = filtern(null);

    // Optionslisten: die eigene Auswahl der Spalte wird jeweils ignoriert
    var cKli  = zaehle(filtern("kli"), 0);
    var cStgr = zaehle(filtern("stgr"), 1);
    var cBzt  = zaehle(filtern("bzt"), 2);
    var statBa = baumartStatistik(filtern("ba"));

    renderSpalte("kli", D.klimastufen.map(function (o, i) {
      return { obj: o, n: cKli.get(i) || 0 };
    }), D.klimastufen.length);

    renderSpalte("stgr", D.standorte.map(function (o, i) {
      return { obj: o, n: cStgr.get(i) || 0 };
    }), D.standorte.length);

    renderSpalte("bzt", D.bzt.map(function (o, i) {
      return { obj: o, n: cBzt.get(i) || 0 };
    }).sort(function (a, b) {
      return (b.n > 0) - (a.n > 0) || a.obj.nr - b.obj.nr;
    }), D.bzt.length);

    // Baumarten: absteigend nach Maximalanteil, dann nach Häufigkeit
    renderSpalte("ba", D.baumarten.map(function (o) {
      var s = statBa.get(o.code);
      return {
        obj: o,
        n: s ? s.n : 0,
        nBzt: s ? s.bzt.size : 0,
        max: s ? s.max : (artMaxGesamt.get(o.code) || 0),
        rang: s ? s.rang : 0
      };
    }).sort(function (a, b) {
      return (b.n > 0) - (a.n > 0) ||
             b.max - a.max ||
             a.rang - b.rang ||
             a.obj.name.localeCompare(b.obj.name, "de");
    }), D.baumarten.length);

    var zaehlerEl = document.getElementById("result-count");
    if (zaehlerEl) zaehlerEl.textContent = String(rows.length);
    reiterZahlen();
    renderSeitenleiste(rows);
    renderAktiveFilter();
    renderErgebnis(rows);
    csvZustand();
    schreibeHash();
    return rows;
  }

  // Die CSV gibt es nur zu einer gesetzten Auswahl – nicht die gesamte
  // Zieltabelle auf einen Klick.
  function hatAuswahl() {
    return FACETS.some(function (f) { return sel[f].size > 0; });
  }
  function csvZustand() {
    var an = hatAuswahl();
    ["export-csv", "sidebar-csv"].forEach(function (id) {
      var k = document.getElementById(id);
      if (!k) return;
      k.disabled = !an;
      k.title = an ? "Die aktuelle Auswahl als CSV-Tabelle speichern"
                   : "Erst eine Auswahl treffen (Klimastufe, Standort, BZT oder Baumart)";
    });
  }


  /* --- Seitenansicht (Overlay) ----------------------------------------- */

  var viewer = {
    box: document.getElementById("viewer"),
    titel: document.getElementById("viewer-titel"),
    sub: document.getElementById("viewer-sub"),
    bild: document.getElementById("viewer-bild"),
    hinweis: document.getElementById("viewer-hinweis"),
    pdf: document.getElementById("viewer-pdf"),
    zurueck: document.getElementById("viewer-zurueck"),
    weiter: document.getElementById("viewer-weiter"),
    blatt: document.getElementById("viewer-blatt"),
    seiten: [],
    pos: 0,
    zuletzt: null
  };

  function viewerOeffnen(titel, sub, seiten, pdfUrl) {
    viewer.zuletzt = document.activeElement;
    viewer.titel.textContent = titel;
    viewer.sub.textContent = sub || "";
    viewer.seiten = seiten;
    viewer.pos = 0;
    viewer.pdf.href = pdfUrl;
    viewer.box.hidden = false;
    document.body.classList.add("hat-viewer");
    viewerZeigen();
    viewer.box.querySelector(".viewer-zu").focus();
  }

  function viewerZeigen() {
    var s = viewer.seiten[viewer.pos];
    viewer.hinweis.hidden = true;
    viewer.bild.alt = s.alt || "";
    viewer.bild.classList.remove("ist-geladen");   // bis das neue Blatt da ist
    viewer.bild.src = s.bild;
    viewer.blatt.textContent = viewer.seiten.length > 1
      ? (viewer.pos + 1) + " / " + viewer.seiten.length + (s.label ? " · " + s.label : "")
      : (s.label || "");
    viewer.zurueck.disabled = viewer.pos === 0;
    viewer.weiter.disabled = viewer.pos >= viewer.seiten.length - 1;
    // Nicht jedes Blatt kommt aus einem PDF – der QR-Code etwa nicht. Ohne
    // diese Zeile stünde dort ein Link mit href="undefined".
    viewer.pdf.hidden = !s.pdfUrl;
    viewer.pdf.textContent = s.pdfText || "Original-PDF öffnen ↗";
    viewer.pdf.href = s.pdfUrl || "";
  }

  function viewerSchliessen() {
    viewer.box.hidden = true;
    document.body.classList.remove("hat-viewer");
    viewer.bild.removeAttribute("src");
    if (viewer.zuletzt && viewer.zuletzt.focus) viewer.zuletzt.focus();
  }

  function zeigeErlassSeite(b) {
    if (!b.seite) return;
    var seiten = [b.seite, b.seite + 1].map(function (nr) {
      return {
        bild: SEITEN_BILD(nr),
        label: "Seite " + nr,
        alt: "Erlass, Seite " + nr,
        pdfUrl: DOKUMENTE.erlass.pdf + "#page=" + nr,
        pdfText: "PDF bei Seite " + nr + " öffnen ↗"
      };
    });
    viewerOeffnen(b.typ + " – " + b.name, DOKUMENTE.erlass.titel, seiten,
                  DOKUMENTE.erlass.pdf);
  }

  function zeigeKlimakarte(k) {
    viewerOeffnen("Klimastufe " + k.kurz + " – " + k.name, DOKUMENTE.klima.titel, [{
      bild: KLIMA_BILD,
      label: "Klimastufen-Karte",
      alt: "Karte der Klimastufen in Mecklenburg-Vorpommern",
      pdfUrl: DOKUMENTE.klima.pdf,
      pdfText: "Original-PDF öffnen ↗"
    }], DOKUMENTE.klima.pdf);
  }

  // Die Seitenansicht gibt es nur dort, wo auch die BZT-Spalte steht.
  if (viewer.box) {
    viewer.box.addEventListener("click", function (ev) {
      if (ev.target === viewer.box || ev.target.classList.contains("viewer-zu")) {
        viewerSchliessen();
      }
    });
    viewer.zurueck.addEventListener("click", function () {
      if (viewer.pos > 0) { viewer.pos--; viewerZeigen(); }
    });
    viewer.weiter.addEventListener("click", function () {
      if (viewer.pos < viewer.seiten.length - 1) { viewer.pos++; viewerZeigen(); }
    });
    viewer.bild.addEventListener("load", function () {
      viewer.bild.classList.add("ist-geladen");
    });
    viewer.bild.addEventListener("error", function () {
      viewer.hinweis.hidden = false;
    });
    document.addEventListener("keydown", function (ev) {
      if (viewer.box.hidden) return;
      if (ev.key === "Escape") viewerSchliessen();
      else if (ev.key === "ArrowLeft") viewer.zurueck.click();
      else if (ev.key === "ArrowRight") viewer.weiter.click();
    });
  }

  /* --- Logos ------------------------------------------------------------ *
   * Erwartet werden assets/logo.png (links oben), assets/logo_lf.png
   * (oben mittig) und assets/logo1.png … logo4.png (Leiste unten rechts
   * und in der Seitenleiste). Damit auch abweichend benannte Dateien
   * gefunden werden, wird jede Endung und die Gross-Schreibweise probiert;
   * fehlt eine Datei ganz, verschwindet ihr Platz.
   * --------------------------------------------------------------------- */

  var LOGO_ENDUNGEN = [".png", ".PNG", ".svg", ".jpg", ".JPG", ".jpeg", ".webp"];

  /**
   * Kandidaten für ein Einzelbild (Logo, Startbild, QR-Code).
   *
   * ⚠️ Kennt data/bilder.js den Namen, wird genau diese eine Datei geholt;
   * kennt sie ihn nicht, GAR KEINE. Das ist der Unterschied zu den
   * Kacheln: Dort ist ein fehlendes Bild die Ausnahme, hier der
   * Normalfall – logo1 bis logo4 sind optional und meist nicht da. Vorher
   * kostete jeder dieser leeren Plätze vierzehn Anfragen (sieben Endungen
   * × zwei Schreibweisen), zusammen 60 je Seitenaufruf, alle mit 404.
   *
   * Fehlt die Tabelle ganz, wird wie früher durchprobiert – sonst würde
   * ein Auscheck ohne data/bilder.js gar keine Logos mehr zeigen.
   */
  function logoKandidaten(name) {
    var t = window.BZT_BILDER;
    if (t && t.einzeln) {
      return t.einzeln[name] ? ["assets/" + t.einzeln[name]] : [];
    }
    var kandidaten = [];
    [name, name.charAt(0).toUpperCase() + name.slice(1)].forEach(function (n) {
      LOGO_ENDUNGEN.forEach(function (e) { kandidaten.push("assets/" + n + e); });
    });
    return kandidaten;
  }

  function logoWeg(img) {
    var box = img.closest(".logo-slot");
    // Beim Logo neben dem Titel bleibt die gezeichnete Marke stehen.
    if (box && box.classList.contains("brand-mark")) img.remove();
    else if (box) box.hidden = true;
    else img.remove();
    logoKartePruefen();
  }

  function logoLaden(img) {
    var name = img.dataset.logo;
    if (!name) return;
    // Kandidaten: assets/logo1.png, assets/logo1.PNG, …, assets/Logo1.png, …
    var kandidaten = logoKandidaten(name);
    if (!kandidaten.length) { logoWeg(img); return; }
    var i = 0;
    img.addEventListener("error", function () {
      i++;
      if (i < kandidaten.length) img.src = kandidaten[i];
      else logoWeg(img);
    });
    img.addEventListener("load", function () {
      img.classList.add("ist-geladen");   // vorher unsichtbar, siehe styles.css
      logoKartePruefen();
    });
    img.src = kandidaten[0];
  }

  // Die Logo-Karte der Seitenleiste erscheint nur, wenn es etwas zu zeigen gibt.
  function logoKartePruefen() {
    var karte = document.getElementById("sidebar-logos");
    if (!karte) return;
    var sichtbar = Array.prototype.some.call(
      karte.querySelectorAll(".logo-slot"),
      function (slot) { return !slot.hidden; });
    karte.hidden = !sichtbar;
  }

  document.querySelectorAll(".logo-slot img").forEach(logoLaden);


  /* --- Startbild ------------------------------------------------------- */

  (function startbild() {
    var box = document.getElementById("splash");
    if (!box) return;
    var img = document.getElementById("splash-img");
    var ersatz = document.getElementById("splash-ersatz");
    var balken = document.getElementById("ladebalken-fuellung");
    var hinweis = document.getElementById("splash-hinweis");
    var bereit = false;

    // ⚠️ Das <img> im HTML trägt bewusst KEIN src-Attribut. Stünde dort
    // "assets/front.PNG", liefe die Anfrage schon vor diesem Skript los –
    // und bei fehlender Datei wäre sie eine 404, die sich durch nichts
    // mehr verhindern lässt.
    var versuche = logoKandidaten("front");
    if (!versuche.length) {
      img.remove();                       // kein Startbild, Ersatz bleibt
    } else {
      var i = 0;
      img.addEventListener("error", function () {
        i++;
        if (i < versuche.length) img.src = versuche[i];
        else img.remove();
      });
      img.addEventListener("load", function () {
        img.classList.add("ist-geladen");   // vorher unsichtbar, siehe styles.css
        ersatz.hidden = true;
      });
      img.src = versuche[0];
    }

    requestAnimationFrame(function () { balken.style.width = "100%"; });
    window.setTimeout(function () {
      bereit = true;
      box.classList.add("ist-bereit");
      hinweis.textContent = "zum Starten klicken";
    }, 1700);

    function starten() {
      if (!bereit) return;
      box.classList.add("ist-weg");
      window.setTimeout(function () { box.hidden = true; }, 420);
      document.removeEventListener("keydown", tastatur);
    }
    function tastatur(ev) {
      if (ev.key === "Enter" || ev.key === " " || ev.key === "Escape") starten();
    }
    box.addEventListener("click", starten);
    document.addEventListener("keydown", tastatur);
  })();

  /* --- Seitenleiste ---------------------------------------------------- */

  (function seitenleiste() {
    var schalter = document.getElementById("sidebar-schalter");
    var layout = document.getElementById("layout");
    if (!schalter || !layout) return;
    // Standard: eingeklappt. Erst ein Klick auf ☰ blendet sie ein,
    // danach bleibt die zuletzt gewählte Einstellung erhalten.
    var zu = true;
    try {
      zu = window.localStorage.getItem("bzt-sidebar") !== "auf";
    } catch (e) {}
    setzen(zu);
    schalter.addEventListener("click", function () { setzen(!zu); });

    function setzen(neu) {
      zu = neu;
      layout.classList.toggle("ohne-sidebar", zu);
      schalter.setAttribute("aria-expanded", zu ? "false" : "true");
      try { window.localStorage.setItem("bzt-sidebar", zu ? "zu" : "auf"); } catch (e) {}
    }
  })();

  /* --- Für offline vorbereiten ----------------------------------------- *
   *
   * Der Service Worker hält von sich aus nur den Rumpf vor (HTML, Skripte,
   * Daten) und Bilder, die schon einmal angezeigt wurden. Dieser Knopf lädt
   * auf Wunsch alles Übrige in einen eigenen Vorrat "bastaklim-offline":
   * sämtliche Kachelbilder, die Erlass-Seiten, die Karte und beide PDFs
   * (rund 35–50 MB – daher nur auf Knopfdruck, am besten im WLAN).
   * sw.js liefert daraus, wenn kein Netz da ist, und löscht diesen Vorrat
   * beim Versionswechsel nicht.
   * --------------------------------------------------------------------- */

  var OFFLINE_VORRAT = "bastaklim-offline";

  (function offlineBereich() {
    var knopf = document.getElementById("offline-vorbereiten");
    var status = document.getElementById("offline-status");
    var balken = document.getElementById("offline-balken");
    if (!knopf || !status) return;

    var moeglich = "caches" in window && "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost");
    if (!moeglich) {
      knopf.disabled = true;
      status.textContent = "Nur über die Web-Adresse möglich, nicht beim Öffnen als Datei.";
      return;
    }

    var stand = null;
    try { stand = JSON.parse(window.localStorage.getItem("bzt-offline") || "null"); } catch (e) {}
    if (stand) {
      caches.has(OFFLINE_VORRAT).then(function (da) {
        if (da) status.textContent = "Vorbereitet am " + stand.datum + " · " + stand.dateien +
          " Dateien, " + stand.mb + " MB.";
      });
    }

    // Kandidaten: je Bild die möglichen Endungen der Reihe nach; genommen
    // wird die erste, die es gibt – wie in thumb().
    function gruppen() {
      var g = [];
      // ⚠️ Über bildKandidaten, nicht über alle Endungen: Kennt
      // data/bilder.js die Kachel, steht da genau ein Pfad statt fünf
      // Proben. Beim Vorbereiten sind das ein paar hundert Anfragen
      // weniger – und GitHub zählt jede einzelne mit.
      function bild(facet, slug) { g.push(bildKandidaten(facet, slug)); }
      D.klimastufen.forEach(function (o) { bild("kli", o.slug); });
      D.standorte.forEach(function (o) { bild("stgr", o.slug); });
      D.bzt.forEach(function (o) {
        bild("bzt", o.slug);
        if (o.seite) { g.push([SEITEN_BILD(o.seite)]); g.push([SEITEN_BILD(o.seite + 1)]); }
      });
      D.baumarten.forEach(function (o) { bild("ba", o.slug); });
      // Die Einzelbilder (Logos, Titelbild, QR-Code) gleich mit: Sie liegen
      // sonst nur im laufenden Vorrat, und der fällt beim Fassungswechsel
      // weg – der Offline-Vorrat bleibt.
      var einzeln = (window.BZT_BILDER || {}).einzeln || {};
      Object.keys(einzeln).forEach(function (n) {
        g.push(["assets/" + einzeln[n]]);
      });
      g.push([KLIMA_BILD]);
      g.push(["assets/klimastufe/karte.png"]);
      g.push([DOKUMENTE.erlass.pdf]);
      g.push([DOKUMENTE.klima.pdf]);
      return g;
    }

    knopf.addEventListener("click", function () {
      var liste = gruppen();
      var fertig = 0, dateien = 0, bytes = 0;
      knopf.disabled = true;
      if (balken) { balken.hidden = false; balken.firstElementChild.style.width = "0%"; }
      status.textContent = "Wird geladen …";

      caches.open(OFFLINE_VORRAT).then(function (vorrat) {
        function eine(kandidaten) {
          var i = 0;
          function naechste() {
            if (i >= kandidaten.length) return Promise.resolve();
            var url = kandidaten[i++];
            return fetch(url, { cache: "no-cache" }).then(function (antwort) {
              if (!antwort.ok) return naechste();
              return antwort.clone().blob().then(function (b) {
                bytes += b.size;
                dateien++;
                return vorrat.put(url, antwort);
              });
            }).catch(naechste);
          }
          return naechste().then(function () {
            fertig++;
            var pz = Math.round(100 * fertig / liste.length);
            if (balken) balken.firstElementChild.style.width = pz + "%";
            status.textContent = "Wird geladen … " + pz + " %";
          });
        }
        // sechs Downloads gleichzeitig
        var pos = 0;
        function arbeiter() {
          if (pos >= liste.length) return Promise.resolve();
          return eine(liste[pos++]).then(arbeiter);
        }
        return Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter(), arbeiter(), arbeiter()]);
      }).then(function () {
        var info = { datum: new Date().toLocaleDateString("de-DE"), dateien: dateien,
                     mb: String(Math.round(bytes / 1e5) / 10).replace(".", ",") };
        try { window.localStorage.setItem("bzt-offline", JSON.stringify(info)); } catch (e) {}
        status.textContent = "Fertig: " + dateien + " Dateien, " + info.mb +
          " MB. Die App ist jetzt auch ohne Netz vollständig nutzbar.";
      }).catch(function () {
        status.textContent = "Das Laden ist fehlgeschlagen. Bitte mit Netz erneut versuchen.";
      }).then(function () {
        knopf.disabled = false;
        knopf.textContent = "Erneut vorbereiten";
        if (balken) balken.hidden = true;
      });
    });
  })();

  bei("sidebar-reset", "click", function () {
    document.getElementById("reset-all").click();
  });
  bei("sidebar-csv", "click", function () {
    document.getElementById("export-csv").click();
  });

  /* --- Ereignisse ----------------------------------------------------- */

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-facet][data-id]");
    if (!t || t.disabled) return;
    var f = t.dataset.facet, id = t.dataset.id;
    if (sel[f].has(id)) sel[f].delete(id); else sel[f].add(id);
    if (f === "bzt") fokusBzt = sel.bzt.has(id) ? id : null;
    render();
    if (f === "bzt" && fokusBzt) {
      var card = document.getElementById("card-" + D.bzt[idxBzt.get(id)].slug);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  if (SPALTEN_DA) {
    FACETS.forEach(function (f) {
      colEl[f].querySelector("[data-search]").addEventListener("input", function (ev) {
        suche[f] = ev.target.value;
        render();
      });
      colEl[f].querySelector("[data-clear]").addEventListener("click", function () {
        sel[f].clear();
        if (f === "bzt") fokusBzt = null;
        render();
      });
    });
  }

  document.querySelectorAll("[data-bamode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      baMode = btn.dataset.bamode;
      document.querySelectorAll("[data-bamode]").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      render();
    });
  });

  bei("show-unavailable", "change", function (ev) {
    zeigeNichtMoegliche = ev.target.checked;
    render();
  });

  bei("reset-all", "click", function () {
    FACETS.forEach(function (f) {
      sel[f].clear();
      suche[f] = "";
      colEl[f].querySelector("[data-search]").value = "";
    });
    fokusBzt = null;
    render();
  });

  bei("export-csv", "click", function () {
    if (!hatAuswahl()) return;
    exportCsv(filtern(null));
  });

  bei("drucken", "click", drucken);
  bei("sidebar-druck", "click", drucken);

  /* --- Standortblatt drucken -------------------------------------------- */

  function drucken() {
    var kopf = document.getElementById("druckkopf");
    var rows = filtern(null);
    kopf.textContent = "";
    kopf.appendChild(el("h1", null, "BZT-Standortblatt"));

    var zeilen = el("dl", "druck-filter");
    FACETS.forEach(function (f) {
      if (!sel[f].size) return;
      zeilen.appendChild(el("dt", null, LABEL[f]));
      zeilen.appendChild(el("dd", null,
        Array.from(sel[f]).map(function (id) { return beschriftung(f, id); }).join(", ")));
    });
    if (!zeilen.childNodes.length) {
      zeilen.appendChild(el("dt", null, "Auswahl"));
      zeilen.appendChild(el("dd", null, "keine Einschränkung – alle Kombinationen"));
    }
    var bzt = new Set(rows.map(function (r) { return r[2]; })).size;
    var stgr = new Set(rows.map(function (r) { return r[1]; })).size;
    zeilen.appendChild(el("dt", null, "Treffer"));
    zeilen.appendChild(el("dd", null,
      rows.length + " Kombinationen · " + bzt + " Bestandeszieltypen · " +
      stgr + " Standortgruppen"));
    kopf.appendChild(zeilen);

    kopf.appendChild(el("p", "druck-quelle",
      "Quelle: BZT-Erlass Mecklenburg-Vorpommern – Bestockungszieltypen im " +
      "Klimawandel. Ausgedruckt am " + new Date().toLocaleDateString("de-DE") + "."));

    window.print();
  }

  /* --- CSV-Export ------------------------------------------------------ */

  function exportCsv(rows) {
    var kopf = ["Klimastufe", "Standortbeschreibung", "Standortgruppe",
                "Naehrstoff", "Wasserhaushalt", "BZT_Nr", "BZT_Typ", "BZT_Bezeichnung",
                "LH_Anteil"];
    for (var g = 1; g <= 3; g++) {
      kopf.push("Baumart_" + g, "Anteil_BA" + g, "Min_BA" + g, "Max_BA" + g);
    }
    var zeilen = [kopf];
    rows.forEach(function (r) {
      var k = D.klimastufen[r[0]], s = D.standorte[r[1]], b = D.bzt[r[2]];
      var z = [k.quellwert, s.gruppe, s.id, s.naehrstoff, s.wasserhaushalt,
               b.id, b.typ, b.name, b.lhAnteil];
      for (var i = 1; i <= 3; i++) {
        var gr = b.gruppen.filter(function (x) { return x.rang === i; })[0];
        z.push(gr ? gr.arten.join(",") : "", gr ? gr.label : "",
               gr ? gr.min : "", gr ? gr.max : "");
      }
      zeilen.push(z);
    });
    var csv = zeilen.map(function (z) {
      return z.map(function (v) {
        v = v == null ? "" : String(v);
        return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(";");
    }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "BZT_Auswahl.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  /* --- Auswahl in der Adresszeile (teilbar) ---------------------------- */

  function schreibeHash() {
    var teile = [];
    FACETS.forEach(function (f) {
      if (sel[f].size) teile.push(f + "=" + Array.from(sel[f]).map(encodeURIComponent).join(","));
    });
    if (baMode !== "und") teile.push("bamode=oder");
    var neu = teile.length ? "#" + teile.join("&") : "";
    if (neu !== location.hash) {
      history.replaceState(null, "", location.pathname + location.search + neu);
    }
  }

  function leseHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h) return;
    h.split("&").forEach(function (p) {
      var kv = p.split("=");
      var k = kv[0], v = decodeURIComponent(kv[1] || "");
      if (k === "bamode") {
        baMode = v === "oder" ? "oder" : "und";
        document.querySelectorAll("[data-bamode]").forEach(function (b) {
          var on = b.dataset.bamode === baMode;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        return;
      }
      if (!sel[k]) return;
      v.split(",").filter(Boolean).forEach(function (id) { sel[k].add(decodeURIComponent(id)); });
    });
  }

  /* --- Teilen ------------------------------------------------------------ *
   *
   * Eine Karte in der Seitenleiste mit dem QR-Code und, wo es Sinn ergibt,
   * einem Knopf zum Weitergeben der Adresse.
   *
   * Warum beides und nicht nur eines: Der QR-Code ist der Fall am Schreib-
   * tisch – jemand hält sein Telefon an den Bildschirm. Am Telefon selbst
   * ist er nutzlos (man kann den eigenen Bildschirm nicht scannen), dort
   * zählt das Teilen-Blatt des Betriebssystems.
   *
   * ⚠️ Unter file:// gibt es keine Adresse, die jemand anderem etwas nützt –
   * `file:///C:/Users/.../index.html` zeigt auf einen fremden Rechner. Die
   * Knöpfe erscheinen deshalb nur über http/https. Der QR-Code dagegen ist
   * ein Bild und funktioniert immer; was er enthält, bestimmt die PNG-Datei.
   * ---------------------------------------------------------------------- */

  var QR_NAME = "BASTAKLIM_logo_qr";

  function teilenAdresse() {
    // Der aktuelle Filter steht im Hash (siehe schreibeHash) und wandert
    // damit mit: Wer teilt, teilt seine Auswahl.
    if (location.protocol !== "http:" && location.protocol !== "https:") return null;
    return location.href;
  }

  function qrLaden(img, fertig) {
    // Dieselbe Schreibweisen-Suche wie bei den Logos: Groß-/Kleinschreibung
    // zählt auf Servern, und wer die Datei von Hand ablegt, trifft nicht
    // immer die erwartete Endung.
    var kandidaten = logoKandidaten(QR_NAME);
    if (!kandidaten.length) { fertig(null); return; }
    var i = 0;
    img.addEventListener("load", function () {
      img.classList.add("ist-geladen");
      fertig(kandidaten[i]);
    });
    img.addEventListener("error", function () {
      i++;
      if (i < kandidaten.length) img.src = kandidaten[i];
      else fertig(null);
    });
    img.src = kandidaten[0];
  }

  /** Der alte Weg: Feld anlegen, Inhalt auswählen, kopieren lassen. */
  function altKopieren(text) {
    var feld = el("textarea");
    feld.value = text;
    feld.setAttribute("readonly", "readonly");
    feld.style.cssText = "position:fixed;top:-1000px;left:0;opacity:0";
    document.body.appendChild(feld);
    var ok = false;
    try {
      feld.select();
      feld.setSelectionRange(0, text.length);   // iOS braucht das
      ok = document.execCommand("copy");
    } catch (e) {}
    feld.remove();
    return ok;
  }

  /**
   * Letzter Ausweg: die Adresse sichtbar und vorausgewählt hinstellen,
   * damit sie sich wenigstens von Hand abgreifen lässt.
   */
  function zeigeAdresse(text) {
    var leiste = document.getElementById("teilen-knoepfe");
    if (!leiste || document.getElementById("teilen-adresse")) return;
    var feld = el("input", "teilen-adresse");
    feld.id = "teilen-adresse";
    feld.type = "text";
    feld.value = text;
    feld.setAttribute("readonly", "readonly");
    feld.setAttribute("aria-label", "Adresse zum Kopieren");
    leiste.appendChild(feld);
    feld.focus();
    feld.select();
  }

  function teilenAufbauen() {
    var karte = document.getElementById("sidebar-teilen");
    if (!karte) return;
    var knopf = document.getElementById("teilen-qr");
    var bild = document.getElementById("teilen-qr-bild");
    var text = document.getElementById("teilen-text");
    var leiste = document.getElementById("teilen-knoepfe");

    var adresse = teilenAdresse();

    if (adresse && navigator.share) {
      var sharen = el("button", "btn btn--klein", "teilen …");
      sharen.type = "button";
      sharen.addEventListener("click", function () {
        navigator.share({
          title: "BASTAKLIM – BZT-Filter",
          text: "Bestandeszieltypen nach Klimastufe und Standort",
          url: teilenAdresse()
        }).catch(function () {});   // Abbrechen ist kein Fehler
      });
      leiste.appendChild(sharen);
    }

    if (adresse) {
      var kopieren = el("button", "btn btn--klein", "Link kopieren");
      kopieren.type = "button";
      kopieren.addEventListener("click", function () {
        var url = teilenAdresse();
        var fertig = function (ok) {
          kopieren.textContent = ok ? "kopiert ✓" : "bitte von Hand kopieren";
          if (!ok) zeigeAdresse(url);
          window.setTimeout(function () {
            kopieren.textContent = "Link kopieren";
          }, ok ? 1600 : 3000);
        };
        // Erst die moderne Zwischenablage, dann der alte Weg über ein
        // ausgewähltes Feld. Der ist nötig, weil die Clipboard-API in
        // manchen Browsern und Einstellungen verweigert wird – und ein
        // Teilen-Knopf, der nur "ging nicht" sagt, ist keiner.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url)
            .then(function () { fertig(true); },
                  function () { fertig(altKopieren(url)); });
        } else {
          fertig(altKopieren(url));
        }
      });
      leiste.appendChild(kopieren);
    }

    qrLaden(bild, function (pfad) {
      if (pfad) {
        knopf.hidden = false;
        text.hidden = false;
        knopf.addEventListener("click", function () {
          viewerOeffnen("BASTAKLIM teilen",
            "Mit der Kamera des Telefons scannen",
            [{ bild: pfad, alt: "QR-Code zum Öffnen von BASTAKLIM" }]);
        });
      } else {
        bild.remove();
      }
      // Die Karte erscheint, sobald sie etwas zu bieten hat – sonst stünde
      // eine leere Überschrift "Teilen" in der Leiste.
      karte.hidden = !pfad && !leiste.children.length;
    });
  }

  teilenAufbauen();


  /* --- Umschalter light / professional ---------------------------------- *
   *
   * Beide Ansichten stehen in derselben Seite und laufen gleichzeitig; der
   * Umschalter blendet nur um. Das ist mit Absicht so: Wer im geführten
   * Ablauf einen Standort gefunden hat, findet ihn in der Profi-Ansicht
   * noch gesetzt vor, ohne dass die Seite neu lädt.
   *
   * Gemerkt wird die Wahl, damit die App beim nächsten Start dort weiter-
   * macht. Ein "?ansicht=light" in der Adresse hat Vorrang – darüber führt
   * die alte light.html weiter, damit vorhandene Links gültig bleiben.
   * --------------------------------------------------------------------- */

  (function ansichtSchalter() {
    var knoepfe = document.querySelectorAll("[data-ansicht]");
    if (!knoepfe.length) return;

    var ausAdresse = (location.search.match(/[?&]ansicht=(light|professional|intern)/) || [])[1];
    var gemerkt = null;
    try { gemerkt = window.localStorage.getItem("bzt-ansicht"); } catch (e) {}
    setzen(ausAdresse || gemerkt || "professional");

    Array.prototype.forEach.call(knoepfe, function (b) {
      b.addEventListener("click", function () { setzen(b.dataset.ansicht); });
    });

    function setzen(welche) {
      if (["light", "professional", "intern"].indexOf(welche) === -1) {
        welche = "professional";
      }
      // Die interne Ansicht gibt es nur, wo auch die Anmeldung steht.
      if (welche === "intern" && !document.getElementById("anmeldung")) {
        welche = "professional";
      }
      document.documentElement.dataset.ansicht = welche;
      Array.prototype.forEach.call(knoepfe, function (b) {
        var an = b.dataset.ansicht === welche;
        b.classList.toggle("is-on", an);
        b.setAttribute("aria-pressed", an ? "true" : "false");
      });
      try { window.localStorage.setItem("bzt-ansicht", welche); } catch (e) {}
    }
  })();

  /* --- Schmale Fenster: Reiter statt vier Spalten ----------------------- *
   *
   * Auf dem Telefon liegen die vier Spalten untereinander – man scrollt an
   * dreien vorbei, um die vierte zu sehen. Deshalb wird dort immer nur eine
   * gezeigt und oben stehen vier Reiter mit der Zahl der noch möglichen
   * Einträge. Auf dem Desktop bleibt alles wie bisher; die Leiste ist per
   * CSS ausgeblendet und wird gar nicht erst gebraucht.
   * --------------------------------------------------------------------- */

  var reiterLeiste = document.getElementById("spalten-reiter");
  var reiterAktiv = "kli";
  var reiterKnopf = {};

  function reiterAufbauen() {
    if (!reiterLeiste || !SPALTEN_DA) return;
    reiterLeiste.textContent = "";
    FACETS.forEach(function (f) {
      var b = el("button", "spalten-reiter-knopf" +
                           (f === reiterAktiv ? " ist-aktiv" : ""));
      b.type = "button";
      b.dataset.reiter = f;
      b.setAttribute("aria-pressed", f === reiterAktiv ? "true" : "false");
      b.appendChild(el("span", "reiter-name", LABEL[f]));
      b.appendChild(el("b", "reiter-zahl", "–"));
      b.addEventListener("click", function () { reiterWaehlen(f); });
      reiterKnopf[f] = b;
      reiterLeiste.appendChild(b);
    });
    reiterWaehlen(reiterAktiv);
  }

  function reiterWaehlen(f) {
    reiterAktiv = f;
    FACETS.forEach(function (g) {
      if (colEl[g]) colEl[g].classList.toggle("ist-aktiv", g === f);
      if (reiterKnopf[g]) {
        reiterKnopf[g].classList.toggle("ist-aktiv", g === f);
        reiterKnopf[g].setAttribute("aria-pressed", g === f ? "true" : "false");
      }
    });
  }

  // Zahlen der Reiter nachführen – dieselben Werte wie in den Spaltenköpfen
  function reiterZahlen() {
    if (!reiterLeiste) return;
    FACETS.forEach(function (f) {
      var quelle = colEl[f] && colEl[f].querySelector("[data-count]");
      if (reiterKnopf[f] && quelle) {
        reiterKnopf[f].querySelector(".reiter-zahl").textContent = quelle.textContent;
      }
      if (reiterKnopf[f]) {
        reiterKnopf[f].classList.toggle("hat-auswahl", sel[f].size > 0);
      }
    });
  }

  /* --- Kopfleiste am Telefon ausblenden beim Scrollen -------------------- *
   *
   * Die dunkle Leiste ist klebend und nimmt am Telefon dauerhaft Platz weg.
   * Beim Scrollen nach unten fährt sie jetzt weg, beim Scrollen nach oben
   * kommt sie zurück – wie man es von Apps kennt. Am oberen Rand ist sie
   * immer da.
   * --------------------------------------------------------------------- */

  (function kopfleiste() {
    var kopf = document.querySelector(".app-header");
    if (!kopf) return;
    var zuletzt = 0;
    var laeuft = false;

    window.addEventListener("scroll", function () {
      if (laeuft) return;
      laeuft = true;
      window.requestAnimationFrame(function () {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        // Kleine Bewegungen ignorieren, sonst zappelt die Leiste
        if (Math.abs(y - zuletzt) > 6) {
          kopf.classList.toggle("ist-weg", y > zuletzt && y > 90);
          zuletzt = y;
        }
        laeuft = false;
      });
    }, { passive: true });
  })();

  /* --- Gemeinsamer Kern fuer light.js und intern.js --------------------- *
   *
   * Nur diese Funktionen sind von aussen gedacht. Wer hier etwas ergaenzt:
   * bitte kein DOM zurueckgeben, das an die vier Spalten gebunden ist.
   * --------------------------------------------------------------------- */

  /**
   * Baumarten eines Standorts – Grundlage der Light-Version.
   *
   * kliId    Kuerzel der Klimastufe, z. B. "Tm"
   * stgrIds  eine oder mehrere Standortgruppen, z. B. ["Z2", "Z2g"]
   *
   * Liefert die passenden Kombinationen und je Baumart den Maximalanteil
   * ueber alle dort moeglichen BZT sowie den besten Rang (1 = fuehrende
   * Baumart). Genau danach sortiert die Profi-Version ihre Baumartenspalte.
   */
  function baumartenFuer(kliId, stgrIds) {
    var k = idxKli.get(kliId);
    var s = new Set();
    (stgrIds || []).forEach(function (id) {
      var i = idxStgr.get(id);
      if (i != null) s.add(i);
    });
    var rows = KOMBIS.filter(function (r) {
      return (k == null || r[0] === k) && (!s.size || s.has(r[1]));
    });
    return { rows: rows, stat: baumartStatistik(rows) };
  }

  /** Auswahl von aussen setzen (intern.js: Vorbelegung aus der Forstadresse). */
  function setzeAuswahl(auswahl) {
    if (!SPALTEN_DA) return;
    FACETS.forEach(function (f) {
      sel[f].clear();
      ((auswahl && auswahl[f]) || []).forEach(function (id) { sel[f].add(id); });
    });
    fokusBzt = null;
    render();
  }

  window.BZT_KERN = {
    modus: MODUS,
    daten: D,
    thumb: thumb,             // Bildkachel mit Endungs-Fallback
    prozent: prozent,
    artName: artName,
    baumartenFuer: baumartenFuer,
    setzeAuswahl: setzeAuswahl
  };

  /* --- Start ----------------------------------------------------------- */

  var metaEl = document.getElementById("meta-line");
  if (metaEl) {
    metaEl.textContent =
      D.meta.kombinationen + " Kombinationen · " +
      D.klimastufen.length + " Klimastufen · " + D.standorte.length + " Standortgruppen · " +
      D.bzt.length + " BZT · " + D.baumarten.length + " Baumarten";
  }

  if (SPALTEN_DA) {
    reiterAufbauen();
    leseHash();
    render();
  }

  /* --- App-Betrieb (PWA) ------------------------------------------------ *
   *
   * Der Service Worker macht aus der Seite eine installierbare App. Ohne
   * ihn bietet der Browser nur eine Verknüpfung an – kein eigenes Symbol,
   * kein Start ohne Adresszeile.
   *
   * Nur über http/https: Beim Öffnen per Doppelklick (file://) sperrt der
   * Browser Service Worker vollständig. Die App läuft dort trotzdem, nur
   * eben ohne Vorrat – deshalb wird hier still übersprungen.
   * --------------------------------------------------------------------- */

  if ("serviceWorker" in navigator &&
      (location.protocol === "https:" ||
       location.hostname === "localhost" ||
       location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        // Kein Grund, den Betrieb zu stören – die App läuft auch so.
      });
    });
  }

  // Chrome bietet das Installieren nur an, wenn die Seite danach fragt.
  // Der Knopf erscheint erst, wenn der Browser bereit ist, und
  // verschwindet nach dem Installieren wieder.
  /**
   * Läuft die Seite bereits als installierte App?
   *
   * Zwei Wege, weil kein einzelner überall stimmt: display-mode kennen
   * die meisten Browser, navigator.standalone nur Safari.
   */
  function laeuftAlsApp() {
    try {
      if (window.matchMedia &&
          window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (e) {}
    return window.navigator.standalone === true;
  }

  /**
   * iPhone oder iPad?
   *
   * ⚠️ Das iPad meldet sich seit iPadOS 13 als "Macintosh". Ohne die
   * zweite Prüfung auf Berührungspunkte fiele es durch und bekäme den
   * Hinweis nie zu sehen.
   */
  function istIOS() {
    var ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }

  /* Ist BASTAKLIM auf diesem Gerät schon als App installiert?
   *
   * Direkt fragen kann man das nur in den Chromium-Browsern
   * (getInstalledRelatedApps, siehe unten). Damit die Antwort auch sonst
   * bekannt bleibt, wird das Installieren hier vermerkt – und wieder
   * gelöscht, sobald der Browser erneut ein Angebot macht, denn das tut
   * er nur für eine NICHT installierte App.
   */
  var INSTALL_MERKER = "bzt-installiert";

  function merkerLesen() {
    try { return window.localStorage.getItem(INSTALL_MERKER) === "1"; }
    catch (e) { return false; }
  }

  function merkerSchreiben(an) {
    try {
      if (an) window.localStorage.setItem(INSTALL_MERKER, "1");
      else window.localStorage.removeItem(INSTALL_MERKER);
    } catch (e) {}
  }

  /* --- Installieren ------------------------------------------------------ *
   *
   * ⚠️ Der Knopf haengt NICHT mehr an "beforeinstallprompt".
   *
   * Das war die urspruengliche Fassung, und sie hat zwei Loecher: Safari
   * loest das Ereignis gar nicht aus, und Chrome loest es nach eigenen
   * Regeln aus – mal sofort, mal erst nach ein paar Besuchen, und nie
   * mehr, wenn die App schon einmal installiert war. Der Knopf war damit
   * mal da und mal weg, ohne dass ein Mensch den Unterschied erklaeren
   * koennte.
   *
   * Jetzt umgekehrt: Der Knopf steht immer da, SOLANGE die Seite nicht
   * schon als App laeuft. Hat der Browser ein Angebot gemacht, oeffnet er
   * den echten Dialog; sonst erklaert er den Weg von Hand. Fuer jeden
   * Browser einen eigenen, denn sie unterscheiden sich.
   * ----------------------------------------------------------------- */

  function browserArt() {
    var ua = navigator.userAgent || "";
    if (istIOS()) return "ios";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Android/.test(ua)) return "android";
    if (/Edg\//.test(ua)) return "edge";
    if (/Chrome\/|Chromium\//.test(ua)) return "chrome";
    return "andere";
  }

  // Die Symbole, nach denen man in der jeweiligen Leiste sucht.
  var GLYPHEN = {
    teilen: '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/>' +
            '<path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
    plus:   '<rect x="4" y="4" width="16" height="16" rx="3"/>' +
            '<path d="M12 9v6"/><path d="M9 12h6"/>',
    menue:  '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/>' +
            '<circle cx="12" cy="19" r="1.4"/>',
    // ⚠️ Senkrecht oder waagerecht ist keine Frage des Browsers,
    // sondern der Fassung – Edge hat beides gehabt. Deshalb werden in den
    // Anleitungen beide Punkte-Symbole nebeneinander gezeigt, statt eines
    // davon zu behaupten.
    menue_quer: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/>' +
            '<circle cx="19" cy="12" r="1.4"/>',
    schirm: '<rect x="3" y="4" width="18" height="13" rx="2"/>' +
            '<path d="M8 20h8"/><path d="M12 17v3"/>'
  };

  function glyphe(art) {
    return '<span class="ios-glyphe" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + GLYPHEN[art] + '</svg></span>';
  }

  /* Die Wege von Hand – fuer jeden Browser ein eigener.
   *
   * ⚠️ Keine Menuefolge als Tatsache behaupten. Chrome und Edge
   * benennen und verschieben diese Eintraege von Fassung zu Fassung; eine
   * Anleitung, die zwei Fassungen alt ist, schickt Leute in die Irre –
   * genau das ist hier schon passiert („Menue ⋮ → Apps", waehrend es in
   * Wirklichkeit waagerechte Punkte und „Weitere Tools → Apps" waren).
   *
   * Deshalb steht hier, WONACH zu suchen ist, und nicht, wo es steht. Als
   * Tatsache benannt wird nur, was stabil ist: das Teilen-Symbol in Safari
   * und das Symbol in der Adresszeile. Die drei Punkte stehen als Paar da
   * (senkrecht und waagerecht), weil beide Fassungen im Umlauf sind.
   */
  var ANLEITUNG = {
    ios: {
      titel: "BASTAKLIM auf den Home-Bildschirm",
      lead: "Safari fragt nicht von selbst. In zwei Schritten geht es trotzdem:",
      schritte: [
        "Unten in der Leiste auf <strong>Teilen</strong> " +
          glyphe("teilen") + " tippen.",
        "In der Liste " + glyphe("plus") +
          " <strong>„Zum Home-Bildschirm“</strong> wählen."
      ],
      fuss: "Danach liegt BASTAKLIM als eigenes Symbol auf dem " +
            "Home-Bildschirm und startet ohne Adresszeile – auch ohne Netz."
    },
    android: {
      titel: "BASTAKLIM als App einrichten",
      lead: "Der Browser hat gerade nicht von selbst gefragt. So geht es "
            + "trotzdem:",
      schritte: [
        "Das Menü des Browsers öffnen " + glyphe("menue") + ".",
        "Dort nach <strong>„App installieren“</strong> oder " +
          "<strong>„Zum Startbildschirm zufügen“</strong> suchen."
      ],
      fuss: "Danach liegt BASTAKLIM als eigenes Symbol auf dem " +
            "Startbildschirm und startet ohne Adresszeile – auch ohne Netz.",
      mehr: "Schon installiert? Dann hier aktualisieren",
      mehrZiel: "aktualisierung"
    },
    chrome: {
      titel: "BASTAKLIM als App einrichten",
      lead: "Chrome hat gerade nicht von selbst gefragt – das tut es nur " +
            "manchmal, und nie, wenn die App schon installiert war. " +
            "Von Hand geht es so:",
      schritte: [
        "Rechts in der Adresszeile nach diesem Symbol " + glyphe("schirm") +
          " suchen und darauf klicken.",
        "Steht dort keines: das Browsermenü öffnen – drei Punkte, je " +
          "nach Fassung senkrecht oder waagerecht " + glyphe("menue") +
          glyphe("menue_quer") + " – und darin nach " +
          "<strong>„installieren“</strong> suchen; der Eintrag steckt " +
          "je nach Fassung unter <em>Streamen, Speichern und Teilen</em> " +
          "oder <em>Weitere Tools</em>."
      ],
      fuss: "Danach startet BASTAKLIM in einem eigenen Fenster ohne " +
            "Adresszeile – auch ohne Netz.",
      mehr: "Schon installiert? Dann hier aktualisieren",
      mehrZiel: "aktualisierung"
    },
    edge: {
      titel: "BASTAKLIM als App einrichten",
      lead: "Edge hat gerade nicht von selbst gefragt – das tut es nur " +
            "manchmal, und nie, wenn die App schon installiert war. " +
            "Von Hand geht es so:",
      schritte: [
        "Rechts in der Adresszeile nach diesem Symbol " + glyphe("schirm") +
          " suchen und darauf klicken.",
        "Steht dort keines: das Browsermenü öffnen – drei Punkte, je " +
          "nach Fassung senkrecht oder waagerecht " + glyphe("menue") +
          glyphe("menue_quer") + " – und darin nach " +
          "<strong>„Apps“</strong> suchen; oft liegt es unter " +
          "<em>Weitere Tools</em> → <em>Apps</em> → " +
          "<em>„Diese Website als App installieren“</em>."
      ],
      fuss: "Danach startet BASTAKLIM in einem eigenen Fenster ohne " +
            "Adresszeile – auch ohne Netz.",
      mehr: "Schon installiert? Dann hier aktualisieren",
      mehrZiel: "aktualisierung"
    },
    firefox: {
      titel: "In Firefox geht das leider nicht",
      lead: "Firefox am Rechner kann Web-Apps nicht installieren – das ist " +
            "eine Entscheidung des Browsers, kein Fehler dieser Seite.",
      schritte: [
        "Am Rechner: die Seite in <strong>Chrome</strong> oder " +
          "<strong>Edge</strong> öffnen und dort installieren.",
        "Am Telefon: Firefox für Android kann es über das Menü " +
          glyphe("menue") + " → <strong>„Zum Startbildschirm“</strong>."
      ],
      fuss: "Als Lesezeichen funktioniert BASTAKLIM in Firefox " +
            "selbstverständlich auch – nur eben im Browserfenster."
    },
    andere: {
      titel: "BASTAKLIM als App einrichten",
      lead: "Ihr Browser bietet das Installieren über sein eigenes Menü an:",
      schritte: [
        "Das Menü des Browsers öffnen – drei Punkte " + glyphe("menue") +
          glyphe("menue_quer") + " oder ein Strichmenü.",
        "Darin nach <strong>„Installieren“</strong>, <strong>„Zum " +
          "Startbildschirm“</strong> oder <strong>„App hinzufügen“</strong> " +
          "suchen."
      ],
      fuss: "Findet sich dort nichts, kann der Browser es nicht – die Seite " +
            "funktioniert dann als gewöhnliches Lesezeichen weiter.",
      mehr: "Schon installiert? Dann hier aktualisieren",
      mehrZiel: "aktualisierung"
    },

    /* ⚠️ Dieser Zettel tritt an die Stelle der Installationsanleitung,
       wenn BASTAKLIM auf dem Gerät schon installiert ist. Dann macht der
       Browser naemlich kein Angebot mehr – und eine Anleitung zum
       Installieren waere die falsche Antwort auf den Knopfdruck. Gefragt
       ist dann das Aktualisieren. */
    aktualisierung: {
      titel: "BASTAKLIM ist schon installiert",
      lead: "Deshalb bietet der Browser das Installieren nicht noch einmal " +
            "an. Die installierte App holt sich eine neue Fassung beim " +
            "Start von selbst – hier geht es sofort:",
      schritte: [
        "Hier unten auf <strong>Jetzt nachsehen</strong> drücken – die Seite " +
          "prüft, ob es eine neuere Fassung gibt, und holt sie.",
        "Danach die installierte App einmal schließen und neu öffnen – " +
          "dann ist die neue Fassung auch dort drin."
      ],
      tun: "Jetzt nachsehen",
      fuss: "Ein vorbereiteter Offline-Vorrat bleibt dabei erhalten; " +
            "„Für offline vorbereiten“ muss nach einer Aktualisierung " +
            "nicht wiederholt werden.",
      mehr: "App doch nicht mehr auf dem Gerät? Weg zum Installieren zeigen",
      mehrZiel: "anleitung"
    }
  };

  (function installKnopf() {
    var knopf = document.getElementById("install");
    if (!knopf) return;
    var hilfe = document.getElementById("install-hilfe");
    var tunKnopf = document.getElementById("install-hilfe-tun");
    var mehrKnopf = document.getElementById("install-hilfe-mehr");
    var standZeile = document.getElementById("install-hilfe-stand");
    var angebot = null;
    var installiert = merkerLesen();
    var offeneArt = null;

    function knopfBeschriften() {
      knopf.textContent = installiert ? "App aktualisieren" : "App installieren";
      knopf.title = installiert
        ? "BASTAKLIM ist auf diesem Gerät schon installiert – nach einer " +
          "neuen Fassung sehen"
        : "BASTAKLIM als eigene App einrichten";
    }

    window.addEventListener("beforeinstallprompt", function (ev) {
      // Das eigene Angebot des Browsers aufheben – es ist der bequemste
      // Weg, wenn es denn kommt.
      ev.preventDefault();
      angebot = ev;
      // ⚠️ Dieses Angebot macht Chrome NIE für eine schon installierte
      // App. Kommt es doch, ist der Merker veraltet – etwa weil die App
      // zwischendurch gelöscht wurde.
      installiert = false;
      merkerSchreiben(false);
      knopfBeschriften();
      knopf.hidden = false;
      // Trifft es ein, während die Anleitung offen steht, ist die
      // Anleitung überflüssig geworden.
      if (hilfe && !hilfe.hidden) hilfeZeigen(false);
    });

    // Sichtbar, solange die Seite nicht schon als App läuft.
    knopf.hidden = laeuftAlsApp();
    knopfBeschriften();

    /* Der verlässliche Weg nachzusehen, ob die App schon auf dem Gerät
       ist: getInstalledRelatedApps meldet sie, weil sie im Manifest unter
       related_applications auf ihr eigenes Manifest zeigt. Das kennen nur
       die Chromium-Browser, und nur über https; Safari und Firefox
       antworten gar nicht. Dort bleibt es beim Merker und beim
       Ausbleiben des Angebots. */
    if (navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps().then(function (liste) {
        if (!liste || !liste.length) return;
        installiert = true;
        merkerSchreiben(true);
        knopfBeschriften();
      }).catch(function () {});
    }

    /* Kann dieser Browser von selbst nach dem Installieren fragen?
       Wenn ja und er fragt trotzdem nicht, ist die App so gut wie sicher
       schon installiert – dann ist Aktualisieren die richtige Antwort. */
    function fragtVonSelbst() {
      var art = browserArt();
      return art === "chrome" || art === "edge" || art === "android";
    }

    function hilfeZeigen(an, art) {
      if (!hilfe) return;
      if (an) {
        offeneArt = art || browserArt();
        var a = ANLEITUNG[offeneArt] || ANLEITUNG.andere;
        document.getElementById("install-hilfe-titel").textContent = a.titel;
        document.getElementById("install-hilfe-lead").textContent = a.lead;
        var ol = document.getElementById("install-hilfe-schritte");
        ol.textContent = "";
        a.schritte.forEach(function (text, i) {
          var li = document.createElement("li");
          li.innerHTML = '<span class="ios-schritt">' + (i + 1) + "</span>" + text;
          ol.appendChild(li);
        });
        document.getElementById("install-hilfe-fuss").textContent = a.fuss;
        if (tunKnopf) {
          tunKnopf.hidden = !a.tun;
          tunKnopf.disabled = false;
          if (a.tun) tunKnopf.textContent = a.tun;
        }
        if (mehrKnopf) {
          mehrKnopf.hidden = !a.mehr;
          if (a.mehr) mehrKnopf.textContent = a.mehr;
        }
        if (standZeile) { standZeile.hidden = true; standZeile.textContent = ""; }
      }
      hilfe.hidden = !an;
    }

    function dialogZeigen() {
      angebot.prompt();
      angebot.userChoice.then(function () {
        angebot = null;
        knopf.hidden = true;
      });
    }

    /* Nach einer neuen Fassung sehen.
     *
     * sw.js ruft beim Installieren skipWaiting() auf, eine neue Fassung
     * übernimmt also sofort. Zu tun ist deshalb nur: den Browser die sw.js
     * neu holen lassen, und wenn dabei eine andere Fassung herauskommt,
     * die Seite neu laden. Der Merker bleibt, wie er ist – am Installiert-
     * sein ändert eine Aktualisierung nichts. */
    function nachsehen() {
      function sagen(satz) {
        if (!standZeile) return;
        standZeile.textContent = satz;
        standZeile.hidden = !satz;
      }
      function wieder(text) {
        if (!tunKnopf) return;
        tunKnopf.textContent = text;
        tunKnopf.disabled = false;
      }
      if (!navigator.serviceWorker) {
        sagen("Dieser Browser verwaltet keine Fassungen. Die App einmal " +
              "schließen und neu öffnen genügt dann.");
        return;
      }
      var text = tunKnopf ? tunKnopf.textContent : "";
      if (tunKnopf) { tunKnopf.disabled = true; tunKnopf.textContent = "sieht nach …"; }
      sagen("");

      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) {
          wieder(text);
          sagen("Hier läuft kein Service Worker – beim Öffnen als Datei " +
                "ist das normal. Über die Web-Adresse geht es.");
          return;
        }
        var neu = false;
        function gemerkt() { neu = true; }
        reg.addEventListener("updatefound", gemerkt);
        return reg.update().then(function () {
          // updatefound trifft kurz nach dem Versprechen ein.
          return new Promise(function (fertig) { window.setTimeout(fertig, 700); });
        }).then(function () {
          reg.removeEventListener("updatefound", gemerkt);
          if (neu || reg.installing || reg.waiting) {
            sagen("Neue Fassung gefunden – die Seite wird neu geladen.");
            window.setTimeout(function () { location.reload(); }, 900);
            return;
          }
          wieder(text);
          sagen("Schon auf dem neuesten Stand.");
        });
      }).catch(function () {
        wieder(text);
        sagen("Nachsehen hat nicht geklappt – ohne Netz geht es nicht.");
      });
    }

    /* ⚠️ Der eigene Dialog des Browsers ist IMMER besser als eine
       Anleitung: Ein Klick, und die Schritte laufen von selbst. Die
       Anleitung ist nur der Notnagel – und sie altert schlecht, weil die
       Browser ihre Menüs umbauen.

       Das Angebot trifft aber nicht immer vor dem ersten Klick ein; Chrome
       schickt es gern eine Sekunde nach dem Laden. Deshalb wird beim Klick
       kurz gewartet, statt sofort die Anleitung aufzuschlagen. */
    var WARTEN_MS = 1500;

    knopf.addEventListener("click", function () {
      if (angebot) { dialogZeigen(); return; }

      // Schon installiert: Auf ein Angebot zu warten wäre vergebens, der
      // Browser macht für eine installierte App keines mehr.
      if (installiert) { hilfeZeigen(true, "aktualisierung"); return; }

      var beschriftung = knopf.textContent;
      knopf.disabled = true;
      knopf.textContent = "einen Moment …";
      var bis = Date.now() + WARTEN_MS;

      (function schauen() {
        if (angebot) {
          knopf.disabled = false;
          knopf.textContent = beschriftung;
          dialogZeigen();
          return;
        }
        if (Date.now() >= bis) {
          knopf.disabled = false;
          // Kein Angebot, obwohl dieser Browser von selbst fragen könnte:
          // dann ist die App schon da. Sonst der Weg von Hand.
          if (fragtVonSelbst()) {
            installiert = true;
            merkerSchreiben(true);
            knopfBeschriften();
            hilfeZeigen(true, "aktualisierung");
          } else {
            knopf.textContent = beschriftung;
            hilfeZeigen(true);
          }
          return;
        }
        window.setTimeout(schauen, 100);
      })();
    });

    if (hilfe) {
      document.getElementById("install-hilfe-zu")
        .addEventListener("click", function () { hilfeZeigen(false); });
      hilfe.addEventListener("click", function (ev) {
        if (ev.target === hilfe) hilfeZeigen(false);
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && !hilfe.hidden) hilfeZeigen(false);
      });
    }
    if (tunKnopf) tunKnopf.addEventListener("click", nachsehen);
    if (mehrKnopf) {
      mehrKnopf.addEventListener("click", function () {
        if (offeneArt === "aktualisierung") {
          // Der Mensch weiß es besser als jede Heuristik: Die App ist
          // nicht da. Also Merker löschen und den Weg zum Installieren.
          installiert = false;
          merkerSchreiben(false);
          knopfBeschriften();
          hilfeZeigen(true, browserArt());
        } else {
          hilfeZeigen(true, "aktualisierung");
        }
      });
    }

    window.addEventListener("appinstalled", function () {
      angebot = null;
      installiert = true;
      merkerSchreiben(true);
      knopfBeschriften();
      knopf.hidden = true;
      hilfeZeigen(false);
    });
  })();

  // light.js und intern.js warten auf dieses Ereignis, damit die
  // Reihenfolge der <script>-Tags egal ist.
  document.dispatchEvent(new CustomEvent("bzt-bereit"));
})();
