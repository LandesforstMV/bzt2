# BZT-Filter

Interaktive HTML-Anwendung zum Filtern der BZT-Zieltabelle
(*B5_BZT_Zieltabelle_01.wide.All_Appedit.xlsx*) nach

**Klimastufe → Standort → Bestandeszieltyp (BZT) → Baumart**

Die vier Spalten der App entsprechen den vier Kachelspalten der Skizze. Jede
Spalte zeigt nur noch die Einträge, die mit der übrigen Auswahl tatsächlich
vorkommen – die Zahl in der Spaltenüberschrift (`20 / 83`) nennt die Anzahl
der noch möglichen Einträge, das Feld rechts an jeder Kachel die Anzahl der
Tabellenzeilen dahinter.

## Fassungen

**light und professional stehen in derselben Seite.** Oben schaltet ein
Umschalter um – ohne Neuladen, und die getroffene Auswahl bleibt erhalten:
Wer im geführten Ablauf einen Standort gefunden hat, findet ihn in der
Profi-Ansicht gesetzt vor.

| Datei | Inhalt |
|---|---|
| `index.html` | beide Ansichten, umschaltbar |
| `light.html` | Weiterleitung auf `index.html?ansicht=light` |

Die Weiterleitung gibt es, damit vorhandene Links und QR-Codes gültig
bleiben. `?ansicht=light` in der Adresse wählt die Light-Ansicht direkt vor;
sonst merkt sich die App die zuletzt benutzte.

Eine dritte Fassung für den internen Gebrauch (`intern.html`) kommt weiter
unten zur Sprache.

### light

Drei Schritte, Bestockungszieltypen kommen nicht vor:

