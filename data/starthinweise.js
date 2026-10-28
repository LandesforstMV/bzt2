/* Hinweise zur Standortskartierung – beim Start und über die Seitenleiste.
   ==========================================================================

   DIESE DATEI DARF VON HAND GEÄNDERT WERDEN. Alles ab "{" ist gewöhnliches
   JSON; nur die erste Zeile davor muss stehen bleiben.

   ⚠️ Warum nicht einfach eine .json? Weil die App auch per Doppelklick
   laufen muss (file://). Dort verbietet der Browser jedes fetch() auf
   Nachbardateien – eine .json käme nie an. Als .js wird sie wie jede
   andere Datei über <script> geladen und läuft überall.

   Felder
   ------
   fassung       Ganze Zahl. Nach jeder Textänderung um eins erhöhen: Der
                 Zettel erscheint dann bei allen wieder, auch wenn sie ihn
                 vor einer Stunde weggeklickt haben.
   abstandTage   Nach so vielen Tagen zeigt sich der Zettel von selbst
                 wieder. 0 = bei jedem Start, 365 = praktisch nur einmal.
   titel         Überschrift des Zettels.
   punkte        Die Hinweise, einer je Zeile. Beliebig viele.
   fuss          Kleingedruckte Zeile darunter. Weglassen: "" schreiben.
   knopf         Beschriftung des Knopfes, der den Zettel schließt.

   Anführungszeichen im Text als \" schreiben, sonst bricht die Datei.
   ========================================================================== */
window.BZT_STARTHINWEISE = {
  "fassung": 2,
  "abstandTage": 3,
  "titel": "Bitte folgende Hinweise von der Standortskartierung beachten",
  "punkte": [
    "Aktualität der Standortskarte prüfen.",
    "Kleinstandörtliche Gegebenheiten beachten – ggf. können kleinflächig innerhalb eines BZT andere Baumarten ausgewählt werden.",
    "Bei Standortswechsel innerhalb eines Standort-Polygons sind alle vorkommenden Standorte mit ihren Anteilen zu beachten.",
    "Humussensible Standorte beachten.",
    "Bei negativen Abweichungen in der Nährkraft der Humusform zur Stamm-Nährkraft des Bodens sind humusverbessernde Baumarten mit hohen Anteilen zu beteiligen (Bsp.: Linde und Hainbuche bei mRM auf einem K2 Standort).",
    "Fußnotenregelungen beachten, besonders bei Buche unter Klimastufe Tm und Tt."
  ],
  "fuss": "Die Hinweise stehen jederzeit in der Seitenleiste unter „Hinweise“.",
  "knopf": "Verstanden"
};
