# Reading Journal — Supabase verzió

Ez a projekt a korábbi, egyetlen HTML fájlból álló Reading Journal alkalmazás
Supabase adatbázissal, felhasználói fiókokkal és valódi felhő-tárolással
kiegészített változata. A kinézet, a funkciók és a működés ugyanaz maradt —
csak a mentés most már nem a böngészőben, hanem egy igazi adatbázisban
történik, amit bármelyik eszközödről elérsz.

Ez az útmutató úgy készült, mintha most kezdenél webfejlesztéssel foglalkozni.
Minden lépést sorban kövess.

---

## Amire szükséged lesz

- Egy ingyenes [Supabase](https://supabase.com) fiók
- [Node.js](https://nodejs.org) telepítve a gépeden (a "LTS" verziót töltsd le)
- [VS Code](https://code.visualstudio.com) (vagy bármilyen más kódszerkesztő)

---

## 1. lépés — Supabase projekt létrehozása

1. Menj a [supabase.com](https://supabase.com) oldalra, és regisztrálj / jelentkezz be.
2. Kattints a **"New project"** gombra.
3. Adj neki egy nevet (pl. `reading-journal`).
4. Válassz egy jelszót az adatbázisnak — **ezt jegyezd meg**, de a kódban
   sehol nem lesz rá szükség (csak a Supabase saját belső használatára kell).
5. Válaszd ki a hozzád legközelebbi régiót (pl. Frankfurt/EU).
6. Kattints a **"Create new project"** gombra, és várj 1-2 percet, amíg
   a projekt elkészül.

---

## 2. lépés — Az adatbázis-tábla létrehozása (SQL migráció futtatása)

1. A Supabase projektedben a bal oldali menüben kattints az **"SQL Editor"**-ra.
2. Kattints a **"New query"** gombra.
3. Nyisd meg a projektben található `supabase/schema.sql` fájlt, másold ki
   a **teljes tartalmát**, és illeszd be az SQL Editorba.
4. Kattints a **"Run"** gombra (vagy `Ctrl+Enter` / `Cmd+Enter`).
5. Ha minden rendben ment, zöld pipát/sikeres üzenetet kell látnod.

Ellenőrzés: menj a bal oldali menüben a **"Table Editor"**-ra. Látnod kell
három táblát: `profiles`, `books`, `reading_log`.

---

## 3. lépés — Storage bucket létrehozása (könyvborítókhoz)

Ezt is elintézi a fenti SQL script, de ellenőrizzük:

1. A bal oldali menüben kattints a **"Storage"**-ra.
2. Látnod kell egy `covers` nevű bucket-et.
3. Ha esetleg nem jött létre automatikusan, kattints a **"New bucket"**-re,
   nevezd el `covers`-nek, és hagyd **"Public bucket" kikapcsolva** (privát
   legyen) — a hozzáférést a scriptben lévő policy-k szabályozzák.

---

## 4. lépés — Authentication beállítása

1. A bal oldali menüben kattints az **"Authentication"** > **"Providers"**-re.
2. Az **"Email"** provider már alapból be van kapcsolva — ez elég nekünk.
3. Ha azt szeretnéd, hogy regisztráció után **ne kelljen e-mailt megerősíteni**
   (gyorsabb teszteléshez), menj az **Authentication > Settings**-be, és
   kapcsold ki a **"Confirm email"** opciót. Élesben ezt inkább hagyd
   bekapcsolva.

Ennyi — a bejelentkezés/regisztráció/jelszó-visszaállítás a kódban már meg
van írva, nincs több teendőd itt.

---

## 5. lépés — API kulcsok megszerzése

1. A bal oldali menüben kattints a **fogaskerék ikonra** (Project Settings),
   majd az **"API"** menüpontra.
2. Másold ki a következő két értéket:
   - **Project URL** (pl. `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** kulcs (egy hosszú, `eyJ...`-vel kezdődő string)

⚠️ **Csak az "anon public" kulcsot használjuk!** A "service_role" kulcsot
**soha** ne tedd be a kódba — az teljes hozzáférést ad az adatbázishoz,
és csak szerver-oldali, védett környezetben szabad használni.

---

## 6. lépés — `.env` fájl létrehozása

1. A projekt mappájában másold le a `.env.example` fájlt, és nevezd át `.env`-re.
2. Nyisd meg VS Code-ban, és írd be a saját adataidat:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...a-sajat-hosszu-kulcsod...
```

3. Mentsd el a fájlt. (A `.env` a `.gitignore`-ban van, tehát ha később
   feltöltöd GitHub-ra, ez a fájl **nem** fog felkerülni oda — ez szándékos,
   így nem szivárog ki a kulcsod.)

---

## 7. lépés — Csomagok telepítése

1. Nyisd meg a projekt mappáját **VS Code-ban** (`File > Open Folder`).
2. Nyisd meg a beépített terminált (`Terminal > New Terminal`, vagy `` Ctrl+` ``).
3. Írd be:

```bash
npm install
```

Ez letölti a szükséges csomagokat (`vite`, `@supabase/supabase-js`) egy
`node_modules` mappába.

---

## 8. lépés — A projekt elindítása

A terminálban írd be:

```bash
npm run dev
```

Ha minden jól ment, valami ilyesmit fogsz látni:

```
  VITE ready
  ➜  Local:   http://localhost:5173/
```

Kattints a linkre (vagy `Ctrl` + kattintás), és megnyílik az alkalmazás a
böngésződben. Egy bejelentkező/regisztrációs képernyőt kell látnod.

---

## 9. lépés — Regisztráció és bejelentkezés tesztelése

1. Kattints a **"Regisztráció"** fülre.
2. Adj meg egy e-mail címet és egy legalább 6 karakteres jelszót.
3. Kattints a **"Regisztráció"** gombra.
   - Ha kikapcsoltad az e-mail megerősítést (4. lépés), rögtön be is léphetsz.
   - Ha nem, nézd meg a postaládád (vagy a Supabase-ben az
     **Authentication > Users** listát), és erősítsd meg az e-mailt, majd
     jelentkezz be.
4. Sikeres belépés után az alkalmazás fő felülete jelenik meg — üresen,
   hiszen még nincs egyetlen könyved sem.

---

## 10. lépés — Könyv hozzáadásának tesztelése

1. Görgess le az **"Új könyv hozzáadása"** részhez.
2. Töltsd ki a címet (kötelező), és tetszés szerint a többi mezőt.
3. Kattints a **"Hozzáadás a naplóhoz"** gombra.
4. A könyvnek meg kell jelennie a listában / a polcon (attól függően, milyen
   állapotot választottál).
5. Próbáld ki a böngésző frissítését (`F5`) — a könyvnek **meg kell maradnia**,
   hiszen most már valódi adatbázisban van.

---

## 11. lépés — Ellenőrzés a Supabase-ben

1. Menj vissza a Supabase projektedbe.
2. **Table Editor > books** — látnod kell az imént felvett könyvet, sortként.
3. Ha feltöltöttél borítóképet: **Storage > covers** — látnod kell egy
   mappát a felhasználód azonosítójával (UUID), benne a képpel.

Ha ezt látod, minden megfelelően működik: az adatok valóban az adatbázisban
vannak, nem csak a böngésződben.

---

## 12. lépés (opcionális) — Régi adatok importálása

Ha korábban használtad az eredeti (böngészőben tárolt) Reading Journal
verziót, és át szeretnéd hozni a könyveidet:

1. Nyisd meg a **régi** Reading Journal artifactot.
2. Kattints a fejléc alatt megjelenő **"Adatok exportálása (Supabase-verzióhoz)"**
   linkre — ez letölt egy `.json` fájlt a könyveiddel és az olvasási
   naplóddal.
3. Az **új** (Supabase-es) alkalmazásban jelentkezz be, majd kattints a
   fejlécben az **"Adatok importálása"** gombra.
4. Válaszd ki a letöltött `.json` fájlt.
5. Várd meg, amíg végigfut az importálás — a végén látni fogod, hány könyv
   és hány naplóbejegyzés került át.

---

## 13. lépés — Publikálás az internetre

Ha készen állsz arra, hogy bárhonnan elérhető legyen az alkalmazásod, a
legegyszerűbb megoldás a **Vercel** vagy a **Netlify** (mindkettő ingyenes
kis projektekhez):

### Vercel-lel (ajánlott, nagyon egyszerű)

1. Told fel a projektet egy GitHub repóba (`git init`, `git add .`,
   `git commit -m "init"`, majd push egy új GitHub repóba).
2. Menj a [vercel.com](https://vercel.com) oldalra, jelentkezz be GitHub
   fiókkal.
3. Kattints **"Add New… > Project"**, válaszd ki a repódat.
4. A **"Environment Variables"** résznél add meg ugyanazt a két változót,
   amit a `.env` fájlba is beírtál:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Kattints **"Deploy"**-ra. Pár perc múlva kapsz egy élő linket
   (pl. `https://reading-journal-xyz.vercel.app`).

### Fontos: jelszó-visszaállító link beállítása

Ha éles domainen fut az oldal, menj a Supabase-ben az
**Authentication > URL Configuration**-be, és állítsd be a **"Site URL"**-t
a végleges címedre (pl. `https://reading-journal-xyz.vercel.app`) — enélkül
a jelszó-visszaállító e-mailben lévő link rossz helyre fog mutatni.

---

## Projektstruktúra

```
reading-journal-app/
├── index.html                 # A teljes UI (auth képernyő + a régi app markup)
├── src/
│   ├── main.js                 # A teljes alkalmazás-logika (a régi script Supabase-re portolva)
│   ├── style.css                # A teljes, változatlan design (+ auth/import/toast stílusok)
│   ├── lib/
│   │   └── supabaseClient.js    # A Supabase kapcsolat beállítása
│   └── services/
│       ├── authService.js       # Bejelentkezés / regisztráció / jelszó
│       ├── bookService.js       # Könyvek CRUD műveletei
│       ├── readingLogService.js # Olvasáskövető napló CRUD műveletei
│       ├── coverService.js      # Borítókép feltöltés / lekérés (Storage)
│       └── importService.js     # Régi JSON export importálása
├── supabase/
│   └── schema.sql               # Táblák, RLS policy-k, Storage bucket
├── .env.example                 # Minta a .env fájlhoz
└── package.json
```

## Miért így épül fel az adatbázis?

- **`profiles`** — egy sor / felhasználó, ide kerül pl. a kiválasztott
  téma-szín. Automatikusan létrejön regisztrációkor (egy adatbázis-trigger
  csinálja).
- **`books`** — minden könyv egy sor, `user_id` oszloppal, ami megköti,
  kié a könyv. A `genres` oszlop egy Postgres tömb (`text[]`) — mivel egy
  rögzített, kis (11-12 elemű) műfaj-listáról van szó, ez egyszerűbb és
  gyorsabb, mint egy külön `genres` + kapcsolótábla. Ha a jövőben szabadon
  bővíthető, felhasználó-specifikus műfajlistára lenne szükség, érdemes
  lehet később külön táblára váltani — a `bookService.js`-ben egy helyen
  kellene módosítani a `genres` mezőt kezelő logikát.
- **`reading_log`** — egy sor / nap, `(user_id, log_date)` egyedi kulccsal,
  hogy egy napra csak egy bejegyzés lehessen.
- **Row Level Security (RLS)** minden táblán be van kapcsolva, és minden
  policy azt ellenőrzi, hogy `auth.uid() = user_id` — tehát mindenki
  kizárólag a saját adatait látja/módosíthatja, adatbázis-szinten
  kikényszerítve (nem csak a frontend kódjában).
- **Storage**: a borítóképek NEM base64 szövegként vannak az adatbázisban,
  hanem tényleges fájlként a `covers` bucket-ben, `felhasznaló_id/könyv_id.jpg`
  elérési úton. A bucket privát, a policy-k csak a saját mappájához engednek
  hozzáférést mindenkinek, megjelenítéskor pedig egy ideiglenes (24 órás)
  aláírt linket kér le az app.

## Hibaelhárítás

- **"Hiányzó Supabase konfiguráció" hibaüzenet a konzolban** → nincs `.env`
  fájlod, vagy rosszul másoltad be az adatokat. Ellenőrizd a 6. lépést.
- **Regisztráció után nem tudsz bejelentkezni** → valószínűleg be van
  kapcsolva az e-mail megerősítés, és még nem erősítetted meg. Nézd meg a
  postaládád, vagy kapcsold ki átmenetileg a 4. lépésben leírtak szerint.
- **A könyveid nem jelennek meg** → nyisd meg a böngésző fejlesztői konzolját
  (`F12`), és nézd meg, van-e piros hibaüzenet. Leggyakoribb ok: az SQL
  migráció nem futott le teljesen, vagy elgépelted az API kulcsot.
- **Borítókép nem jelenik meg** → ellenőrizd a Supabase Storage-ban, hogy
  tényleg feltöltődött-e a kép, és hogy a `covers` bucket policy-jai
  megegyeznek-e a `schema.sql`-ben lévőkkel.
