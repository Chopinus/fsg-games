# FSG Spieleabend

Online-Spielehub für Freunde. Jeder spielt auf seinem eigenen iPad, Handy oder Laptop im Browser. Eine Anmeldung ist nicht nötig.

**Spiele:**

- **Letzte Karte** – Ablegespiel nach Uno-Regeln, 2–8 Spieler
- **Schach** – 2 Spieler, weitere schauen zu
- **Mensch ärgere dich nicht** – 2–4 Spieler
- **Vier gewinnt** – 2 Spieler, weitere schauen zu
- **Minispiel-Party** – 2–12 Spieler. Es kommen zufällige Minispiele à 1–2 Minuten hintereinander: Blitzreaktion, Kopfrechnen, Schätzfrage, Farbfalle, Merkfolge und Tipp-Rausch. Nach jedem Minispiel gibt es Punkte für die Platzierung (10, 7, 5, 4 …).

---

## So stellst du die Seite online (einmalig, ca. 15 Minuten)

Am einfachsten geht das an einem Computer. Auf dem iPad funktioniert es auch.

### Schritt 1: Dateien auf GitHub hochladen

1. Entpacke die ZIP-Datei. Auf dem iPad tippst du dazu in der Dateien-App einmal auf die ZIP.
2. Gehe auf **github.com** und erstelle ein kostenloses Konto.
3. Tippe oben rechts auf **+** und dann auf **New repository**.
   - Repository name: `fsg-spiele`
   - Wähle **Public**.
   - Tippe auf **Create repository**.
4. Tippe auf der nächsten Seite auf **uploading an existing file**.
5. Lade alle Dateien aus dem entpackten Ordner hoch. Das sind diese 11 Dateien:
   - `server.js`, `uno.js`, `schach.js`, `maedn.js`, `vier.js`, `party.js`
   - `index.html`, `app.js`, `style.css`
   - `package.json`, `README.md`
6. Tippe unten auf **Commit changes**.

### Schritt 2: Auf Render starten

1. Gehe auf **render.com** und tippe auf **Get Started**. Melde dich mit **GitHub** an.
2. Tippe auf **New +** und dann auf **Web Service**. Wähle dein Repository `fsg-spiele` aus.
3. Trage Folgendes ein:
   - **Name:** `fsg-spiele`. Das wird dein Link.
   - **Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. Tippe auf **Deploy Web Service** und warte, bis oben **Live** steht. Das dauert 2–3 Minuten.

Dein Link lautet dann **https://fsg-spiele.onrender.com**

Ist der Name schon vergeben, hängt Render ein paar Zeichen an. Du kannst dann einen anderen Namen wählen, zum Beispiel `fsg-spieleabend` oder `fsg-games`.

---

## Gut zu wissen

- **Erster Aufruf dauert etwa 1 Minute.** Die kostenlose Version schläft nach 15 Minuten ohne Besucher ein. Öffne den Link kurz vor dem Spieleabend, dann ist sie wach, wenn alle kommen.
- **Laufende Spiele gehen verloren,** wenn der Server einschläft oder neu startet. Für einen Spieleabend reicht das.
- **Wie eine App aufs iPad legen:** Öffne den Link in Safari, tippe auf **Teilen** und dann auf **Zum Home-Bildschirm**.
- **Änderungen:** Wenn du eine Datei auf GitHub änderst, aktualisiert Render die Seite automatisch.
- **Verbindung kurz weg:** Lädt jemand die Seite neu oder verliert kurz das WLAN, kommt er automatisch zurück auf seinen Platz.
- **Hängt jemand fest:** Wer eine Runde erstellt hat (★), kann bei Letzte Karte einen Spieler überspringen und bei der Party ein Minispiel überspringen.
