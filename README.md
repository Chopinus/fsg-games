# FSG Spieleabend

Online-Spielehub für Freunde. Jeder spielt auf seinem eigenen iPad, Handy oder Laptop im Browser. Eine Anmeldung ist nicht nötig.

**Spiele:**

- **Letzte Karte** – Ablegespiel nach Uno-Regeln, 2–8 Spieler
- **Schach** – 2 Spieler, weitere schauen zu
- **Mensch ärgere dich nicht** – 2–4 Spieler
- **Vier gewinnt** – 2 Spieler, weitere schauen zu
- **Montagsmaler** – 2–12 Spieler. Einer zeichnet mit dem Finger, alle anderen tippen ihren Tipp ein. Wer schneller rät, bekommt mehr Punkte.
- **Stadt-Land-Fluss** – 2–12 Spieler. 5 Runden mit je einem Buchstaben und 7 Kategorien. Wer alles ausgefüllt hat, ruft STOPP. Danach prüft ihr gemeinsam die Antworten und streicht ungültige.
- **Wer ist der Spion?** – 3–12 Spieler. Alle kennen das geheime Wort, nur der Spion nicht. Reihum gibt jeder einen Hinweis, dann stimmt ihr ab, wer der Spion ist.
- **Kniffel** – 1–6 Spieler. Klassisches Würfelspiel mit 13 Feldern.
- **Minispiel-Party** – 2–12 Spieler. Zufällige Action-Minispiele à 35–45 Sekunden: Ballon-Pumpe (im Takt tippen), Turbo-Rennen (Gas geben und richtig schalten), Pong-Mauer, Raketenflug und Stapelturm. Nach jedem Minispiel gibt es Punkte für die Platzierung (10, 7, 5, 4 …).
- **Ritterlauf (Solo)** – Deine Heldengruppe kämpft sich von allein durch 150 Stufen. Sechs Klassen (Ritter, Wächter, Schützin, Magier, Priesterin, Tierbändiger) mit je eigenem Fertigkeitenbaum. Jede Wiedergeburt schaltet etwas Neues frei: neue Klassen, mehr Stufen, mehr Schlüssel-Fertigkeiten, Runen, Runenschmiede und Turm-Modus. Nach der 9. Wiedergeburt und Stufe 150 folgt der Aufstieg (Kronen, Kronen-Laden, endlose Albtraum-Stufen, Begleiter wie Drache, Eule, Golem und Phönix). Dazu kommen 29 Erfolge, eine wöchentliche Herausforderung mit wechselnden Regeln und eine gemeinsame Bestenliste. Spielstand per Name und Passwort.

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
5. Lade alle Dateien aus dem entpackten Ordner hoch. Das sind diese 19 Dateien:
   - `server.js`, `uno.js`, `schach.js`, `maedn.js`, `vier.js`, `party.js`
   - `maler.js`, `slf.js`, `spion.js`, `kniffel.js`
   - `index.html`, `app.js`, `spiele2.js`, `style.css`, `mini.js`, `ritter.js`
   - `konten.js`, `package.json`, `README.md`
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

## Spielstände dauerhaft speichern (für Ritterlauf, einmalig ca. 10 Minuten)

Im Ritterlauf legt man einen Spielstand mit eigenem Namen und Passwort an. Damit diese Spielstände nicht verloren gehen, wenn Render einschläft, speichert der Server sie in einem privaten GitHub-Projekt. Dafür braucht er einen Schlüssel.

**1. Privates Projekt für die Spielstände anlegen**

1. Tippe auf GitHub oben rechts auf **+** und dann auf **New repository**.
2. Repository name: `fsg-spielstaende`
3. Wähle **Private**.
4. Setze den Haken bei **Add a README file**.
5. Tippe auf **Create repository**.

**2. Schlüssel erstellen**

1. Öffne **github.com/settings/personal-access-tokens/new**. Alternativ: Profilbild → **Settings** → ganz unten **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Token name: `fsg-speicher`
3. Expiration: Wähle die längste Dauer, die angeboten wird. Wenn der Schlüssel abläuft, erstellst du einfach einen neuen.
4. Repository access: Wähle **Only select repositories** und dann **fsg-spielstaende**.
5. Bei **Permissions** → **Repository permissions** stellst du **Contents** auf **Read and write**.
6. Tippe unten auf **Generate token** und **kopiere den Schlüssel sofort**. Er beginnt mit `github_pat_` und wird nur einmal angezeigt.

**3. Schlüssel bei Render eintragen**

1. Öffne bei Render deinen Dienst und tippe links auf **Environment**.
2. Tippe auf **Add Environment Variable** und trage zwei Einträge ein:
   - `GITHUB_TOKEN` = der kopierte Schlüssel
   - `SAVE_REPO` = `DeinBenutzername/fsg-spielstaende` (zum Beispiel `Chopinus/fsg-spielstaende`)
3. Tippe auf **Save, rebuild, and deploy**.

**4. Prüfen**

Öffne im Ritterlauf den Reiter **Spielstand**. Ist der rote Hinweis „noch nicht für dauerhaftes Speichern eingerichtet“ verschwunden, hat alles geklappt.

Passwörter werden nicht im Klartext gespeichert, sondern nur als verschlüsselter Fingerabdruck. Den Schlüssel aus Schritt 2 gibst du niemandem weiter.

## Update einspielen

Wenn du eine neue Version der ZIP bekommst:

1. Öffne dein Projekt auf GitHub und tippe auf **Add file → Upload files**.
2. Lade alle Dateien aus der neuen ZIP hoch. Gleichnamige Dateien werden dabei ersetzt.
3. Tippe auf **Commit changes**.

Render startet die Seite danach automatisch neu. Das dauert 2–3 Minuten.

## Gut zu wissen

- **Erster Aufruf dauert etwa 1 Minute.** Die kostenlose Version schläft nach 15 Minuten ohne Besucher ein. Öffne den Link kurz vor dem Spieleabend, dann ist sie wach, wenn alle kommen.
- **Laufende Spiele gehen verloren,** wenn der Server einschläft oder neu startet. Für einen Spieleabend reicht das.
- **Ritterlauf** speichert auf dem Gerät automatisch. Mit dem Passwort aus dem Reiter „Spielstand“ holst du deinen Fortschritt auf jedes andere Gerät.
- **Wie eine App aufs iPad legen:** Öffne den Link in Safari, tippe auf **Teilen** und dann auf **Zum Home-Bildschirm**.
- **Änderungen:** Wenn du eine Datei auf GitHub änderst, aktualisiert Render die Seite automatisch.
- **Verbindung kurz weg:** Lädt jemand die Seite neu oder verliert kurz das WLAN, kommt er automatisch zurück auf seinen Platz.
- **Hängt jemand fest:** Wer eine Runde erstellt hat (★), kann bei Letzte Karte einen Spieler überspringen und bei der Party ein Minispiel überspringen.