1. **Klick in die Karte.** Gefärbt sind nur die Waldflächen; die App liest
   die Klimastufe im Umkreis von rund 5 km um den Klick ab und nennt die
   Mischung („Tm 68 % · Tt 32 %"). Liegt dort kein Wald, sagt sie das.
   Die Klimastufe lässt sich daneben auch direkt wählen.
2. **Standort**, wahlweise Schritt für Schritt über
   Wasserhaushalt → Feuchtestufe → Nährkraft → Besonderheit, oder direkt
   aus der Liste der 83 Standortgruppen.
3. **Baumarten** mit ihrem höchsten möglichen Anteil („bis 90 %"). Oben
   stehen die bestandesbildenden Arten (Rang 1 und 2 der BZT-Gruppen),
   die Mischbaumarten stecken hinter einem Aufklapper. Jede Baumart trägt
   ihren Rang als Text; grün hinterlegt sind zusätzlich die, die in
   mindestens einem Zieltyp die **führende** Baumart sind. Rang und Anteil
   sind zweierlei – zwei Arten können denselben Höchstanteil haben und
   trotzdem verschieden weit vorn stehen.

   **Mischung:** Ein Klick auf eine Baumart nimmt sie in die Mischung auf.
   Die Liste zeigt dann nur noch die Arten, die sich mit allen gewählten
   zusammen in einem Zieltyp führen lassen; die übrigen stehen ausgegraut
   in einem eigenen Aufklapper. Die Höchstanteile werden dabei neu
   gerechnet – sie sinken meist, je mehr Arten dazukommen.

Die vierte Frage nach der Besonderheit erscheint nur, wenn die ersten drei
Antworten mehrere Standortgruppen offen lassen – das ist bei 18 von 59
Kombinationen der Fall (`Z2` / `Z2g` / `Z2+`). Solange sie unbeantwortet
ist, gilt das Ergebnis für alle passenden Gruppen zusammen.

### intern

Es gibt eine dritte Ansicht für den internen Gebrauch, mit Forstadresse und
Anmeldung. Sie ist **hier nicht enthalten** – sie arbeitet mit einem
Datensatz der Landesforst, der nicht veröffentlicht wird.

## Öffnen

`index.html`, `light.html` oder `intern.html` im Browser öffnen – ein
Webserver wird **nicht** benötigt, die Dateien funktionieren per Doppelklick
(`file://`). Alle Daten liegen in `data/*.js` und werden direkt eingebunden.

Zuerst erscheint das **Startbild** `assets/front.PNG` mit laufendem
Ladebalken; ein Klick (oder Enter) öffnet die Anwendung. Fehlt die Datei,
zeigt der Startbildschirm eine gezeichnete Ersatzdarstellung im gleichen
Stil. Auch `assets/front.png` und `assets/front.jpg` werden erkannt.

Links liegt eine **Seitenleiste** mit der BASTAKLIM-Karte (Version,
Namen, Kontakt), den Quell-PDFs und einer Kurzfassung der aktuellen
Auswahl. Das ☰ oben links klappt sie ein und aus; der Zustand bleibt
gespeichert. Die Namen und die Mail-Adresse stehen direkt in
`index.html` (Abschnitt `<aside class="sidebar">`) und sind dort als
`name1` / `name2` / `bastaklim@...` einzutragen.

## Bedienung

* **Vorwärts** – Klimastufe wählen, dann einen Standort: die Spalte BZT zeigt
  die dort möglichen Bestandeszieltypen, die Spalte Baumart die darin
  enthaltenen Baumarten, **absteigend nach Maximalanteil** sortiert.
* **Rückwärts** – direkt eine oder mehrere Baumarten wählen: Standort- und
  BZT-Spalte zeigen sofort, wo diese Baumarten vorkommen.
* Jede Spalte ist **mehrfach auswählbar**; eine erneute Auswahl hebt sie auf.
* Bei den Baumarten legt der Schalter **alle / eine** fest, ob ein BZT *alle*
  gewählten Baumarten enthalten muss (UND) oder *mindestens eine* (ODER).
* Die Baumarten-Chips in den Ergebniskarten sind ebenfalls anklickbar und
  setzen den Baumartenfilter.
* **Seitenansicht:** Das ⤢ an einer Klimastufen- oder BZT-Kachel und das
  Bestandesbild in den Ergebniskarten öffnen die Originalseite als Bild
  (bei einem BZT die beiden Seiten der BZT-Beschreibung, mit ‹ › oder
  Pfeiltasten umblätterbar). Von dort führt ein Link direkt an die
  passende Stelle im PDF.
* **Nicht mögliche zeigen** blendet die aktuell unmöglichen Optionen
  ausgegraut ein, statt sie auszublenden.
* Die aktuelle Auswahl steht in der Adresszeile (`#kli=Tm&ba=GDG`) und lässt
  sich als Link weitergeben.
* **Als CSV speichern** exportiert die aktuelle Treffermenge (Semikolon,
  UTF‑8 mit BOM – Excel-tauglich).
* **Standortblatt drucken** erzeugt aus der aktuellen Auswahl eine
  Druckfassung: Kopf mit den gesetzten Filtern, Datum und Quelle, darunter
  alle passenden BZT mit Bestandesbild, Anteilsspannen, Baumarten und
  Standortgruppen.

## Bilder

| Spalte | Ordner | Motiv | Stand |
|---|---|---|---|
| Klimastufe | `assets/klimastufe/` | Landeskarte, jeweils nur die eigene Klimastufe farbig | aus `Klimastufen_BZT.pdf` ausgeschnitten |
| Klimakarte (light) | `assets/klimastufe/karte.png` | dieselbe Karte mit allen drei Stufen, verlustfrei | dito, für den Kartenklick |
| Standort | `assets/standort/` | Standorts-Piktogramm Nährkraft × Feuchtestufe | von `tools/make_standortpiktogramme.py` gezeichnet |
| BZT | `assets/bzt/` | Bestandesbild der BZT-Seite | aus `BZT_Erlass.pdf` ausgeschnitten |
| Baumart | `assets/baumart/` | schematische Blattzeichnungen (Laub, Fiederblatt, Nadel) | von `tools/make_baumartenblaetter.py` gezeichnet |

Erzeugen lassen sich diese Bilder mit:

```bash
pip install pymupdf pillow numpy
python3 tools/extract_images.py            # Karten und Bestandesbilder aus den PDFs
python3 tools/make_baumartenblaetter.py    # Blattzeichnungen
python3 tools/make_standortpiktogramme.py  # Standorts-Piktogramme
python3 tools/make_klimaraster.py          # Klimastufe je Rasterzelle (light)
```

**Bild austauschen:** die eigene Datei unter dem erwarteten Namen in den
Ordner legen – fertig. Die App probiert der Reihe nach `.png`, `.jpg`,
`.jpeg`, `.webp`, `.svg`; ein selbst abgelegtes `RBU.png` gewinnt also
immer gegen die mitgelieferte `RBU.svg`, die dafür nicht gelöscht werden
muss. Fehlt jede Datei, erscheint ein gezeichneter Platzhalter.
Die vollständige Liste aller Dateinamen mit Vorhanden-Markierung steht in
[`assets/DATEILISTE.md`](assets/DATEILISTE.md).

Ordner und Endungen lassen sich ganz oben in `app.js` ändern
(`BILD_PFADE`, `BILD_ENDUNGEN`).

Die Standorts-Piktogramme sind der Darstellung im Erlass nachgebildet
(Abschnitt 3.5, Beispiel S. 17): eine Matrix aus den Nährkraftstufen
A–Z–M–K–R (arm → reich, als Spalten) und den Feuchtestufen trocken bis
sumpfig (als beschriftete Zeilen), mit der Zelle der jeweiligen
Standortgruppe markiert und ihrer Zeile hervorgehoben. Welcher Code zu welcher Feuchtestufe
gehört, steht wörtlich im Erlass (S. 8/9) und ist in
`tools/build_data.py` unter `FEUCHTE_REGELN` hinterlegt – alle 83 Codes
sind darüber eindeutig zugeordnet.

Die Blattzeichnungen sind schematisch, nicht bestimmungsgenau: sie zeigen
den Blatttyp (einfach, gelappt, handförmig, herzförmig, lanzettlich,
dreieckig, Fiederblatt) und vier Nadeltypen (Kiefer-Paar, Fichte,
flachnadelig, Lärchenbüschel). Einzelne Formen lassen sich über die
Parameter im Abschnitt `ARTEN` von `tools/make_baumartenblaetter.py`
nachjustieren.

## Logos und Favicon

Optional; fehlende Dateien werden ausgeblendet:

| Datei | Ort in der Oberfläche |
|---|---|
| `assets/favicon.ico` | Browser-Tab |
| `assets/front.PNG` | Startbild vor dem Einstieg |
| `assets/logo.png` | klein links oben neben dem Titel |
| `assets/logo_lf.png` | oben mittig |
| `assets/logo1.png` … `logo4.png` | Logoleiste unten rechts |

Die vier Logos unten rechts stehen nebeneinander und sind rechtsbündig
ausgerichtet: Kommt eines dazu, rücken die vorhandenen nach links.

## Quelldokumente

Beide PDFs liegen unter `dokumente/` und sind in der App verlinkt:

* `dokumente/BZT_Erlass.pdf` – Bestockungszieltypen im Klimawandel (MV).
  Jede BZT-Beschreibung beginnt auf der Seite aus der Spalte `Seiten`
  (BZT 1 → S. 16, danach je zwei Seiten pro BZT).
* `dokumente/Klimastufen_BZT.pdf` – Klimastufen nach BAS Standorts-Karte
  2023 (KS_41_10).

`tools/extract_images.py` rendert zusätzlich die BZT-Seiten nach
`assets/seiten/`, damit die Seitenansicht ohne PDF-Betrachter funktioniert.

## Daten aktualisieren

Wenn sich die Zieltabelle ändert:

```bash
pip install openpyxl
python3 tools/build_data.py
```

Das Skript liest `data/B5_BZT_Zieltabelle_01.wide.All_Appedit.xlsx` sowie
`data/Baumarten.Code.DSW.xlsx` und schreibt `data/bzt_data.js`,
`data/bzt_data.json` und `assets/DATEILISTE.md`. HTML, CSS und JS müssen
dafür nicht angefasst werden.

Die deutschen und wissenschaftlichen Baumartennamen stammen unverändert
aus der DSW-Kürzelliste; der wissenschaftliche Name wird auf Gattung und
Art gekürzt (Autorenkürzel entfallen) und in der App klein und kursiv
unter dem deutschen Namen ausgegeben. Der vollständige Eintrag inklusive
Autor steht im Tooltip der Baumarten-Chips.

Im Kopf von `tools/build_data.py` stehen die frei anpassbaren
Beschriftungen: Klimastufen-Texte, Nährstoff- und Wasserhaushaltsstufen
sowie die Farben der Standortkacheln.

## Als App installieren

`index.html` und `light.html` sind installierbare Web-Apps: Auf dem Telefon
legt „Zum Startbildschirm hinzufügen" ein eigenes Symbol an, die App startet
ohne Adresszeile und läuft **ohne Netz** weiter. Am Rechner bietet Chrome
einen Knopf „App installieren" in der Kopfleiste an.

In GitHub muss dafür nichts eingestellt werden – Pages liefert über HTTPS
aus, das genügt. Die Symbole erzeugt:

```bash
python3 tools/make_pwa_icons.py      # aus assets/logo.png
```

Wird eine Datei geändert, in `sw.js` die Zeile `var VERSION = "bastaklim-v1"`
hochzählen. Sonst behalten schon installierte Apps den alten Stand.

Beim Öffnen per Doppelklick (`file://`) entfällt das alles – der Browser
sperrt Service Worker dort. Die App läuft trotzdem, nur eben als Seite.

## Prüfen

`tools/pruefen.js` öffnet alle drei Seiten in Chromium und klickt sie durch:

```bash
npm install -g playwright
NODE_PATH=$(npm root -g) node tools/pruefen.js
```

Bildschirmfotos landen in `build/pruefung/`. Meldungen der Art
`ERR_FILE_NOT_FOUND` in der Browserkonsole sind normal – die App probiert
für jedes Bild mehrere Dateiendungen durch.

## Datenmodell

Aus 926 Tabellenzeilen entstehen:

* **3** Klimastufen – die erste heißt in der Oberfläche `Tf, Tlf, Tlm`,
  weil sie diese drei Stufen zusammenfasst; ihre Kennung bleibt `Tf`
* **83** Standortgruppen (`STGR_BZT`), gruppiert in die 6 Standort­beschreibungen
* **19** Bestandeszieltypen mit je 3 Baumartengruppen (Min-/Max-Anteil)
* **43** Baumarten
* **926** gültige Kombinationen aus (Klimastufe, Standortgruppe, BZT)

Die Baumartenzusammensetzung eines BZT ist in der Zieltabelle über alle
Standorte hinweg identisch; `tools/build_data.py` prüft das und bricht ab,
falls das einmal nicht mehr zutrifft.

## Offene Punkte

* Die Klartextnamen einiger Baumarten-Kürzel sind in `tools/build_data.py`
  mit `(?)` markiert (`BB`, `NBS`, `WRU`, `WWE`, `SWE`, `FWE`, `WHT`) – bitte
  gegen die Kürzelliste des Ursprungsdokuments prüfen und dort korrigieren.
* Die Beschreibungstexte der Klimastufen und der Nährstoffstufen
  (`R/K/M/Z/A`) sind Vorschläge und ebenfalls in `tools/build_data.py`
  hinterlegt.

## Dateien

```
index.html               professional: Startbild, Seitenleiste, vier Spalten
light.html               light:  geführter Ablauf in drei Schritten
styles.css               Gestaltung für alle drei (Farben/Größen in :root)
app.js                   gemeinsamer Kern: Filter, Kacheln, Viewer, Druck, CSV
light.js                 nur light:  Karte, Feuchtegradient, Baumartenliste
data/bzt_data.js         erzeugte Daten (von allen drei geladen)
data/bzt_data.json       dieselben Daten als JSON
data/klimaraster.js      Klimastufe je Rasterzelle, für den Kartenklick
data/*.xlsx              Quelltabellen
dokumente/*.pdf          Erlass und Klimastufen-Karte
tools/build_data.py      erzeugt die Daten aus den xlsx-Dateien
tools/extract_images.py  schneidet die Bilder aus den PDFs
tools/make_klimaraster.py          erzeugt das Klimaraster für light
tools/pruefen.js                   fährt alle drei Seiten im Browser durch
tools/make_baumartenblaetter.py    zeichnet die Blätter der 43 Baumarten
tools/make_standortpiktogramme.py  zeichnet die 83 Standorts-Piktogramme
assets/                  Bilder, Logos, DATEILISTE.md
```
