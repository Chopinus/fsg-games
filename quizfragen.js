// Fragen für das Klassen-Quiz. Format pro Zeile: Frage | richtige Antwort | falsch | falsch | falsch
const RAW = {
  'Allgemeinwissen': `
Wie viele Tage hat ein Schaltjahr? | 366 | 365 | 364 | 367
Wie viele Minuten hat ein Tag? | 1440 | 1240 | 1600 | 960
Welche Farbe entsteht, wenn man Blau und Gelb mischt? | Grün | Lila | Orange | Braun
Wie viele Spieler stehen bei einer Fußballmannschaft auf dem Feld? | 11 | 10 | 12 | 9
Wie heißt die Hauptstadt von Deutschland? | Berlin | Bonn | München | Hamburg
Wie viele Kontinente gibt es? | 7 | 5 | 6 | 8
Welches Tier ist das Wappentier von Deutschland? | Adler | Löwe | Bär | Falke
Wie viele Ecken hat ein Würfel? | 8 | 6 | 12 | 4
Wie viele Stunden hat eine Woche? | 168 | 144 | 172 | 186
Was misst ein Thermometer? | Temperatur | Luftdruck | Feuchtigkeit | Windstärke
Wie viele Zähne hat ein erwachsener Mensch normalerweise? | 32 | 28 | 30 | 36
Welcher Monat hat die wenigsten Tage? | Februar | April | Juni | November
Wie nennt man ein Wort, das vorwärts und rückwärts gleich gelesen wird? | Palindrom | Anagramm | Synonym | Homonym
Wie viele Felder hat ein Schachbrett? | 64 | 81 | 49 | 100
Welche Blutgruppe gilt als Universalspender? | 0 negativ | AB positiv | A positiv | B negativ
Wie viele Saiten hat eine normale Gitarre? | 6 | 4 | 5 | 8
Welche Farbe hat ein Smaragd? | Grün | Rot | Blau | Gelb
Wie heißt der längste Fluss Deutschlands (auf deutschem Gebiet)? | Rhein | Elbe | Donau | Weser
Was ist die Hälfte von einem Viertel? | Ein Achtel | Ein Sechstel | Ein Drittel | Ein Zwölftel
Wie viele Bundesländer hat Deutschland? | 16 | 14 | 15 | 18`,
  'Geografie': `
Welches ist das größte Land der Welt? | Russland | Kanada | China | USA
Wie heißt die Hauptstadt von Frankreich? | Paris | Lyon | Marseille | Nizza
Auf welchem Kontinent liegt Ägypten? | Afrika | Asien | Europa | Australien
Welcher ist der höchste Berg der Welt? | Mount Everest | K2 | Kilimandscharo | Mont Blanc
Welches ist der größte Ozean? | Pazifik | Atlantik | Indischer Ozean | Arktischer Ozean
Wie heißt die Hauptstadt von Italien? | Rom | Mailand | Venedig | Neapel
In welchem Land steht der Eiffelturm? | Frankreich | Belgien | Italien | Spanien
Wie heißt die Hauptstadt von Spanien? | Madrid | Barcelona | Sevilla | Valencia
Welcher ist der höchste Berg Deutschlands? | Zugspitze | Watzmann | Brocken | Feldberg
Welcher Fluss fließt durch Wien? | Donau | Rhein | Elbe | Inn
Welches Land hat die meisten Einwohner? | Indien | China | USA | Indonesien
Wie heißt die Hauptstadt von Österreich? | Wien | Salzburg | Graz | Innsbruck
Welche Wüste ist die größte heiße Wüste der Erde? | Sahara | Gobi | Kalahari | Atacama
Wie heißt die Hauptstadt von Japan? | Tokio | Osaka | Kyoto | Peking
An welches Meer grenzt Deutschland im Norden? | Nordsee und Ostsee | Mittelmeer | Schwarzes Meer | Atlantik und Mittelmeer
Wie heißt die Hauptstadt der Schweiz? | Bern | Zürich | Genf | Basel
Welcher ist der längste Fluss der Welt? | Nil | Amazonas | Jangtse | Mississippi
In welchem Land liegt Machu Picchu? | Peru | Mexiko | Chile | Brasilien
Wie heißt die Hauptstadt von Australien? | Canberra | Sydney | Melbourne | Perth
Welches Bundesland ist das flächenmäßig größte? | Bayern | Niedersachsen | Baden-Württemberg | Nordrhein-Westfalen
Wie heißt die Hauptstadt von Kanada? | Ottawa | Toronto | Vancouver | Montreal
Welches Land hat die Form eines Stiefels? | Italien | Griechenland | Portugal | Kroatien`,
  'Geschichte': `
In welchem Jahr fiel die Berliner Mauer? | 1989 | 1990 | 1987 | 1991
Wer war der erste Mensch auf dem Mond? | Neil Armstrong | Buzz Aldrin | Juri Gagarin | Michael Collins
In welchem Jahr wurde Deutschland wiedervereinigt? | 1990 | 1989 | 1992 | 1985
Wer erfand den Buchdruck mit beweglichen Lettern in Europa? | Johannes Gutenberg | Martin Luther | Leonardo da Vinci | Isaac Newton
In welchem Jahr entdeckte Kolumbus Amerika? | 1492 | 1512 | 1453 | 1498
Wie hieß der erste Bundeskanzler der Bundesrepublik? | Konrad Adenauer | Willy Brandt | Helmut Kohl | Ludwig Erhard
Welche Stadt war früher die Hauptstadt der Bundesrepublik? | Bonn | Frankfurt | Köln | Berlin
In welchem Jahr begann der Erste Weltkrieg? | 1914 | 1918 | 1939 | 1905
In welchem Jahr endete der Zweite Weltkrieg in Europa? | 1945 | 1944 | 1946 | 1939
Wer schlug 1517 seine Thesen an? | Martin Luther | Johannes Calvin | Karl der Große | Thomas Müntzer
Welches Volk baute die Pyramiden von Gizeh? | Die alten Ägypter | Die Römer | Die Griechen | Die Maya
Wie hieß der berühmte Feldherr, der mit Elefanten über die Alpen zog? | Hannibal | Caesar | Alexander | Attila
In welchem Land fanden die ersten Olympischen Spiele der Antike statt? | Griechenland | Italien | Ägypten | Türkei
Wer war Kleopatra? | Eine ägyptische Königin | Eine römische Kaiserin | Eine griechische Göttin | Eine persische Prinzessin
Wann wurde der Euro als Bargeld eingeführt? | 2002 | 1999 | 2000 | 2005
Welcher römische Herrscher wurde an den Iden des März ermordet? | Julius Caesar | Nero | Augustus | Konstantin
Wie hieß das Schiff, das 1912 nach einer Kollision mit einem Eisberg sank? | Titanic | Lusitania | Britannic | Bismarck
Wer malte die Mona Lisa? | Leonardo da Vinci | Michelangelo | Raffael | Rembrandt`,
  'Natur & Technik': `
Wie viele Planeten hat unser Sonnensystem? | 8 | 9 | 7 | 10
Welcher Planet ist der Sonne am nächsten? | Merkur | Venus | Mars | Erde
Welches Gas atmen Pflanzen bei der Fotosynthese ein? | Kohlendioxid | Sauerstoff | Stickstoff | Helium
Was ist H₂O? | Wasser | Wasserstoff | Salz | Sauerstoff
Welcher ist der größte Planet unseres Sonnensystems? | Jupiter | Saturn | Neptun | Uranus
Bei wie viel Grad Celsius kocht Wasser auf Meereshöhe? | 100 | 90 | 120 | 80
Welches Organ pumpt das Blut durch den Körper? | Herz | Lunge | Leber | Niere
Wie viele Knochen hat ein erwachsener Mensch ungefähr? | 206 | 150 | 312 | 180
Was ist das chemische Symbol für Gold? | Au | Go | Gd | Ag
Welcher Planet wird der rote Planet genannt? | Mars | Venus | Jupiter | Merkur
Was ist das härteste natürliche Material? | Diamant | Granit | Stahl | Quarz
Wie schnell ist Licht ungefähr? | 300.000 km pro Sekunde | 30.000 km pro Sekunde | 3.000 km pro Sekunde | 3 Mio. km pro Sekunde
Welches ist das größte Organ des Menschen? | Haut | Leber | Lunge | Gehirn
Wofür steht die Abkürzung WLAN? | Wireless Local Area Network | World Line Access Network | Wide Link Area Node | Web Local Access Number
Welches Metall ist bei Raumtemperatur flüssig? | Quecksilber | Blei | Zinn | Aluminium
Wie nennt man ein Tier, das nur Pflanzen frisst? | Pflanzenfresser | Allesfresser | Fleischfresser | Aasfresser
Was ist das chemische Symbol für Sauerstoff? | O | S | Ox | Sa
Woraus besteht die Sonne hauptsächlich? | Wasserstoff und Helium | Sauerstoff und Stickstoff | Eisen | Kohlenstoff
Welcher Teil der Pflanze nimmt Wasser aus dem Boden auf? | Wurzel | Blatt | Blüte | Stängel
Wer entwickelte die Relativitätstheorie? | Albert Einstein | Isaac Newton | Nikola Tesla | Galileo Galilei`,
  'Mathe': `
Was ist 7 × 8? | 56 | 54 | 64 | 48
Was ist die Wurzel aus 144? | 12 | 14 | 11 | 16
Wie viele Grad hat ein rechter Winkel? | 90 | 180 | 45 | 360
Was ist 15 % von 200? | 30 | 15 | 20 | 35
Wie viele Seiten hat ein Sechseck? | 6 | 5 | 8 | 7
Was ist 2 hoch 10? | 1024 | 512 | 2048 | 1000
Wie groß ist die Winkelsumme im Dreieck? | 180 Grad | 360 Grad | 90 Grad | 270 Grad
Was ist 1/4 als Dezimalzahl? | 0,25 | 0,4 | 0,14 | 0,5
Welche Zahl ist eine Primzahl? | 13 | 15 | 21 | 27
Was ist 12 × 12? | 144 | 124 | 142 | 132
Wie viele Zentimeter hat ein Meter? | 100 | 1000 | 10 | 50
Was ist der Umfang eines Quadrats mit Seitenlänge 5? | 20 | 25 | 10 | 15
Was ist 999 + 1? | 1000 | 9910 | 1001 | 990
Wie viele Sekunden hat eine Stunde? | 3600 | 360 | 6000 | 1200
Was ist 100 geteilt durch 4? | 25 | 20 | 40 | 24
Was kommt als Nächstes: 2, 4, 8, 16, …? | 32 | 24 | 20 | 18
Was ist die Fläche eines Rechtecks mit 4 cm und 6 cm? | 24 cm² | 20 cm² | 10 cm² | 26 cm²
Wie lautet die römische Zahl für 50? | L | C | X | D
Was ist 3³ (drei hoch drei)? | 27 | 9 | 18 | 81
Was ist 0,5 × 0,5? | 0,25 | 1 | 0,5 | 2,5`,
  'Sport': `
Wie viele Ringe hat das olympische Symbol? | 5 | 4 | 6 | 7
Wie lang ist ein Marathon ungefähr? | 42 km | 21 km | 50 km | 35 km
In welcher Sportart gibt es einen Slam Dunk? | Basketball | Volleyball | Handball | Tennis
Wie viele Punkte zählt ein Korb von außerhalb der Dreierlinie? | 3 | 2 | 4 | 1
Wie heißt das Spielgerät beim Badminton? | Federball | Puck | Shuttle-Ball | Ballon
Wie lange dauert ein normales Fußballspiel ohne Verlängerung? | 90 Minuten | 80 Minuten | 100 Minuten | 60 Minuten
In welcher Sportart gibt es den Begriff „Love“ für null Punkte? | Tennis | Golf | Badminton | Cricket
Wie viele Spieler hat eine Volleyballmannschaft auf dem Feld? | 6 | 5 | 7 | 8
Welches Land richtete die Fußball-WM 2014 aus? | Brasilien | Deutschland | Russland | Südafrika
Wie nennt man beim Golf einen Schlag unter Par? | Birdie | Bogey | Eagle-Eye | Ace-Shot
Wie viele Disziplinen hat ein Zehnkampf? | 10 | 7 | 8 | 12
Mit welchem Gerät spielt man Eishockey? | Puck | Ball | Kugel | Ring
Welche Sportart verbindet Schwimmen, Radfahren und Laufen? | Triathlon | Biathlon | Pentathlon | Duathlon`,
  'Filme, Serien & Musik': `
Wie heißt der Zauberschüler mit der Blitznarbe? | Harry Potter | Ron Weasley | Frodo Beutlin | Percy Jackson
Wie heißt der Schneemann aus „Die Eiskönigin“? | Olaf | Sven | Kristoff | Hans
Welcher Superheld kommt vom Planeten Krypton? | Superman | Batman | Spider-Man | Iron Man
In welcher Stadt lebt Batman? | Gotham City | Metropolis | New York | Star City
Wie heißt der Löwe in „Der König der Löwen“, der König wird? | Simba | Mufasa | Scar | Nala
Wie viele Saiten hat eine Geige? | 4 | 5 | 6 | 3
Welches Instrument hat schwarze und weiße Tasten? | Klavier | Harfe | Trompete | Schlagzeug
Wer ist der beste Freund von SpongeBob? | Patrick | Thaddäus | Mr. Krabs | Plankton
Wie heißt der grüne Oger aus dem gleichnamigen Film? | Shrek | Fiona | Esel | Grinch
Was ist Darth Vaders Verhältnis zu Luke Skywalker? | Vater | Onkel | Bruder | Lehrer
Wie heißt die Schule in Harry Potter? | Hogwarts | Durmstrang | Beauxbatons | Ilvermorny
Welche Farbe haben die Minions? | Gelb | Grün | Blau | Orange
Wie heißt der Fisch, den sein Vater in „Findet Nemo“ sucht? | Nemo | Dorie | Marlin | Bruce
Wie viele Musiker hat ein Quartett? | 4 | 3 | 5 | 6
Wie heißt der Spielzeug-Cowboy in „Toy Story“? | Woody | Buzz | Rex | Jessie`,
  'Tiere': `
Welches ist das größte Tier der Welt? | Blauwal | Elefant | Giraffe | Pottwal
Wie viele Beine hat eine Spinne? | 8 | 6 | 10 | 12
Welches Tier ist das schnellste an Land? | Gepard | Löwe | Pferd | Antilope
Was frisst ein Panda hauptsächlich? | Bambus | Fisch | Beeren | Gras
Wie nennt man ein junges Pferd? | Fohlen | Kalb | Lamm | Ferkel
Welcher Vogel kann nicht fliegen? | Pinguin | Möwe | Taube | Spatz
Wie viele Herzen hat ein Tintenfisch (Krake)? | 3 | 1 | 2 | 4
Welches Säugetier kann fliegen? | Fledermaus | Flughörnchen | Pinguin | Strauß
Wo speichert ein Kamel Fett? | Im Höcker | In den Beinen | Im Schwanz | Im Hals
Wie heißt das männliche Huhn? | Hahn | Henne | Küken | Kapaun
Welches Tier hält Winterschlaf? | Igel | Fuchs | Reh | Wildschwein
Wie viele Beine hat ein Insekt? | 6 | 8 | 4 | 10
Welches Tier hat den längsten Hals? | Giraffe | Strauß | Kamel | Lama
Welches Tier ist ein Reptil? | Krokodil | Frosch | Delfin | Salamander
Wovon ernähren sich Koalas? | Eukalyptusblättern | Bambus | Insekten | Gras`,
  'Gaming & Internet': `
Wie heißt der Klempner mit der roten Mütze von Nintendo? | Mario | Luigi | Wario | Toad
Aus welchem Material sind die meisten Dinge in Minecraft? | Blöcken | Kugeln | Pixeln | Dreiecken
Wie heißt das grüne explodierende Monster in Minecraft? | Creeper | Zombie | Enderman | Skelett
Welches Pokémon ist gelb und elektrisch und sehr bekannt? | Pikachu | Glumanda | Schiggy | Bisasam
Wofür steht „www“? | World Wide Web | Wide World Web | World Web Wide | Web World Wide
Wie heißt die Prinzessin, die Mario oft rettet? | Peach | Zelda | Daisy | Rosalina
Wie heißt der Held in „The Legend of Zelda“? | Link | Zelda | Ganon | Epona
Welche Firma stellt die PlayStation her? | Sony | Microsoft | Nintendo | Sega
Welches Spiel hat den Modus „Battle Royale“ mit Bauen berühmt gemacht? | Fortnite | Tetris | Minecraft | FIFA
Was bedeutet „GG“ am Ende eines Spiels? | Good Game | Go Go | Great Goal | Get Going
Wie heißt der blaue schnelle Igel von Sega? | Sonic | Tails | Knuckles | Shadow
Wie viele Blöcke bilden einen Tetris-Stein? | 4 | 3 | 5 | 6
Wofür steht die Abkürzung „PC“? | Personal Computer | Public Computer | Power Control | Program Center
Welches Tier ist das Maskottchen von Linux? | Pinguin | Fuchs | Eule | Elefant`,
  'Sprache': `
Was ist der Plural von „Atlas“? | Atlanten | Atlasse | Atlase | Atlässe
Welches Wort ist ein Verb? | laufen | schnell | Haus | grün
Was ist das Gegenteil von „mutig“? | feige | stark | laut | klug
Wie viele Buchstaben hat das deutsche Alphabet (ohne Umlaute und ß)? | 26 | 24 | 28 | 30
Was ist ein Synonym für „schnell“? | rasch | langsam | groß | leise
Was heißt „Hund“ auf Englisch? | dog | cat | house | bird
Welcher Artikel gehört zu „Butter“? | die | der | das | den
Was ist „Danke“ auf Französisch? | Merci | Gracias | Grazie | Thanks
Was heißt „Guten Morgen“ auf Spanisch? | Buenos días | Bonjour | Buongiorno | Good morning
Wie nennt man ein Wort für eine Tätigkeit? | Verb | Nomen | Adjektiv | Artikel
Was ist die Mehrzahl von „Kaktus“? | Kakteen | Kaktusse | Kaktusen | Kaktüsse
Welche Sprache spricht man in Brasilien hauptsächlich? | Portugiesisch | Spanisch | Brasilianisch | Englisch
Was bedeutet das englische Wort „library“? | Bibliothek | Labor | Buchhandlung | Freiheit
Wie heißt die Vergangenheitsform von „ich gehe“? | ich ging | ich gehte | ich gang | ich gegangen`,
};
const CATS = {};
for (const [cat, txt] of Object.entries(RAW)) CATS[cat] = txt.trim().split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a.length === 5).map(([q, ...a]) => ({ q, a, cat }));
module.exports = { CATS };
