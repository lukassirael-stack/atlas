/* =========================================================================
   Atlas energetických míst — překladová vrstva CS → EN  (Fáze 1)
   -------------------------------------------------------------------------
   Princip: čeština v HTML zůstává „zdrojem pravdy". Když je zvolena angličtina,
   projde se DOM a texty se podle slovníku přeloží. MutationObserver zachytí
   i obsah vkládaný JavaScriptem (karty míst, toasty, komentáře, puls…).

   Bezpečnost: překládá se VÝHRADNĚ to, co má přesný klíč ve slovníku.
   Co ve slovníku není, zůstane beze změny — vrstva tedy nemůže nic „rozbít".

   Přepínač jazyka je vpravo v hlavičce. Volba se pamatuje (localStorage),
   přepnutí je okamžité, bez reloadu. Značka a doména se nemění — jazyk a brand
   jsou dvě nezávislé osy (viz plán: doména nese brand, přepínač nese jazyk).
   ========================================================================= */
(function () {
  'use strict';

  /* ---- slovník: normalizovaný český text → anglický ---------------------- */
  const EN = {

    /* — navigace, hlavička, patička — */
    'Mapa': 'Map',
    'Objevuj': 'Discover',
    'Komentář napíšeš odkudkoli': 'A comment can be written from anywhere',
    'Deník': 'Journal',
    'Přidat místo': 'Add a place',
    'O projektu': 'About',
    'Komunita': 'Community',
    'Přihlásit': 'Sign in',
    'Přihlásit se': 'Sign in',
    'Odhlásit se': 'Sign out',
    'Můj účet': 'My account',
    'Hlavní navigace': 'Main navigation',
    'Mobilní navigace': 'Mobile navigation',
    'Menu': 'Menu',
    'Zavřít': 'Close',
    'Zavřít výběr': 'Close selection',
    'Atlas energetických míst': 'Atlas of Energetic Places',
    'Interaktivní mapa energetických míst': 'Interactive map of energetic places',
    'Hlavní filtr míst': 'Main place filter',
    'Vzkazy od správce': 'Messages from the keeper',
    'Vzkazy od správce ': 'Messages from the keeper',
    'Zatím žádné vzkazy 🌿': 'No messages yet 🌿',
    'Objevuj. Prožívej. Sdílej.': 'Discover. Experience. Share.',
    '© 2026 Oáza Adamanthea ·': '© 2026 Oáza Adamanthea ·',
    'Podmínky užití': 'Terms of use',

    /* — tituly stránek + meta popis — */
    'Atlas energetických míst — živá mapa posvátných míst': 'Atlas of Energetic Places — a living map of sacred places',
    'O projektu — Atlas energetických míst': 'About — Atlas of Energetic Places',
    'Všechna místa — Atlas energetických míst': 'All places — Atlas of Energetic Places',
    'Můj deník — Atlas energetických míst': 'My journal — Atlas of Energetic Places',
    'Podmínky užití — Atlas energetických míst': 'Terms of use — Atlas of Energetic Places',
    'Živá mapa posvátných a energetických míst České republiky. Prameny, megality, portály a tiché brány. Objevuj, prožívej, sdílej.':
      'A living map of the sacred and energetic places of the Czech Republic. Springs, megaliths, portals and quiet gateways. Discover, experience, share.',
    'Atlas energetických míst je živá paměť krajiny. Místo do něj zaneseš jen tehdy, když u něj skutečně stojíš.':
      'The Atlas of Energetic Places is the living memory of the land. You add a place only when you truly stand beside it.',

    /* — hero (úvod) — */
    'Jsou místa,': 'There are places',
    'která promlouvají.': 'that speak to you.',
    'Prameny, stavby, portály a tiché brány. Prozkoumej tajemná místa naší země.':
      'Springs, structures, portals and quiet gateways. Explore the mysterious places of our land.',
    'Otevřít mapu': 'Open the map',
    'Překvapit mě': 'Surprise me',
    'Naladění': 'Attune',
    'Jaké místo tě přitahuje?': 'What kind of place draws you?',
    'Typ zážitku': 'Type of experience',
    'Vyber jeden nebo víc štítků': 'Choose one or more tags',
    'Vymazat výběr': 'Clear selection',
    'Zobrazit místa': 'Show places',

    /* — DNA osy (jednotlivá slova; použité i v atlasRys) — */
    'Klid': 'Calm',
    'Energie': 'Energy',
    'Mystika': 'Mystery',
    'Krása': 'Beauty',
    'Léčivost': 'Healing',

    /* — štítky: názvy (musí odpovídat ATLAS_STITKY v data.js) — */
    'Klid a regenerace': 'Calm & renewal',
    'Síla a energie': 'Strength & energy',
    'Místo srdce': 'Place of the heart',
    'Léčivá místa': 'Healing places',
    'Léčivé prameny': 'Healing springs',
    'Posvátné stromy': 'Sacred trees',
    'Megality a posvátné skály': 'Megaliths & sacred rocks',
    'Hory a posvátné vrcholy': 'Mountains & sacred peaks',
    'Pyramidy a mohyly': 'Pyramids & burial mounds',
    'Meditační místa': 'Places for meditation',
    'Portály': 'Portals',
    'Magická a rituální místa': 'Magical & ritual places',
    'Historická a posvátná místa': 'Historic & sacred places',
    'Pohanská a keltská místa': 'Pagan & Celtic places',
    'Kontaktní místa': 'Places of contact',
    'Stínová místa': 'Shadow places',
    'Výhledy a krajinné scenérie': 'Views & landscape scenery',
    'Anomálie a záhady': 'Anomalies & mysteries',

    /* — štítky: popisky v panelu kategorií — */
    'Místa hlubokého odpočinku, ztišení a obnovy.': 'Places of deep rest, stillness and renewal.',
    'Místa vitality, motivace a životní energie.': 'Places of vitality, drive and life force.',
    'Výjimečně krásná místa pro radost, vděčnost a dojetí.': 'Exceptionally beautiful places for joy, gratitude and being moved.',
    'Lokality spojované s uzdravením těla, mysli nebo duše.': 'Sites associated with healing of body, mind or soul.',
    'Posvátné vody, studánky, minerální prameny a místa očisty.': 'Sacred waters, wells, mineral springs and places of cleansing.',
    'Významné stromy, aleje a lesy s jedinečnou atmosférou.': 'Notable trees, avenues and forests with a singular atmosphere.',
    'Menhiry, kamenné kruhy, balvany a skalní útvary.': 'Menhirs, stone circles, boulders and rock formations.',
    'Kopce, hory a vrcholy, kde se země dotýká nebe.': 'Hills, mountains and peaks where the earth touches the sky.',
    'Dávné navršené stavby — mohyly, valy a pyramidální útvary.': 'Ancient raised structures — mounds, ramparts and pyramidal forms.',
    'Lokality pro meditaci, kontemplaci a vědomou práci se sebou.': 'Sites for meditation, contemplation and conscious inner work.',
    'Místa vnímaná jako brány nebo silné přechodové body.': 'Places felt as gateways or strong points of passage.',
    'Lokality spojené s obřady, legendami a magickou tradicí.': 'Sites tied to ceremonies, legends and magical tradition.',
    'Hrady, kaple, kláštery a stavby s výrazným duchem místa.': 'Castles, chapels, monasteries and buildings with a strong spirit of place.',
    'Svatyně, oppida, pohřebiště a předkřesťanské tradice.': 'Sanctuaries, oppida, burial grounds and pre-Christian traditions.',
    'Místa, kde lidé popisují silnou intuici či neobvyklé zážitky.': 'Places where people report strong intuition or unusual experiences.',
    'Lokality s tíživou atmosférou, historií a potřebou proměny.': 'Sites with a heavy atmosphere, a history and a need for transformation.',
    'Místa s mimořádnou krásou a dalekými výhledy.': 'Places of extraordinary beauty and far-reaching views.',
    'Lokality s nevysvětlenými jevy a neobvyklými fenomény.': 'Sites with unexplained events and unusual phenomena.',

    /* — mapa — */
    'Živá mapa posvátné krajiny': 'A living map of the sacred landscape',
    'Vyber místo na mapě': 'Choose a place on the map',
    'Klepni na značku a zobrazí se ti detail místa.': 'Tap a marker to see the place in detail.',
    'Zobrazit detail': 'View detail',

    /* — sekce Objevuj (na úvodní straně) — */
    'Objevuj po svém': 'Discover your own way',
    'Kam tě to vede?': 'Where does it lead you?',
    'Energetické filtry': 'Energetic filters',
    'Doporučená místa': 'Recommended places',
    'Nejblíž mně': 'Nearest to me',
    'Nově přidaná': 'Recently added',
    'Nejlépe hodnocená': 'Highest rated',
    'Zobrazit všechna místa': 'Show all places',
    'Živý atlas': 'A living atlas',
    'Chybí ti tu tvoje místo?': 'Is your place missing here?',
    'Přidej ho do atlasu': 'Add it to the atlas',
    /* demo dlaždice */
    'Příroda · Jeseníky': 'Nature · Jeseníky',
    'Historie · Křivoklátsko': 'History · Křivoklátsko',
    'Voda · Vysočina': 'Water · Vysočina',
    'Energie 92 %': 'Energy 92 %',
    'Klid 94 %': 'Calm 94 %',
    'Léčivost 91 %': 'Healing 91 %',

    /* — manifest — */
    'Každé místo má svůj příběh': 'Every place has its story',
    'Objev jeho hloubku a poselství.': 'Discover its depth and its message.',

    /* — sekce „Přidat místo" (výhody) — */
    'Tvůj osobní atlas': 'Your personal atlas',
    'Živá mapa, kterou tvoří lidé': 'A living map made by people',
    'Staň se tvůrcem': 'Become a creator',
    'Přidej místo s fotkami, GPS souřadnicemi a příběhem. Správce ho před zveřejněním ověří.':
      'Add a place with photos, GPS coordinates and a story. The keeper verifies it before it goes public.',
    'Sbírej inspiraci': 'Gather inspiration',
    'Ukládej si místa, sleduj jejich příběh a skládej vlastní sbírky i trasy.':
      'Save places, follow their story and build your own collections and routes.',
    'Sdílej prožitek': 'Share the experience',
    'Napiš svou zkušenost, přidej fotky a pomoz utvářet DNA každého místa.':
      'Write your own experience, add photos and help shape the DNA of each place.',
    'Buď součástí': 'Be part of it',
    'Objevuj s komunitou poutníků, hledačů klidu, historie i přírodních krás.':
      'Discover with a community of pilgrims, seekers of calm, of history and of natural beauty.',

    /* — komunita / puls — */
    'Společná cesta': 'A shared journey',
    'Komunita poutníků': 'A community of pilgrims',
    'míst na mapě': 'places on the map',
    'místa na mapě': 'places on the map',
    'místo na mapě': 'place on the map',
    'zápisů z cest': 'entries from journeys',
    'Zápisy z cest': 'Entries from journeys',
    'poutníků': 'pilgrims',
    'Naslouchám pulsu Atlasu…': 'Listening to the pulse of the Atlas…',
    'Puls se teď nepodařilo nahmatat — zkus to prosím za chvíli.': 'The pulse couldn\u2019t be sensed right now — please try again in a moment.',

    /* — modal „Přidat místo" — */
    'Komunitní atlas': 'A community atlas',
    'Přidej energetické místo': 'Add an energetic place',
    'Místo zaneseš jen tehdy, když u něj stojíš — každý bod v atlasu tak někdo skutečně navštívil. Návrh před zveřejněním zkontroluje správce.':
      'You add a place only while standing beside it — so every point in the atlas has truly been visited by someone. The keeper reviews each submission before it goes public.',
    '1 · Poloha a fotka': '1 · Location & photo',
    '2 · Co to je': '2 · What it is',
    '3 · Příběh': '3 · The story',
    '4 · Tvé první naladění': '4 · Your first attunement',
    'nepovinné — můžeš dopsat později': 'optional — you can add this later',
    'nepovinné — utvoří DNA místa': 'optional — it forms the DNA of the place',
    'Načíst mou polohu': 'Get my location',
    'Poloha zatím nenačtena. Musíš stát přímo na místě.': 'Location not yet obtained. You have to be standing right at the spot.',
    'Přidej fotky místa': 'Add photos of the place',
    'Až šest fotek — první bude hlavní': 'Up to six photos — the first will be the main one',
    'Vyfotit': 'Take a photo',
    'Z galerie': 'From gallery',
    'Název místa': 'Name of the place',
    'Např. Studánka pod Javorem': 'e.g. The Well under the Maple',
    'Štítky místa': 'Place tags',
    'vyber až tři': 'choose up to three',
    'Popis místa': 'Description of the place',
    'Co to je, co tu uvidíš, kousek historie.': 'What it is, what you\u2019ll see, a bit of history.',
    'Kamenná studánka pod třemi břízami, obezděná v 19. století…': 'A stone well beneath three birches, walled in the 19th century…',
    'Jak se sem dostat': 'How to get here',
    'Odkud vyrazit, kde nechat auto, jak dlouho se jde.': 'Where to set off, where to leave the car, how long the walk is.',
    'Od kapličky po modré značce asi 20 minut, poslední úsek bez cesty…': 'From the shrine along the blue trail about 20 minutes, the last stretch off-path…',
    'Hloubka místa': 'The depth of the place',
    'Co se tu dá vnímat, jaká je atmosféra, jaké legendy se váží.': 'What can be felt here, what the atmosphere is like, what legends are attached.',
    'Zvláštní ticho — i vítr jako by se tu zastavil. Místní říkají…': 'A strange stillness — even the wind seems to pause here. Locals say…',
    'Práce s místem': 'Working with the place',
    'Meditace, rituál, tichý sed — jak k místu přistoupit.': 'Meditation, ritual, a quiet sit — how to approach the place.',
    'Posaď se zády ke třem břízám, tři nádechy do klidu…': 'Sit with your back to the three birches, three breaths into calm…',
    'Nejlepší čas': 'Best time',
    'Denní doba, roční období, počasí.': 'Time of day, season, weather.',
    'Např. za rozbřesku, nejlépe na podzim': 'e.g. at dawn, best in autumn',
    'Co tu právě prožíváš': 'What you\u2019re experiencing right now',
    'Stojíš na místě — vyplň a vznikne první zápis, který místu dá DNA hned od zrodu.':
      'You\u2019re standing at the spot — fill this in and the first entry is created, giving the place its DNA from birth.',
    'Stojím tady a cítím…': 'I\u2019m standing here and I feel…',
    'Odeslat ke schválení': 'Submit for approval',

    /* — stránka „O projektu" — */
    'Živá paměť krajiny.': 'The living memory of the land.',
    'Atlas není turistický seznam. Je to pokus zapsat místa, která se dosud předávala jen šeptem — a tiše mizela, protože je nikdo nezapsal.':
      'The Atlas isn\u2019t a tourist list. It\u2019s an attempt to record the places that until now were passed on only in whispers — and quietly vanished, because no one wrote them down.',
    'Proč vznikl': 'Why it exists',
    'Místa, která nesou víc než svou polohu': 'Places that carry more than their location',
    'Pramen, u kterého se dýchá jinak. Kámen, u kterého se myšlenky srovnají samy. Kaple, kde je ticho hustší než venku. Taková místa zná skoro každý — od souseda, od babičky, z jednoho odpoledne, na které se nedá zapomenout.':
      'A spring where you breathe differently. A stone beside which your thoughts settle on their own. A chapel where the silence is thicker than outside. Almost everyone knows a place like that — from a neighbour, from a grandmother, from one afternoon you can\u2019t forget.',
    'Většina z nich není nikde. Nemají značku, ceduli ani řádek v průvodci. Předávají se ústně, a s každou generací jich pár zmizí. Atlas je pokus je podržet.':
      'Most of them are nowhere. They have no marker, no sign, not a single line in a guidebook. They\u2019re passed on by word of mouth, and with each generation a few disappear. The Atlas is an attempt to hold on to them.',
    'Jediné pravidlo': 'The only rule',
    'Místo zaneseš jen tam, kde stojíš': 'You add a place only where you stand',
    'Nové místo nelze přidat od stolu. Telefon musí potvrdit, že u něj právě stojíš. Totéž platí pro zápis o návštěvě.':
      'A new place can\u2019t be added from your desk. Your phone has to confirm you\u2019re standing right there. The same goes for a visit entry.',
    'Zní to nepohodlně. Je to schválně. Díky tomu není Atlas databází míst, o kterých se někde něco psalo, ale záznamem míst, u kterých lidé skutečně byli. Za každým bodem na mapě stojí někdo, kdo tam došel.':
      'It sounds inconvenient. That\u2019s on purpose. Because of it, the Atlas isn\u2019t a database of places someone once wrote about somewhere, but a record of places people have truly been. Behind every point on the map is someone who walked there.',
    'Jak se místa popisují': 'How places are described',
    'DNA místa': 'The DNA of a place',
    'Místa tu nehodnotíme hvězdičkami. Studánka není čtyři a půl z pěti — místo není lepší nebo horší, má svůj charakter.':
      'We don\u2019t rate places with stars here. A well isn\u2019t four and a half out of five — a place isn\u2019t better or worse, it has its own character.',
    'Každý, kdo místo navštíví a zapíše, posune pět posuvníků:':
      'Everyone who visits a place and writes about it moves five sliders:',
    'Z průměru všech zápisů vzniká obrazec — DNA místa. Otisk, který se nedá vymyslet, protože ho kreslí zkušenost desítek lidí.':
      'The average of all entries forms a shape — the DNA of the place. An imprint that can\u2019t be made up, because it\u2019s drawn by the experience of dozens of people.',
    'Na jediný pohled tak poznáš, co ti místo může přinést. A jestli je to zrovna to, co dnes hledáš.':
      'At a single glance you can tell what a place may offer you. And whether it\u2019s just what you\u2019re looking for today.',
    'Dvojí způsob, jak přispět': 'Two ways to contribute',
    'Zápis a komentář': 'Entry and comment',
    'Zápis': 'Entry',
    'Komentář': 'Comment',
    'Vzniká přímo na místě. Je svědectvím — a jeho pěti osami se utváří DNA místa.':
      'Created on the spot. It\u2019s a testimony — and its five axes shape the DNA of the place.',
    'Napíšeš ho odkudkoli. Vzpomínku, upozornění na uzavřenou cestu, kus historie. Do DNA nevstupuje.':
      'You can write it from anywhere. A memory, a note about a closed trail, a piece of history. It doesn\u2019t enter the DNA.',
    'Obojí má cenu. Jen každé jinou.': 'Both have value. Just a different kind each.',
    'Kdo za tím stojí': 'Who\u2019s behind it',
    'Nikdo velký': 'No one big',
    'Atlas vzniká pod křídly': 'The Atlas grows under the wings of',
    'krystalového a retreatového centra v Halenkovicích na Moravě. Nestojí za ním firma ani investor.':
      'a crystal and retreat centre in Halenkovice, Moravia. There is no company or investor behind it.',
    'Vzniká proto, že nám tahle místa přijdou důležitá, a protože si myslíme, že si zaslouží, aby je našel i někdo další.':
      'It exists because these places matter to us, and because we believe they deserve to be found by someone else too.',
    'Krajina čeká': 'The land is waiting',
    'Znáš místo, které tu chybí?': 'Know a place that\u2019s missing here?',
    'Až u něj příště budeš stát, zanes ho. Zabere to chvíli — a zůstane to.':
      'Next time you\u2019re standing there, add it. It takes a moment — and it stays.',

    /* — stránka „Podmínky užití" — */
    'Atlas patří krajině a lidem, kteří ji prošli.': 'The Atlas belongs to the land and to the people who have walked it.',
    'Prohlížej, čerpej, nech se vést. Atlas tvoří mnoho lidí společně — a s láskou ti ho otevíráme. Tady jen v pár řádcích shrnujeme, jak s ním naložit s respektem.':
      'Browse it, draw from it, let it guide you. The Atlas is made by many people together — and we open it to you with love. Here, in just a few lines, is how to treat it with respect.',
    'Provozovatel': 'Operator',
    'Kdo za Atlasem stojí': 'Who runs the Atlas',
    'Atlas energetických míst provozuje Oáza Adamanthea, Halenkovice, IČO 76564410. Pro svolení, dotazy či námitky piš na':
      'The Atlas of Energetic Places is operated by Oáza Adamanthea, Halenkovice, Company ID 76564410. For permissions, questions or objections, write to',
    'Autorská práva': 'Copyright',
    'Obsah je chráněn': 'The content is protected',
    'Texty, grafika, podoba webu i jeho kód jsou autorským dílem — © Oáza Adamanthea, všechna práva vyhrazena. Zápisy z cest, komentáře a fotografie zůstávají dílem svých autorů; vložením do Atlasu dávají svolení k jejich zobrazení v rámci Atlasu, nic víc.':
      'The texts, graphics, the look of the site and its code are copyrighted work — © Oáza Adamanthea, all rights reserved. Journey entries, comments and photographs remain the work of their authors; by adding them to the Atlas they grant permission to display them within the Atlas, nothing more.',
    'Chceš-li cokoli z Atlasu použít jinde — na webu, v aplikaci, v tisku — napiš si prosím o svolení. Většinou se rádi domluvíme; jen tě poprosíme, abys to bez domluvy nešířil dál.':
      'If you\u2019d like to use anything from the Atlas elsewhere — on a website, in an app, in print — please ask us for permission. We\u2019re usually happy to agree; we just ask that you don\u2019t share it further without arranging it first.',
    'Databáze míst': 'The place database',
    'Databázi prosíme nevytěžuj': 'Please don\u2019t harvest the database',
    'Databáze míst, zápisů a hodnocení je chráněna zvláštním právem pořizovatele databáze (§ 88 a násl. autorského zákona). Prosíme proto, aby její obsah nikdo systematicky nevytěžoval — hromadné stahování, scraping či přebírání dat do jiných služeb, aplikací, datových sad nebo pro trénování modelů je možné jen s naším předchozím písemným souhlasem.':
      'The database of places, entries and ratings is protected by the sui generis database right (§ 88 et seq. of the Czech Copyright Act). We therefore ask that no one systematically extract its contents — bulk downloading, scraping or transferring data into other services, apps, datasets or for training models is possible only with our prior written consent.',
    'Běžné osobní užívání se tím nijak neomezuje: prohlížej, hledej, naviguj se, sdílej odkazy na místa. Od toho Atlas je.':
      'Ordinary personal use is not restricted in any way: browse, search, navigate, share links to places. That\u2019s what the Atlas is for.',
    'Fotografie': 'Photographs',
    'Fotky patří poutníkům': 'The photos belong to the pilgrims',
    'Fotografie u míst nahráli konkrétní lidé a zůstávají jejich. Prosíme, nesdílej je bez souhlasu autora — rádi ti ho pomůžeme získat přes kontakt výše.':
      'The photographs at each place were uploaded by particular people and remain theirs. Please don\u2019t share them without the author\u2019s consent — we\u2019ll gladly help you obtain it through the contact above.',
    'A to je vše': 'And that\u2019s all',
    'Choď, prožívej, zapisuj': 'Walk, experience, record',
    'Atlas je živý díky lidem, kteří místa navštěvují a píší o nich. A právě ta živá důvěra je jeho skutečným srdcem — to nedokáže nahradit žádná kopie, jen společná cesta.':
      'The Atlas is alive thanks to the people who visit places and write about them. And that living trust is its true heart — no copy can replace it, only a shared journey.',

    /* — stránka „Deník" — */
    'Jen pro tebe': 'For you alone',
    'Můj deník': 'My journal',
    'Tiché místo pro tvé vlastní zápisky. Co jsi cítil, kam se chceš vrátit, co ti místo řeklo. Vidíš to jen ty — nikam se to nesdílí.':
      'A quiet place for your own notes. What you felt, where you want to return, what a place told you. Only you can see it — it\u2019s never shared.',
    'Deník je jen tvůj': 'The journal is yours alone',
    'Přihlas se, aby si tě deník pamatoval a nikdo jiný do něj neviděl.':
      'Sign in so the journal remembers you and no one else can see it.',
    'Nadpis': 'Title',
    'nepovinné': 'optional',
    'Nadpis — nepovinné': 'Title — optional',
    'Např. Úplněk u studánky': 'e.g. Full moon by the well',
    'Napiš, co máš na srdci…': 'Write what\u2019s on your heart…',
    'Zapsat': 'Save entry',

    /* — stránka „Všechna místa" (objevit) — */
    'Všechna místa': 'All places',
    'Načítám…': 'Loading…',
    'Země': 'Country',
    'Vše': 'All',
    'Všechny': 'All',

    /* — hlášky a stavy generované v JS (app.js, misto.js, denik.js, foto.js, geo.js) — */
    'Uložit': 'Save',
    'Uloženo': 'Saved',
    'Ukládám…': 'Saving…',
    'Uložení selhalo:': 'Saving failed:',
    'Změny uloženy.': 'Changes saved.',
    'Nepodařilo se:': 'Failed:',
    'Najít mě': 'Find me',
    'Najít mou polohu': 'Find my location',
    'Hledám tvou polohu…': 'Finding your location…',
    'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.': 'Finding your location is taking too long. Please try again.',
    'Polohu se nepodařilo načíst.': 'Your location couldn\u2019t be obtained.',
    'Polohu se nepodařilo načíst. Jsi venku, pod otevřeným nebem?': 'Your location couldn\u2019t be obtained. Are you outside, under open sky?',
    'Geodata se nenačetla:': 'Geodata didn\u2019t load:',
    'Tvůj prohlížeč polohu nepodporuje.': 'Your browser doesn\u2019t support location.',
    'Přístup k poloze je zakázaný — povol ho v nastavení prohlížeče.': 'Location access is blocked — allow it in your browser settings.',
    'Přístup k poloze jsi zamítl. Bez ní místo zanést nelze.': 'You denied location access. Without it a place can\u2019t be added.',
    'Přístup k poloze jsi zamítl. Bez ní zápis pořídit nelze.': 'You denied location access. Without it an entry can\u2019t be made.',

    /* — nové hlášky (červenec 2026: geolokace, formuláře, přihlášení) — */
    'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Otevři Atlas přes menu ⋮ v běžném prohlížeči — bez polohy místo zanést nelze.': 'The in-app browser (Facebook, Instagram…) can\u2019t access location. Open the Atlas via the ⋮ menu in a regular browser — without location a place can\u2019t be added.',
    'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Otevři Atlas přes menu ⋮ v běžném prohlížeči — bez polohy zápis pořídit nelze.': 'The in-app browser (Facebook, Instagram…) can\u2019t access location. Open the Atlas via the ⋮ menu in a regular browser — without location an entry can\u2019t be made.',
    'Přístup k poloze je zablokovaný. Klepni na ikonu vedle adresy → Oprávnění → Poloha → Povolit a stránku obnov. Bez polohy místo zanést nelze.': 'Location access is blocked. Tap the icon next to the address → Permissions → Location → Allow, then reload the page. Without location a place can\u2019t be added.',
    'Přístup k poloze je zablokovaný. Klepni na ikonu vedle adresy → Oprávnění → Poloha → Povolit a stránku obnov. Bez polohy zápis pořídit nelze.': 'Location access is blocked. Tap the icon next to the address → Permissions → Location → Allow, then reload the page. Without location an entry can\u2019t be made.',
    'Polohu se nepodařilo načíst. Máš v telefonu zapnutou polohu (GPS)? Jsi venku, pod otevřeným nebem?': 'Your location couldn\u2019t be obtained. Is location (GPS) turned on in your phone? Are you outside, under open sky?',
    'Dej místu jméno.': 'Give the place a name.',
    'Úprava se neuložila — nemáš k ní oprávnění, nebo vypršelo přihlášení.': 'The edit didn\u2019t save — you don\u2019t have permission, or your sign-in expired.',
    'Fotku se nepodařilo nahrát — zápis uložím bez ní.': 'The photo couldn\u2019t be uploaded — saving the entry without it.',
    'Zápisy se nepodařilo načíst. Zkus obnovit stránku.': 'The entries couldn\u2019t be loaded. Try refreshing the page.',
    'Komentáře se nepodařilo načíst. Zkus obnovit stránku.': 'The comments couldn\u2019t be loaded. Try refreshing the page.',
    'Odkaz je na cestě': 'The link is on its way',
    'Poslali jsme ho na': 'We\u2019ve sent it to',
    'Otevři si schránku a klikni na něj. Tuhle stránku můžeš klidně zavřít.': 'Open your inbox and click it. You can close this page.',
    'Poslat znovu': 'Send again',
    /* — geocachingový model (návštěvy) — */
    'Byl jsem tady': 'I was here',
    'Tvé první naladění': 'Your first attunement',
    'Nepovinné': 'Optional',
    'Označíš ✦ Byl jsem tady, naladíš pět os a necháš pár slov — na místě, nebo v klidu doma. DNA místa je pravdivější s každým, kdo ho procítí.': 'You mark ✦ I was here, set the five axes and leave a few words — on the spot, or calmly at home. The place\u2019s DNA grows truer with everyone who feels it.',
    'Návštěva': 'Visit',
    'Naladíš pět os — z nich žije DNA místa. Zapsat můžeš rovnou na místě i doma po návratu.': 'You set the five axes — the place\u2019s DNA lives on them. You can log it right on the spot or at home after your journey.',
    'Jak na tebe místo působilo': 'How the place felt to you',
    'tvoje naladění tvoří DNA': 'your attunement shapes the DNA',
    'Pár slov a fotka': 'A few words and a photo',
    'nepovinné — ukáže se na zdi místa': 'optional — appears on the place\u2019s wall',
    'Co sis odnesl': 'What you took away',
    'Stojíš právě tady?': 'Standing here right now?',
    'nepovinný bonus': 'optional bonus',
    'Ověřit, že tu stojím': 'Verify I\u2019m here',
    'Ověřit znovu': 'Verify again',
    'Nepovinné — ověřená návštěva získá odznak ◎ ověřeno na místě.': 'Optional — a verified visit earns the ◎ verified-on-site badge.',
    'Uložit návštěvu': 'Save the visit',
    'Návštěvou naladíš DNA místa — rovnou tady, nebo v klidu doma po cestě. Komentář může nechat kdokoli.': 'A visit attunes the place\u2019s DNA — right here, or at home after your journey. Anyone can leave a comment.',
    'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Návštěvu můžeš uložit i bez ověření.': 'The in-app browser (Facebook, Instagram…) can\u2019t access location. You can still save the visit without verification.',
    'Přístup k poloze je zablokovaný — povol ho přes ikonu vedle adresy. Návštěvu ale můžeš uložit i bez ověření.': 'Location access is blocked — allow it via the icon next to the address. You can still save the visit without verification.',
    'Dnešní návštěvu tu už zapsanou máš. Další můžeš přidat zase jindy.': 'You\u2019ve already logged today\u2019s visit here. You can add another one another day.',
    'Návštěva zapsána s ověřením ◎ Tvé naladění vstoupilo do DNA místa.': 'Visit logged with ◎ verification. Your attunement has entered the place\u2019s DNA.',
    'Návštěva zapsána ✦ Tvé naladění vstoupilo do DNA místa.': 'Visit logged ✦ Your attunement has entered the place\u2019s DNA.',
    'Jsi mimo signál — návštěva je uschovaná v telefonu a odešle se sama, až se připojíš.': 'You\u2019re out of signal — the visit is stored on your phone and will send itself once you\u2019re back online.',
    'Návštěvu se nepodařilo uschovat. Zůstává vyplněná — zkus Uložit, až chytíš signál.': 'The visit couldn\u2019t be stored. It stays filled in — try Save once you have signal.',
    'Uschovaná návštěva se právě odeslala 🌿': 'A stored visit has just been sent 🌿',
    'ověřeno na místě': 'verified on site',
    'Zatím bez komentářů. Byl jsi tu? Poděl se o pár slov.': 'No comments yet. Been here? Share a few words.',
    'Zatím bez návštěv — DNA se objeví s první zapsanou návštěvou.': 'No visits yet — the DNA will appear with the first logged visit.',
    'Přidej fotku': 'Add a photo',
    'Fotka od poutníka': 'Photo from a pilgrim',
    'Do galerie': 'To the gallery',
    'Fotka povýšena do galerie 🌿': 'Photo promoted to the gallery 🌿',
    'Komentář se ukáže po schválení.': 'The comment will appear after approval.',
    'Děkujeme! Komentář se ukáže po schválení.': 'Thank you! The comment will appear after approval.',
    'Fotku se nepodařilo nahrát — komentář uložím bez ní.': 'The photo couldn\u2019t be uploaded — saving the comment without it.',
    'Vyprávěj o místě': 'Tell the story of the place',
    'Hlavně co tu cítíš a prožíváš. Klidně přidej i jak se sem dostat nebo kdy je tu nejkrásněji.': 'Above all what you feel and experience here. Feel free to add how to get here or when it\u2019s most beautiful.',
    'Místo do Atlasu vstupuje jen z místa samého': 'A place enters the Atlas only from the place itself',
    'Nové místo zanese jen ten, kdo u něj skutečně stojí — tak víme, že každý bod v mapě někdo prošel. Návštěvy pak stojí na důvěře poutníků: zapíšeš ji na místě, nebo v klidu doma po návratu. A když ji ověříš přímo na místě, ponese odznak ◎.': 'A new place is added only by someone truly standing there — that\u2019s how we know every point on the map has been walked. Visits then rest on pilgrims\u2019 trust: log one on the spot, or calmly at home after returning. And if you verify it right on site, it carries the ◎ badge.',
    'Návštěva a komentář': 'Visit and comment',
    'Byl jsi tady. Naladíš pět os — z nich se rodí DNA místa. Na místě získáš i ověření ◎.': 'You were here. You set the five axes — the place\u2019s DNA is born from them. On site you also earn the ◎ verification.',
    'Pár slov na zeď místa — prožitek, upozornění, kus historie. Napíše ho kdokoli, do DNA nevstupuje.': 'A few words on the place\u2019s wall — an experience, a heads-up, a piece of history. Anyone can write one; it doesn\u2019t enter the DNA.',
    'Návštěva tvoří DNA místa': 'A visit shapes the place\u2019s DNA',
    'Byl jsi na místě? Klepni na ✦ Byl jsem tady a nalaď pět os: Klid, Energii, Mystiku, Krásu a Léčivost. Pár slov a fotka jsou nepovinné — ukážou se na zdi místa. Zapsat návštěvu můžeš rovnou tam, nebo v klidu doma po cestě.': 'Been to the place? Tap ✦ I was here and set the five axes: Calm, Energy, Mystique, Beauty and Healing. A few words and a photo are optional — they appear on the place\u2019s wall. You can log the visit right there, or calmly at home after your journey.',
    'Když návštěvu ověříš polohou přímo na místě, ponese odznak ◎ ověřeno na místě — je to nepovinný bonus. Z jednoho místa jde zapsat jedna návštěva denně.': 'If you verify a visit with your location right on site, it carries the ◎ verified-on-site badge — an optional bonus. One visit per place per day.',
    'Když se poloha nenačte (při zakládání místa)': 'When your location won\u2019t load (when founding a place)',
    'Prožitek, upozornění na uzavřenou cestu nebo kus historie můžeš k místu přidat odkudkoli, klidně i s fotkou — komentář do DNA místa nevstupuje.': 'An experience, a heads-up about a closed path or a piece of history can be added from anywhere, photo welcome — a comment doesn\u2019t enter the place\u2019s DNA.',
    'Poloha se zaměří i bez signálu, satelity síť nepotřebují. A když uložíš návštěvu bez připojení, uschová se v telefonu a odešle se sama, jakmile signál chytíš. O obojím ti dáme vědět.': 'Your location can be fixed even without signal — satellites don\u2019t need the network. And if you save a visit while offline, it\u2019s stored on your phone and sends itself once you catch signal. We\u2019ll let you know about both.',
    'Komentář napíšeš odkudkoli — prožitek z dřívějška, upozornění na cestu, kus historie. Do DNA místa se nezapočítá; tu tvoří návštěvy.': 'A comment can be written from anywhere — an experience from earlier, a heads-up about the path, a piece of history. It doesn\u2019t count toward the DNA; visits shape that.',
    'Označíš ✦ Byl jsem tady, naladíš pět os a necháš pár slov — na místě, nebo v klidu doma. DNA místa je pravdivější s každým,': 'You mark ✦ I was here, set the five axes and leave a few words — on the spot, or calmly at home. The place\u2019s DNA grows truer with everyone,',
    'byl tu': 'was here',
    'Prožitky a poznámky': 'Experiences and notes',
    'Poděl se o prožitek či zkušenost': 'Share an experience or insight',
    'Komentář napíšeš odkudkoli — třeba sis odnesl prožitek z dřívější návštěvy, nebo víš něco, co ostatním pomůže. Do DNA místa se nezapočítá; tu tvoří jen zápisy z místa.': 'A comment can be written from anywhere — perhaps you carry an experience from an earlier visit, or know something that will help others. It doesn\u2019t count toward the place\u2019s DNA; only entries made on the spot do.',
    'Prožitek či zkušenost z dřívějška, upozornění na uzavřenou cestu nebo kus historie můžeš k místu přidat z domova — komentář polohu nevyžaduje a do DNA místa se nepočítá.': 'An experience or insight from earlier, a heads-up about a closed path or a piece of history can be added from home — a comment doesn\u2019t require your location and doesn\u2019t count toward the place\u2019s DNA.',
    'Napíšeš ho odkudkoli. Prožitek z dřívějška, upozornění na uzavřenou cestu, kus historie. Do DNA nevstupuje.': 'You write it from anywhere. An experience from the past, a heads-up about a closed path, a piece of history. It doesn\u2019t enter the DNA.',
    'utvoří DNA místa hned od zrodu': 'shapes the place\u2019s DNA from its very birth',
    'Napiš pár slov o tom, co tu prožíváš — každé místo se rodí se svým prvním zápisem.': 'Write a few words about what you\u2019re experiencing here — every place is born with its first entry.',
    'Přidáš jméno, až šest fotek a vybereš nejvýš tři štítky, které místo vystihují. Nakonec místu dáš první naladění pěti os a pár slov prožitku — s místem se tak rodí i jeho první zápis. Na mapě se objeví, jakmile ho projde správce.': 'You add a name, up to six photos, and choose at most three tags that capture the place. Finally you give it its first attunement of the five axes and a few words about your experience — the place is born together with its first entry. It appears on the map once the keeper reviews it.',
    'Nahrávám…': 'Uploading…',
    'Naladil jsi osy, ale bez pár slov prožitku se první zápis neuloží a místo zůstane bez DNA. Doplníš větu? (Zrušit = odeslat bez zápisu)': 'You\u2019ve set the axes, but without a few words the first entry won\u2019t be saved and the place will have no DNA. Add a sentence? (Cancel = submit without an entry)',
    'Nemáš teď slova? Stačí věta — zápis si doma kdykoli rozepíšeš přes ✎ Upravit.': 'No words right now? A sentence is enough — you can expand your entry any time at home via ✎ Edit.',
    'Nemusíš psát hned na místě. Stačí načíst polohu, naladit osy a uložit pár slov — doma pak zápis v klidu rozepíšeš přes ✎ Upravit. Poloha i datum zůstávají z tvé návštěvy.': 'You don\u2019t have to write on the spot. Just read your location, set the axes and save a few words — at home you can expand the entry in peace via ✎ Edit. The location and date stay from your visit.',
    'Předchozí fotka': 'Previous photo',
    'Další fotka': 'Next photo',
    'Hlavní fotka změněna 🌿': 'Main photo changed 🌿',
    'Moje místa': 'My places',
    'čeká na schválení': 'awaiting approval',
    'zamítnuté': 'rejected',
    'Pod svým nickem vpravo nahoře pak najdeš Moje cesty — místa, kde máš zápis — a Moje místa, která jsi do Atlasu přidal.': 'Under your nickname in the top right you\u2019ll then find My journeys — places where you have an entry — and My places, the ones you\u2019ve added to the Atlas.',

    /* — stránka Nápověda — */
    'Nápověda': 'Guide',
    'Nápověda — Atlas energetických míst': 'Guide — Atlas of Energetic Places',
    'Průvodce Atlasem: přihlášení bez hesla, přidání místa, zápisy a DNA, poloha, offline režim i soukromí — vše polopatě na jednom místě.': 'A guide to the Atlas: password-free sign-in, adding places, entries and DNA, location, offline mode and privacy — all plainly explained in one place.',
    'Průvodce Atlasem': 'A guide to the Atlas',
    'Všechno, co potřebuješ vědět — polopatě a na jednom místě. Kdyby sis přesto nevěděl rady, napiš nám.': 'Everything you need to know — plainly, in one place. And if anything still puzzles you, write to us.',
    'Začínáme': 'Getting started',
    'Co je Atlas a jak se v něm pohybovat': 'What the Atlas is and how to move around it',
    'Atlas je živá mapa energetických a posvátných míst. Procházet ji může kdokoli i bez účtu — mapa, seznam míst i jejich příběhy jsou otevřené všem.': 'The Atlas is a living map of energetic and sacred places. Anyone can browse it without an account — the map, the list of places and their stories are open to everyone.',
    'Nahoře v liště najdeš Mapu, stránku Objevuj se všemi místy, svůj soukromý Deník a stránku O projektu. Na telefonu se stejná nabídka schovává pod třemi čárkami vpravo nahoře.': 'In the top bar you\u2019ll find the Map, the Discover page with all places, your private Journal and the About page. On a phone the same menu hides under the three lines in the top right.',
    'Účet': 'Account',
    'Přihlášení bez hesla': 'Signing in without a password',
    'Účet potřebuješ, až když chceš přidat místo, zapsat návštěvu nebo komentovat. Klepni na Přihlásit, zadej svůj e-mail a my ti pošleme odkaz. Kliknutím na něj jsi přihlášený — žádné heslo si pamatovat nemusíš.': 'You need an account only when you want to add a place, log a visit or comment. Tap Sign in, enter your e-mail and we\u2019ll send you a link. Click it and you\u2019re in — no password to remember.',
    'Nepřišel odkaz? Mrkni do složky spam či hromadné pošty. Poslat ho znovu můžeš po minutě přímo z přihlašovacího okna.': 'Link didn\u2019t arrive? Check your spam or bulk folder. You can resend it after a minute right from the sign-in window.',
    'Při prvním přihlášení si zvolíš nick — jméno, pod kterým se zobrazují tvoje zápisy a komentáře. Skutečné jméno uvádět nemusíš.': 'On your first sign-in you\u2019ll choose a nickname — the name your entries and comments appear under. You don\u2019t have to use your real name.',
    'Místa': 'Places',
    'Jak přidat nové místo': 'How to add a new place',
    'Místo zaneseš jen tehdy, když u něj skutečně stojíš — Atlas si načte tvou polohu přímo z místa. Je to záměr: každý bod v mapě tak někdo opravdu navštívil.': 'A place can be added only when you\u2019re truly standing there — the Atlas reads your location right on the spot. That\u2019s deliberate: every point on the map has really been visited by someone.',
    'Přidáš jméno, až šest fotek a vybereš nejvýš tři štítky, které místo vystihují. Nakonec místu dáš první naladění pěti os a odešleš ke schválení. Na mapě se objeví, jakmile ho projde správce.': 'You add a name, up to six photos, and choose at most three tags that capture the place. Finally you give it its first attunement of the five axes and submit it for approval. It appears on the map once the keeper reviews it.',
    'Fotky můžeš doplnit i později: na stránce svého místa najdeš v galerii dlaždici Přidat fotky. Křížkem fotku smažeš, tlačítkem u ní změníš hlavní fotku.': 'You can add photos later too: on your place\u2019s page you\u2019ll find an Add photos tile in the gallery. The cross deletes a photo; the button next to one sets it as the main photo.',
    'Poloha': 'Location',
    'Když se poloha nenačte': 'When your location won\u2019t load',
    'Prohlížeč se tě při prvním pokusu zeptá, zda smí polohu použít — povol ji. Když jsi ji dřív omylem zamítl, klepni na ikonu vedle adresy, otevři Oprávnění → Poloha → Povolit a stránku obnov.': 'On the first attempt your browser asks whether it may use your location — allow it. If you once denied it by mistake, tap the icon next to the address, open Permissions → Location → Allow, and reload the page.',
    'Otevřel jsi Atlas z Facebooku nebo Instagramu? Prohlížeč uvnitř těchto aplikací polohu neumí. Otevři Atlas přes menu se třemi tečkami v běžném prohlížeči, třeba v Chromu nebo Safari.': 'Did you open the Atlas from Facebook or Instagram? The browser inside those apps can\u2019t access location. Open the Atlas via the three-dot menu in a regular browser, such as Chrome or Safari.',
    'A nezapomeň na zapnutou polohu v telefonu. Pod otevřeným nebem bývá zaměření rychlejší a přesnější.': 'And don\u2019t forget to turn location on in your phone. Under open sky the fix tends to be faster and more accurate.',
    'Zápisy tvoří DNA': 'Entries shape the DNA',
    'Zápis návštěvy tvoří DNA místa': 'A visit entry shapes the place\u2019s DNA',
    'Zápis je svědectví z místa — pořídíš ho jen tehdy, když tam stojíš. Napíšeš, co jsi prožil, přidáš případně fotku a naladíš pět os: Klid, Energii, Mystiku, Krásu a Léčivost.': 'An entry is a testimony from the place — you can make it only while standing there. You write what you experienced, add a photo if you like, and set the five axes: Calm, Energy, Mystique, Beauty and Healing.',
    'Z hodnocení všech poutníků se počítá DNA místa — společný otisk toho, jak místo působí. Čím víc zápisů, tím pravdivější obraz.': 'From all pilgrims\u2019 ratings the place\u2019s DNA is calculated — a shared imprint of how the place feels. The more entries, the truer the picture.',
    'Z jednoho místa jde pořídit jeden zápis denně. Svůj zápis můžeš kdykoli později upravit.': 'You can make one entry per place per day. You can edit your entry any time later.',
    'Vzpomínku, upozornění na uzavřenou cestu nebo kus historie můžeš k místu přidat z domova — komentář polohu nevyžaduje a do DNA místa se nepočítá.': 'A memory, a heads-up about a closed path or a piece of history can be added from home — a comment doesn\u2019t require your location and doesn\u2019t count toward the place\u2019s DNA.',
    'Komentář napíšeš odkudkoli': 'A comment can be written from anywhere',
    'Deník': 'Journal',
    'Tvůj soukromý prostor': 'Your private space',
    'Deník je jen tvůj. Zápisky v něm nikdo jiný nevidí a nikam se nesdílejí.': 'The journal is yours alone. Nobody else sees its notes and nothing is shared anywhere.',
    'Bez signálu': 'Out of signal',
    'Atlas funguje i v hluchých údolích': 'The Atlas works even in silent valleys',
    'Vyrážíš-li do míst bez signálu, otevři si Atlas ještě doma nebo cestou — uloží se ti do telefonu a otevře se pak i offline.': 'Heading somewhere without signal? Open the Atlas at home or on the way — it stores itself on your phone and will open offline afterwards.',
    'Poloha se zaměří i bez signálu, satelity síť nepotřebují. A když odešleš zápis bez připojení, uschová se v telefonu a odešle se sám, jakmile signál chytíš. O obojím ti dáme vědět.': 'Your location can be fixed even without signal — satellites don\u2019t need the network. And if you submit an entry while offline, it\u2019s stored on your phone and sends itself once you catch signal. We\u2019ll let you know about both.',
    'Jazyk': 'Language',
    'Čeština a angličtina': 'Czech and English',
    'Atlas mluví česky a anglicky. Hostům s cizojazyčným prohlížečem se sám přepne do angličtiny; jazyk jde kdykoli změnit odkazem v patičce, zahraničním poutníkům se nabízí i přepínač pod logem.': 'The Atlas speaks Czech and English. For guests with a foreign-language browser it switches to English by itself; you can change the language any time via the footer link, and pilgrims from abroad also get a switch under the logo.',
    'Vzkazy': 'Messages',
    'Zvoneček v liště': 'The bell in the bar',
    'Když ti správce pošle vzkaz — třeba ke tvému místu — rozsvítí se u zvonečku číslo. Klepnutím si vzkazy přečteš.': 'When the keeper sends you a message — about your place, for instance — a number lights up by the bell. Tap it to read your messages.',
    'Soukromí': 'Privacy',
    'Co je veřejné a co ne': 'What\u2019s public and what isn\u2019t',
    'Veřejný je tvůj nick, tvoje zápisy, komentáře a fotky, které k místům přidáš. E-mail nikde nezobrazujeme a nikomu nepředáváme. Deník je soukromý.': 'Public are your nickname, your entries, comments and the photos you add to places. Your e-mail is never displayed and never passed to anyone. The journal is private.',
    'Podrobnosti najdeš v': 'Details can be found in the',
    'Podmínkách užití': 'Terms of use',
    '. S čímkoli dalším napiš na': '. For anything else, write to',
    'Teď už jen vykročit': 'Now just set out',
    'Otevři mapu, vyber si místo, které tě volá — a až u něj budeš stát, zanech svou stopu.': 'Open the map, choose a place that calls to you — and when you stand there, leave your trace.',
    'Přidat fotky': 'Add photos',
    'Nahrávám fotky…': 'Uploading photos…',
    'Fotka přidána 🌿': 'Photo added 🌿',
    'Fotky přidány 🌿': 'Photos added 🌿',
    'Galerie má strop 12 fotek.': 'The gallery holds up to 12 photos.',
    'Jsi mimo signál — fotky do galerie nahraj, až se připojíš.': 'You\u2019re out of signal — upload gallery photos once you\u2019re back online.',
    'Fotky se nepodařilo nahrát. Zkontroluj připojení a zkus to znovu.': 'The photos couldn\u2019t be uploaded. Check your connection and try again.',
    'Opravdu smazat tuhle fotku?': 'Really delete this photo?',
    'Fotka smazána.': 'Photo deleted.',
    'Smazat fotku': 'Delete photo',
    'Jsi mimo signál — zápis je uschovaný v telefonu a odešle se sám, až se připojíš.': 'You\u2019re out of signal — the entry is stored on your phone and will send itself once you\u2019re back online.',
    'Zápis se nepodařilo uschovat. Zůstává vyplněný — zkus Uložit, až chytíš signál.': 'The entry couldn\u2019t be stored. It stays filled in — try Save again once you have signal.',
    'Uschovaný zápis z místa se právě odeslal 🌿': 'A stored entry from your visit has just been sent 🌿',
    'Uschovaný zápis nebyl přijat — z toho místa už ten den zápis máš.': 'A stored entry wasn\u2019t accepted — you already have an entry from that place for that day.',
    'Nedaří se ověřit tvůj účet — zkontroluj signál a zkus to znovu.': 'Your account can\u2019t be verified right now — check your signal and try again.',
    'Přihlas se': 'Sign in',
    'Zadej e-mail a pošleme ti odkaz. Klikneš na něj a jsi uvnitř — žádné heslo si pamatovat nemusíš.': 'Enter your e-mail and we\u2019ll send you a link. Click it and you\u2019re in — no password to remember.',
    'Tvůj e-mail': 'Your e-mail',
    'Poslat odkaz': 'Send the link',
    'tvuj@email.cz': 'your@email.com',
    'Procházet Atlas můžeš i bez účtu. Přihlášení potřebuješ, až budeš chtít zanést místo, zapsat návštěvu nebo komentovat.': 'You can browse the Atlas without an account. You\u2019ll need to sign in only when you want to add a place, log a visit or comment.',
    'Poslední krok': 'One last step',
    'Zvol si nick': 'Choose a nickname',
    'Zvol nick': 'Choose a nick',
    'Pod ním se budou zobrazovat tvoje zápisy a komentáře. Skutečné jméno uvádět nemusíš.': 'Your entries and comments will appear under it. You don\u2019t have to use your real name.',
    'Nick': 'Nickname',
    '3–24 znaků, písmena, číslice, tečka, pomlčka nebo podtržítko.': '3\u201324 characters: letters, digits, dot, hyphen or underscore.',
    'Uložit a pokračovat': 'Save and continue',
    'Přihlášen jako': 'Signed in as',
    'Kontroluji…': 'Checking…',

    /* — sekce „Dvě role, jedna cesta" (index, doplněno po odpolední úpravě) — */
    'Dvě role, jedna cesta': 'Two roles, one journey',
    'Atlas roste tím, jak si poutníci předávají místa. Někdo místo objeví a zanese jako první — a pak žije dál díky těm, kdo přicházejí po něm.': 'The Atlas grows as pilgrims pass places on to one another. Someone discovers a place and adds it first — and it lives on through those who come after.',
    'Jsi první, kdo sem přichází': 'You\u2019re the first to arrive',
    'Cesta tvůrce': 'The creator\u2019s journey',
    'Staneš u něj.': 'You stand at the place.',
    'Místo zaneseš jen tehdy, když u něj skutečně stojíš — poloha se načte přímo z místa.': 'A place can be added only when you\u2019re truly standing there — your location is taken right on the spot.',
    'Pojmenuješ, čím je.': 'You name what it is.',
    'Přidáš jméno, fotky a vybereš z osmnácti kategorií, co nejlíp vystihuje jeho povahu.': 'You add a name and photos, and choose from eighteen categories what best captures its nature.',
    'Dáš mu první naladění.': 'You give it its first attunement.',
    'Napíšeš, co cítíš, a naladíš pět os — místu tak vdechneš DNA hned od zrodu.': 'You write what you feel and set the five axes — breathing DNA into the place from its very birth.',
    'Předáš ho dál.': 'You pass it on.',
    'Po ověření správcem se místo objeví na mapě, otevřené všem, kdo přijdou po tobě.': 'Once verified by the keeper, the place appears on the map, open to everyone who comes after you.',
    'Přicházíš za místem, které někdo otevřel': 'You follow a place someone has opened',
    'Cesta poutníka': 'The pilgrim\u2019s journey',
    'Objevuješ.': 'You discover.',
    'Projdeš mapu podle sebe — nebo si vybereš z osmnácti kategorií podle toho, co tě volá.': 'You wander the map your own way — or choose from eighteen categories by what calls to you.',
    'Vydáváš se.': 'You set out.',
    'Zvolíš místo, které tě přitahuje, a navigace tě dovede až k němu.': 'You choose a place that draws you, and navigation leads you all the way there.',
    'Procítíš.': 'You feel it.',
    'Až tam budeš stát, zastavíš se. Ztišíš mysl, nadechneš se toho místa, dopřeješ si čas.': 'When you stand there, you stop. You quiet your mind, breathe the place in, give yourself time.',
    'Zapíšeš.': 'You write it down.',
    'Zanecháš svědectví a naladění pěti os — DNA místa je pravdivější s každým, kdo ho procítí.': 'You leave a testimony and your reading of the five axes — the place\u2019s DNA grows truer with everyone who feels it.',
    'Odeslat ke schválení →': 'Submit for approval →',

    /* — stránka místa (misto.html, doplněno po odpolední úpravě) — */
    'Zpět na mapu': 'Back to the map',
    'Načítám místo…': 'Loading the place…',
    'Zapsat návštěvu': 'Log a visit',
    'Přidat komentář': 'Add a comment',
    'Zápis lze pořídit jen přímo na místě — utváří DNA. Komentář napíšeš odkudkoli.': 'An entry can be made only right on the spot — it shapes the DNA. A comment can be written from anywhere.',
    'Fotky místa': 'Photos of the place',
    'Svědectví z místa': 'Testimonies from the place',
    'Zápisy': 'Entries',
    'Vzpomínky a poznámky': 'Memories and notes',
    'Komentáře': 'Comments',
    'Zápis z místa': 'Entry from the place',
    'Byl jsi tady': 'You were here',
    'Zápis vzniká jen přímo na místě. Tvé vnímání pěti os pak spoluutváří DNA tohoto místa.': 'An entry is made only right on the spot. Your reading of the five axes then helps shape this place\u2019s DNA.',
    'Důkaz, že tu stojíš': 'Proof you\u2019re standing here',
    'Co jsi tu prožil': 'What you experienced here',
    'Tvůj zápis': 'Your entry',
    'Co se dělo, co jsi vnímal, co sis odnesl.': 'What happened, what you sensed, what you took away.',
    'Nepovinné — takhle to tu vypadalo': 'Optional — this is what it looked like',
    'Jak jsi místo vnímal': 'How you perceived the place',
    'tvoje hodnocení tvoří DNA': 'your rating shapes the DNA',
    'Uložit zápis': 'Save the entry',
    'Poděl se o vzpomínku': 'Share a memory',
    'Komentář napíšeš odkudkoli — třeba na místo vzpomínáš z dřívějška nebo víš něco, co ostatním pomůže. Do DNA místa se nezapočítá; tu tvoří jen zápisy z místa.': 'A comment can be written from anywhere — perhaps you remember the place from years ago, or know something that will help others. It doesn\u2019t count toward the place\u2019s DNA; only entries made on the spot do.',
    'Tvůj komentář': 'Your comment',
    'Odeslat': 'Send',
    'Úprava zápisu': 'Edit entry',
    'Uprav svůj zápis': 'Edit your entry',
    'Můžeš upravit text i své vnímání pěti os. Poloha a datum zůstávají zachovány.': 'You can edit the text and your reading of the five axes. The location and date stay unchanged.',
    'Uložit změny': 'Save changes',
    'Úprava komentáře': 'Edit comment',
    'Uprav svůj komentář': 'Edit your comment',
    'Přišel jsem za rozbřesku…': 'I came at daybreak…',
    'Náhled fotky ze zápisu': 'Photo preview from the entry',
    'Chodil jsem sem jako kluk…': 'I used to come here as a boy…',

    /* — stránka O projektu (nový text z odpolední úpravy) — */
    'Naslouchání krajině': 'Listening to the landscape',
    'Atlas je pozvání k jinému způsobu vnímání.': 'The Atlas is an invitation to a different way of perceiving.',
    'Naslouchá tomu,': 'It listens to',
    'jak místo zní, když ztišíš mysl a začneš cítit.': 'how a place sounds when you quiet your mind and begin to feel.',
    'Odkud pramení': 'Where it springs from',
    'Krajina k nám promlouvá': 'The landscape speaks to us',
    'Atlas vznikl z přesvědčení, že krajina k nám promlouvá — prameny, kameny, staré stromy, vrcholy i mohyly nesou něco, co se nedá vyfotit, ale dá se to zažít.': 'The Atlas was born of the conviction that the landscape speaks to us — springs, stones, old trees, summits and mounds carry something that can\u2019t be photographed, but can be experienced.',
    'Je to místo, kde tyhle zkušenosti sdílíme a učíme se jim znovu naslouchat.': 'It\u2019s a place where we share these experiences and learn to listen to them again.',
    'Znovu probudit smysl, na který jsme zapomněli': 'Reawakening a sense we\u2019ve forgotten',
    'Člověk odjakživa cítil, že některá místa jsou jiná. Že u některého pramene se dýchá volněji, pod některým stromem se myšlenky ztiší, na některém vrcholu se něco v hrudi otevře. Tahle citlivost — mimosmyslové vnímání, cítění, vnitřní naladění — v nás nezmizela. Jen jsme ji přestali trénovat.': 'People have always felt that some places are different. That by a certain spring you breathe more freely, under a certain tree your thoughts grow quiet, on a certain summit something opens in your chest. This sensitivity — extrasensory perception, feeling, inner attunement — hasn\u2019t vanished from us. We\u2019ve simply stopped training it.',
    'Atlas je nástroj, jak se k ní vrátit. Nejde o to sbírat body na mapě jako trofeje. Jde o to učit se': 'The Atlas is a way back to it. It isn\u2019t about collecting points on a map like trophies. It\u2019s about learning to',
    'znovu vnímat': 'perceive again',
    '— jemně, pozorně, celým tělem. Každé místo je pozvánka zastavit se, ztišit a zeptat se:': '— gently, attentively, with your whole body. Every place is an invitation to stop, grow quiet and ask:',
    'co tu cítím?': 'what do I feel here?',
    'Jak to funguje v hloubce': 'How it works at depth',
    'Místo se pozná, až když u něj stojíš': 'A place reveals itself only when you stand there',
    'Proto lze zápis do Atlasu vložit jen přímo na místě. Není to technické omezení — je to podstata. Vnímání se nedá zprostředkovat z fotky. Musíš tam být, nadechnout se toho vzduchu, položit dlaň na kámen, chvíli mlčet.': 'That\u2019s why an entry can be added to the Atlas only right on the spot. It isn\u2019t a technical limitation — it\u2019s the essence. Perception can\u2019t be conveyed through a photo. You have to be there, breathe that air, lay your palm on the stone, be silent for a while.',
    'Z těch zápisů se pak rodí': 'From these entries then emerges',
    '— otisk toho, jak ho lidé skutečně prožívají: kolik v něm nacházejí klidu, energie, mystiky, krásy, léčivé síly. Ne názor jednoho člověka, ale společné cítění mnoha poutníků. Čím víc lidí místo procítí, tím pravdivější jeho obraz je.': '— an imprint of how people truly experience it: how much calm, energy, mystique, beauty and healing power they find there. Not one person\u2019s opinion, but the shared feeling of many pilgrims. The more people feel a place, the truer its image becomes.',
    'Cesta jako praxe': 'The journey as practice',
    'Spirituální turistika, která má hloubku': 'Spiritual travel with depth',
    'Cestování může být únik — nebo praxe. Atlas nabízí to druhé. Vydat se za místem není výlet za razítkem, ale poutě: záměrné vykročení do krajiny s otevřeností k tomu, co ti přinese. Někdy je to ticho. Někdy vhled. Někdy jen hluboký nádech, po kterém jde všechno snáz.': 'Travel can be an escape — or a practice. The Atlas offers the latter. Setting out for a place isn\u2019t a trip for a stamp; it\u2019s a pilgrimage: a deliberate step into the landscape, open to whatever it brings you. Sometimes it\u2019s silence. Sometimes insight. Sometimes just a deep breath, after which everything comes easier.',
    'Spojujeme tak dvě věci, které k sobě odjakživa patřily —': 'We join two things that have always belonged together —',
    'cestu a vnitřní práci': 'the journey and inner work',
    '. Poutník starých časů nešel jen z bodu A do bodu B; šel, aby se cestou proměnil. Tuhle starou moudrost vracíme do dnešního světa.': '. The pilgrim of old didn\u2019t walk merely from point A to point B; he walked to be transformed by the way. We\u2019re bringing that old wisdom back into today\u2019s world.',
    'Pod křídly Oázy Adamanthea': 'Under the wings of Oáza Adamanthea',
    'Oázy Adamanthea': 'Oáza Adamanthea',
    'Vzniká proto, že nám tahle místa přijdou důležitá, a protože věříme, že citlivost ke krajině se dá probouzet a sdílet.': 'It exists because these places matter to us, and because we believe sensitivity to the landscape can be awakened and shared.',
    'Kam směřujeme': 'Where we\u2019re headed',
    'Živá síť míst a lidí, kteří je cítí': 'A living network of places and the people who feel them',
    'Sníme o síti posvátné krajiny napříč zemí — ne turistické, ale procítěné. Místa objevená a střežená komunitou lidí, kteří rozvíjejí své vnímání, sdílejí zkušenost a učí se jeden od druhého.': 'We dream of a network of sacred landscape across the country — not touristic, but truly felt. Places discovered and guarded by a community of people who cultivate their perception, share their experience and learn from one another.',
    'Atlas je teprve na začátku téhle cesty. Jeho hloubka poroste s každým, kdo se zastaví, procítí a zapíše.': 'The Atlas is only at the beginning of this journey. Its depth will grow with everyone who stops, feels and writes.',
    'Vítej mezi poutníky': 'Welcome among the pilgrims',
    'Až u něj příště budeš stát, zanes ho. Zastav se, procíť ho — a nech ho tu pro ostatní.': 'Next time you stand at it, add it. Stop, feel it — and leave it here for those who follow.',
    'Nejdřív načti svou polohu — místo lze zanést jen přímo na místě.': 'Get your location first — a place can be added only right on the spot.',
    'Nejdřív načti svou polohu — zápis vzniká jen na místě.': 'Get your location first — an entry is made only on the spot.',
    'Nastavit jako hlavní': 'Set as main',
    'Hlavní': 'Main',
    'Hlavní fotka změněna 🌿': 'Main photo changed 🌿',
    'Měním…': 'Changing…',
    'Fotka místa': 'Photo of the place',
    'Fotka připravena — klepni pro změnu': 'Photo ready — tap to change',
    'Fotku se nepodařilo zpracovat, nahrávám originál:': 'The photo couldn\u2019t be processed, uploading the original:',
    'Fotka se nenahrála:': 'The photo didn\u2019t upload:',
    'Nahrávám fotky…': 'Uploading photos…',
    'Přidej aspoň jednu fotku — ať ostatní vidí, kam jdou.': 'Add at least one photo — so others can see where they\u2019re going.',
    'Přidej fotku z návštěvy': 'Add a photo from your visit',
    'Vyber alespoň jeden štítek místa.': 'Choose at least one place tag.',
    'Vyber nejvýš tři štítky — ať zůstane jasné, čím místo je.': 'Choose at most three tags — so it stays clear what the place is.',
    'Vyberte alespoň jednu kategorii.': 'Choose at least one category.',
    'Místo se nepodařilo uložit:': 'The place couldn\u2019t be saved:',
    'Místo smazáno.': 'Place deleted.',
    'Místo staženo z mapy.': 'Place taken off the map.',
    'Místo zamítnuto.': 'Place rejected.',
    'Místo zveřejněno.': 'Place published.',
    'Místo nenalezeno': 'Place not found',
    'Místo se ještě nenačetlo, zkus to za okamžik.': 'The place hasn\u2019t loaded yet, try again in a moment.',
    'Nové místo': 'New place',
    'Stáhnout místo z mapy? Vrátí se do stavu „čeká".': 'Take this place off the map? It will return to the “pending” state.',
    'Důvod zamítnutí (nepovinné, uvidí ho autor):': 'Reason for rejection (optional, the author will see it):',
    'Smazání se nepodařilo.': 'Deletion failed.',
    'První zápis se nepodařil:': 'The first entry failed:',
    'Zápis uložen. Tvé vnímání vstoupilo do DNA místa.': 'Entry saved. Your perception has entered the DNA of the place.',
    'Zapsáno 🌿': 'Recorded 🌿',
    'Zápis nemůže být prázdný.': 'An entry can\u2019t be empty.',
    'Zápis se nepodařilo uložit.': 'The entry couldn\u2019t be saved.',
    'Zápis se nepodařilo uložit:': 'The entry couldn\u2019t be saved:',
    'Zápis smazán': 'Entry deleted',
    'Zápis upraven 🌿': 'Entry edited 🌿',
    'Zápisy se nepodařilo načíst.': 'The entries couldn\u2019t be loaded.',
    'Napiš aspoň pár slov.': 'Write at least a few words.',
    'Opravdu smazat tento zápis? Nejde to vrátit.': 'Really delete this entry? It can\u2019t be undone.',
    'Z tohoto místa už dnes zápis máš. Přijď zas jindy.': 'You already have an entry from this place today. Come back another time.',
    'Zatím bez zápisů': 'No entries yet',
    'Zatím bez zápisů — DNA se objeví, jakmile někdo zapíše návštěvu.': 'No entries yet — the DNA appears as soon as someone records a visit.',
    'nejsilnější rys': 'strongest trait',
    'Komentář nemůže být prázdný.': 'A comment can\u2019t be empty.',
    'Komentář se nepodařilo uložit:': 'The comment couldn\u2019t be saved:',
    'Komentář upraven 🌿': 'Comment edited 🌿',
    'Děkujeme! Komentář je zveřejněn.': 'Thank you! Your comment is published.',
    'U tohoto místa zatím není žádný popis.': 'This place doesn\u2019t have a description yet.',
    'Souřadnice zkopírovány 🌿': 'Coordinates copied 🌿',
    'Kopírování se nepodařilo.': 'Copying failed.',
    'Zkontroluj odkaz, nebo se vrať na mapu.': 'Check the link, or go back to the map.',
    'Přihlášení připravujeme.': 'Sign-in is coming soon.',
    'Přihlášení zatím není dostupné. Zkus to za chvíli.': 'Sign-in isn\u2019t available yet. Try again shortly.',
    'Posílám odkaz…': 'Sending the link…',
    'Odkaz se nepodařilo poslat:': 'The link couldn\u2019t be sent:',
    'Odhlášeno.': 'Signed out.',
    'Nejsi přihlášený.': 'You\u2019re not signed in.',
    'Nick se nepodařilo uložit:': 'The nickname couldn\u2019t be saved:',
    'Tenhle nick už někdo má. Zkus jiný.': 'Someone already has that nickname. Try another.',
    'např. tichá_voda': 'e.g. quiet_water',
    'Naposledy přihlášen': 'Last signed in',
    'Přidaná místa': 'Places added',
    'buď první': 'be the first',
    'Zatím tu není žádné místo': 'There\u2019s no place here yet',
    'Zatím tu není žádné místo. Buď první!': 'There\u2019s no place here yet. Be the first!',
    'm od místa': 'm from the place',
    'míst': 'places',
    'místa': 'places',
    'místo': 'place',
    'zápis': 'entry',
    'zápisy': 'entries',
    'zápisů': 'entries',
    '1 místo': '1 place',
    '1 zápis': '1 entry',
    'poutník': 'pilgrim',
    'poutníci': 'pilgrims',
    'Vzkaz je prázdný.': 'The message is empty.',
    'Vzkaz odeslán autorovi. ✉': 'Message sent to the author. ✉',
    'Cesty se teď nepodařilo načíst.': 'The journeys couldn\u2019t be loaded right now.',
    'Zatím nikde zápis nemáš. Vydej se na cestu a zanech svou stopu. 🌿': 'You don\u2019t have an entry anywhere yet. Set out and leave your mark. 🌿',
  };

  /* jazyky, které umíme */
  const LANGS = ['cs', 'en'];

  /* ---- stav jazyka ------------------------------------------------------- */
  /* pořadí: 1) ?lang v adrese  2) uložená volba  3) jazyk prohlížeče (jen poprvé)  4) čeština */
  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.includes(q)) { try { localStorage.setItem('atlas_lang', q); } catch (e) {} return q; }
    let saved = null;
    try { saved = localStorage.getItem('atlas_lang'); } catch (e) {}
    if (saved && LANGS.includes(saved)) return saved;
    /* první návštěva: nečeský/neslovenský prohlížeč → angličtina + jednorázové oznámení */
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (nav && !/^(cs|sk)/i.test(nav)) {
      try {
        localStorage.setItem('atlas_lang', 'en');
        localStorage.setItem('atlas_lang_auto', '1');
      } catch (e) {}
      return 'en';
    }
    return 'cs'; /* výchozí na této doméně; anglický brand si později nastaví 'en' */
  }
  let lang = initialLang();
  window.atlasLang = lang;

  /* jednorázové oznámení o automatickém přepnutí (toast z header.js) */
  function oznamAutoJazyk() {
    let flag = null;
    try { flag = localStorage.getItem('atlas_lang_auto'); } catch (e) {}
    if (flag !== '1') return;
    try { localStorage.setItem('atlas_lang_auto', 'done'); } catch (e) {}
    setTimeout(function () {
      if (typeof notify === 'function')
        notify('Switched to English — change it anytime with CS·EN under the logo.');
    }, 900);
  }

  /* normalizace textu pro klíč: nbsp→mezera, sjednocení bílých znaků, trim */
  function norm(s) { return s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* překlad jednoho stringu (pro použití i z JS: window.t) */
  function tr(raw) {
    if (lang !== 'en' || raw == null) return raw;
    const s = String(raw);
    const key = norm(s);
    if (!key) return raw;
    if (EN[key]) return EN[key];
    /* odloupnout vedoucí ne-písmenné znaky (emoji, číslo, symbol) a přeložit zbytek */
    const m = key.match(/^([^\p{L}]+)(\p{L}.*)$/u);
    if (m && EN[m[2]]) return s.replace(m[2], EN[m[2]]);
    /* DNA rys „Klid 92 %" → přeložit vedoucí osu, číslo ponechat */
    const ax = key.match(/^(Klid|Energie|Mystika|Krása|Léčivost)(\s+\d.*)$/u);
    if (ax && EN[ax[1]]) return EN[ax[1]] + ax[2];
    return raw;
  }
  window.t = tr;
  window.atlasT = tr;

  /* ---- DOM překladač ----------------------------------------------------- */
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const origText = new WeakMap();   /* textNode → původní český text */
  const origAttr = new WeakMap();   /* element → {attr: původní hodnota} */

  function translTextNode(node) {
    const raw = node.nodeValue;
    if (!raw || !/\S/.test(raw)) return;
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    const core = raw.slice(lead.length, raw.length - trail.length);
    if (lang === 'en') {
      const out = tr(core);
      if (out !== core) {
        if (!origText.has(node)) origText.set(node, raw);
        node.nodeValue = lead + out + trail;
      }
    } else {
      if (origText.has(node)) { node.nodeValue = origText.get(node); origText.delete(node); }
    }
  }

  function translAttrs(el) {
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute || !el.hasAttribute(a)) return;
      const raw = el.getAttribute(a);
      if (!raw || !/\S/.test(raw)) return;
      if (lang === 'en') {
        const out = tr(raw);
        if (out !== raw) {
          let store = origAttr.get(el) || {};
          if (!(a in store)) { store[a] = raw; origAttr.set(el, store); }
          el.setAttribute(a, out);
        }
      } else {
        const store = origAttr.get(el);
        if (store && a in store) { el.setAttribute(a, store[a]); delete store[a]; }
      }
    });
  }

  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) { translTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP.has(root.tagName) || root.isContentEditable) return;
    translAttrs(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        const p = n.parentNode;
        if (p && (SKIP.has(p.tagName) || p.isContentEditable)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while ((n = it.nextNode())) translTextNode(n);
    /* atributy potomků */
    root.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(translAttrs);
  }

  /* hlavička dokumentu: <title>, meta description, <html lang> */
  function head() {
    document.documentElement.setAttribute('lang', lang);
    const titleKey = document.querySelector('title');
    if (titleKey) {
      if (lang === 'en') {
        if (!origText.has(titleKey.firstChild || titleKey)) { /* uložíme přes atribut */ }
        const cur = titleKey.textContent;
        if (!titleKey.dataset.cs) titleKey.dataset.cs = cur;
        titleKey.textContent = tr(titleKey.dataset.cs);
      } else if (titleKey.dataset.cs) {
        titleKey.textContent = titleKey.dataset.cs;
      }
    }
    document.querySelectorAll('meta[name="description"]').forEach(function (m) {
      if (lang === 'en') {
        if (!m.dataset.cs) m.dataset.cs = m.getAttribute('content') || '';
        m.setAttribute('content', tr(m.dataset.cs));
      } else if (m.dataset.cs) {
        m.setAttribute('content', m.dataset.cs);
      }
    });
  }

  /* ---- MutationObserver: překlad dynamicky vloženého obsahu --------------- */
  let observer = null;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function (muts) {
      if (lang !== 'en') return;        /* v češtině není co překládat */
      observer.disconnect();            /* vlastní zápisy neposlouchat */
      try {
        muts.forEach(function (mu) {
          if (mu.type === 'childList') {
            mu.addedNodes.forEach(function (nd) { walk(nd); });
          } else if (mu.type === 'characterData') {
            translTextNode(mu.target);
          } else if (mu.type === 'attributes' && mu.target.nodeType === Node.ELEMENT_NODE) {
            translAttrs(mu.target);
          }
        });
      } finally {
        observer.observe(document.body, OBS);
      }
    });
    observer.observe(document.body, OBS);
  }
  const OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };

  /* přepnutí jazyka */
  function apply() {
    window.atlasLang = lang;
    if (observer) observer.disconnect();
    head();
    walk(document.body);
    if (observer) observer.observe(document.body, OBS);
    syncSwitch();
  }
  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    try { localStorage.setItem('atlas_lang', lang); } catch (e) {}
    apply();
  }
  window.atlasSetLang = setLang;

  /* ---- přepínač v hlavičce ---------------------------------------------- */
  /* cizinec = prohlížeč nehlásí češtinu ani slovenštinu */
  function jeCizinec() {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return !!nav && !/^(cs|sk)/i.test(nav);
  }
  function syncSwitch() {
    document.querySelectorAll('.lang-switch [data-l]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-l') === lang);
    });
    /* přepínač vidí jen ten, koho se týká: cizí prohlížeč, nebo kdokoli v angličtině */
    const sw = document.querySelector('.lang-switch');
    if (sw) sw.style.display = (lang === 'en' || jeCizinec()) ? '' : 'none';
    /* patičkový odkaz nabízí vždy ten druhý jazyk */
    const foot = document.querySelector('.lang-foot');
    if (foot) foot.textContent = lang === 'en' ? 'Česky' : 'English';
  }
  function buildSwitch() {
    if (document.querySelector('.lang-switch')) return;
    const brand = document.querySelector('.brand');
    const host = document.querySelector('.header-actions');
    const wrap = document.createElement('div');
    wrap.className = 'lang-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Jazyk / Language');
    LANGS.forEach(function (l) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-l', l);
      b.textContent = l.toUpperCase();
      b.addEventListener('click', function () { setLang(l); });
      wrap.appendChild(b);
    });
    /* domovské místo je pod logem (.brand); když by chybělo, spadne zpět do lišty */
    if (brand) {
      brand.classList.add('brand-lang');
      brand.appendChild(wrap);
    } else if (host) {
      const menuBtn = host.querySelector('.menu-button');
      if (menuBtn) host.insertBefore(wrap, menuBtn); else host.appendChild(wrap);
    }
    /* trvalá cesta k jazyku v patičce (pro každého, i když přepínač není vidět) */
    const legal = document.querySelector('.footer-legal');
    if (legal && !legal.querySelector('.lang-foot')) {
      legal.appendChild(document.createTextNode(' · '));
      const fb = document.createElement('button');
      fb.type = 'button';
      fb.className = 'lang-foot';
      fb.addEventListener('click', function () { setLang(lang === 'en' ? 'cs' : 'en'); });
      legal.appendChild(fb);
    }
    syncSwitch();
  }

  function injectStyle() {
    if (document.getElementById('lang-switch-style')) return;
    const css = document.createElement('style');
    css.id = 'lang-switch-style';
    css.textContent =
      /* logo se přepínačem stane vztažným bodem, aby pás visel pod ním */
      '.brand-lang{position:relative;margin-bottom:2px}' +
      /* dvojtlačítko CS·EN — o třetinu menší než původní */
      '.lang-switch{display:inline-flex;gap:1px;padding:2px;border-radius:99px;' +
      'border:1px solid rgba(201,161,74,.45);background:rgba(22,36,29,.5);' +
      'align-items:center;line-height:1;flex:none;' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
      '.lang-switch button{border:0;background:transparent;cursor:pointer;' +
      'font:600 8px/1 "Jost",system-ui,sans-serif;letter-spacing:.05em;' +
      'color:var(--cream-soft,#d9d3c2);padding:3px 5px;border-radius:99px;' +
      'transition:.18s;min-width:17px}' +
      '.lang-switch button:hover{color:var(--cream,#fbf7ef)}' +
      '.lang-switch button.on{background:linear-gradient(180deg,#f0d493,#c9a14a 60%,#b98f38);' +
      'color:#16241d}' +
      /* posazené níž pod logo, mimo linku hlavičky */
      '.brand-lang .lang-switch{position:absolute;left:0;top:calc(100% + 16px);z-index:5}' +
      /* jazykový odkaz v patičce — decentní, ladí s „Podmínky užití" */
      '.lang-foot{border:0;background:none;cursor:pointer;padding:0;' +
      'font:inherit;color:inherit;text-decoration:underline;text-underline-offset:2px}' +
      '.lang-foot:hover{color:var(--gold,#c9a14a)}' +
      /* účet: rozumný strop + elipsa, ať se dlouhý nick nepřekusuje zbytečně brzy */
      '.header-actions .profile{max-width:9.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '@media(max-width:560px){' +
        '.brand-lang .lang-switch{top:calc(100% + 12px)}' +
        '.header-actions .profile{max-width:6.5rem}' +
      '}';
    document.head.appendChild(css);
  }

  /* ---- start ------------------------------------------------------------- */
  function boot() {
    injectStyle();
    buildSwitch();
    startObserver();
    if (lang === 'en') apply(); else syncSwitch();
    oznamAutoJazyk();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
