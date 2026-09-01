# DECOY — tehnička specifikacija za izložbeni predlog

Dokument opisuje interaktivnu galerijsku instalaciju **DECOY** onako kako je sistem izgrađen: jedna fizička slika, telefoni posetilaca i devet portretnih tableta. Namenjen je galeriji, kustosu i tehničkoj ekipi prostora.

Jezik posetioca: **engleski kao podrazumevani**, sa prekidačem na **srpski** (latinica). Naslov na telefonu: *What do you see?* / *Šta ti vidiš?*

---

## 1. Koncept

Posetilac stoji pred **jednom originalnom slikom** i na svom telefonu, jednom, piše šta vidi. Taj tekst jednom tumači model za generisanje slike. Nastala slika se javno prikazuje na jednom od **devet tableta** pored originala.

Ključno pravilo instalacije:

> Model **nikada** ne dobija fotografiju originalne slike. Dobija **samo** pisani opis posetioca i jednu fiksnu, skrivenu instrukciju na serverskoj strani.

Lanac:

**fizička slika → ljudsko posmatranje → pisani opis → interpretacija veštačke inteligencije → generisana slika → jedan od devet tableta**

Instalacija ne traži „tačan“ opis. Subjektivnost, praznine i nesigurnost u tekstu ostaju deo materijala.

---

## 2. Šta posetilac vidi i radi

### 2.1 Ulaz

Na zidu pored slike: **QR kod** koji vodi na HTTPS adresu posetilačke aplikacije (`https://decoyexhibit.download`). Nije potrebna instalacija aplikacije. Radi u mobilnom pregledaču (iPhone i Android).

### 2.2 Tok na telefonu

1. Početni ekran na engleskom; opcija **EN / SR**.
2. Kratko objašnjenje: jedna prilika da se opiše slika; opis postaje deo instalacije; učešće je vezano za prostor izložbe.
3. Prihvatanje **Uslova korišćenja i Obaveštenja o privatnosti**.
4. Potvrda prisustva u prostoru (lokacija telefona; vidi odeljak 7).
5. Polje za opis: *Opišite šta vidite / Describe what you see.* Nema tačnog odgovora.
6. Potvrda slanja: posle slanja opis se **ne može menjati** niti poslati ponovo sa istog anonimnog identiteta pregledača.
7. Zahvalnica: *Hvala. Pogledajte ekrane.* Na telefonu **nema** privatnog rezultata, pregleda slike, deljenja ni ponovnog generisanja.

Ako je dnevni kapacitet popunjen, telefon prikazuje poruku da je instalacija tog dana dostigla maksimalan broj novih interpretacija.

### 2.3 Šta posetilac namerno ne vidi

- nalog, ime, e-poštu
- fotografisanje ili slanje originala
- sopstvenu generisanu sliku na telefonu
- status generisanja, greške modela, red čekanja
- tehničke ekrane tableta

---

## 3. Šta vidi publika u sali

Devet **portretnih** Android tableta, uvek uključenih, u immersivnom prikazu preko celog ekrana.

Svaki tablet prikazuje **samo**:

- crni ekran, ili
- trenutnu generisanu sliku, sa blagim prelazom (~1,5 s).

Interna stanja (preuzimanje posla, generisanje, mreža, greška) **nisu vidljiva**. Ako tablet padne, nestane struja ili Wi-Fi, prethodna slika ostaje na ekranu; ne zamenjuje je logo, spinner ni poruka o grešci.

Posetioci **ne dodiruju** tablete. Održavanje: sedam dodira u gornjem levom uglu u roku od pet sekundi, zatim PIN osoblja.

---

## 4. Prostorni i tehnički zahtevi (tech rider)

### 4.1 Umetnički objekat

- Jedna fizička slika (original), osvetljena kao samostalni rad.
- QR kod u visini očiju, čitljiv sa 1–2 m, sa HTTPS URL-om posetilačke stranice.
- Devet tableta u **portretnoj** orijentaciji, u vizuelnoj vezi sa originalom (niz, rešetka 3×3 ili linija — prema arhitekturi sale). Tačan raspored je kustoska odluka; softver ne zavisi od geometrije zida.

### 4.2 Tableti (preporuka)

| Stavka | Zahtev |
| --- | --- |
| Broj | 9 identičnih uređaja |
| Format | Portret, 10–13″, odnos stranica blizak 2:3 (generisane slike su 1024×1536) |
| OS | Android, sideload APK (nije Play Store) |
| Režim | Fullscreen, keep-screen-on, zaključan portret |
| Napajanje | Stalno napajanje (nije rad na bateriji); kablovi sakriveni |
| Mreža | Stabilan Wi-Fi, stalna veza |
| Zvuk | Isključen |

Jedna APK za sve uređaje. Svaki tablet se jednom provisioninguje kao `tablet-01` … `tablet-09` tajnim tokenom. Kompromitovan uređaj se gasi serverski (`enabled = false`) bez ponovnog objavljivanja aplikacije.

### 4.3 Struja i mreža u sali

- 9× napajanje tableta + rasveta slike; UPS po želji galerije.
- Jedan pouzdan Wi-Fi za tablete (poželjno odvojen od javnog Wi-Fi-ja posetilaca).
- Posetioci koriste **sopstveni mobilni internet ili javni Wi-Fi**; aplikacija je statički sajt + API.
- GPS/lokacija posetioca: u produkciji se proverava da je telefon u radijusu izložbe (podrazumevano **200 m**, tačnost očitavanja do **500 m**). Koordinate se **ne čuvaju**.

### 4.4 Osoblje

Tokom otvaranja: jedna tehnička osoba koja zna da proveri da li su svih devet tableta „online“, da restartuje APK i da javi ako je dnevni kapacitet ili OpenAI limit dostignut. Dnevni rad ne zahteva kustoski moderator sadržaja; neprimereni opisi mogu biti odbijeni na strani servisa za slike i tada se ne prikazuju.

---

## 5. Softverska arhitektura

Sistem je namerno tanak: nema posebnog servera u galeriji, nema CMS-a, nema analytics SDK-a.

| Sloj | Tehnologija | Uloga |
| --- | --- | --- |
| Posetilac | Mobilni veb (React/Vite), Cloudflare Pages | Telefon: jezik, uslovi, opis, zahvalnica |
| Javni domen | `decoyexhibit.download` (+ `www`) | QR kod i ulaz |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions, Realtime) | Sesije, jednokratno slanje, red, skladište slika |
| Generisanje slike | OpenAI Image API, samo sa servera (opciono preko Cloudflare AI Gateway) | Jedna interpretacija po opisu |
| Ekrani | Capacitor Android aplikacija | Heartbeat, preuzimanje posla, keš slike, prikaz |
| Tajne | Samo Edge Function secrets | OpenAI ključ, token gateway-a, servisna uloga baze **nikada** nisu u APK-u ni u veb bundle-u |

Tok posla na serveru:

`queued → assigned → generating → ready → displayed`  
(ili `failed` posle ograničenog broja pokušaja)

Ako tablet nestane pre prikaza, **gotova slika se ne generiše ponovo** — dodeljuje se sledećem podobnom ekranu.

Raspodela na devet ekrana: prvo prazni, zatim najstariji prikaz, zatim stabilan ID. Tableti se smatraju dostupnim ako su uključeni, skoro viđeni na mreži, i nisu zauzeti.

---

## 6. Generisanje slike

- Model (konfigurabilno): `gpt-image-2`
- Format: portret **1024×1536**, **WebP**
- Kvalitet: prvo `low` za probe, zatim `medium` posle vizuelnog odobrenja na fizičkom tabletu
- Prompt: fiksna skrivena instrukcija + sirovi tekst posetioca. Tekst se **ne prevodi, ne sažima i ne prepisuje**.
- Instrukcija modelu između ostalog nalaže: nema natpisa, interfejsa ni okvira; ne pominjati posetioca, veštačku inteligenciju ni original; ne pokušavati da se reproducira neviđeni original.

Kontrola troška:

- najviše **200 novih slanja dnevno** (podesivo)
- globalni razmak između generisanja, podrazumevano **13 s**
- najviše **3 pokušaja** po slanju
- OpenAI ključ živi samo na serveru; billing limit na OpenAI projektu za trajanje izložbe

---

## 7. Identitet, lokacija i privatnost

- **Anonimna** Supabase sesija. Nema naloga, imena, e-pošte.
- **Jedno slanje** po anonimnom identitetu pregledača (baza + atomična funkcija `create_submission_once`).
- Brisanje podataka pregledača, privatni režim ili drugi uređaj mogu omogućiti novo učešće. To je prihvaćeno ograničenje; nema fingerprintinga.
- Lokacija: Haversine na serveru. **Geografska širina i dužina se namerno ne upisuju u bazu.** Važi ograničeno vreme (podrazumevano 60 min) pre slanja opisa.
- Čuva se **pisani opis** i **nastala slika** (privatni bucket; tableti dobijaju kratkotrajni potpisani URL pa keširaju bajtove lokalno).
- Opis se šalje OpenAI-ju radi jednog generisanja. Nastala slika može biti javno prikazana u sali.
- U logovima: ID slanja, ID tableta, prelazi statusa, sanitizovani kodovi grešaka. **Ne** loguju se GPS, pun opis, prompt, base64 slike, IP kao identitet.
- Posetioci ne mogu da čitaju tuđe opise ni hash-eve tableta preko API-ja. Tableti se autentifikuju uređajskim tokenom; u bazi stoji samo SHA-256 hash.

Pravni tekst na telefonu (uslovi + privatnost) je dvojezičan i mora pre javnog otvaranja da sadrži: ime organizatora, naziv izložbe, kontakt, verziju teksta i **konkretnu izjavu o zadržavanju podataka**. Ta izjava se ne izmišlja u softveru — popunjava je organizator.

---

## 8. Tehnički parametri (podrazumevane vrednosti)

| Parametar | Vrednost |
| --- | --- |
| Broj tableta | 9 (`tablet-01` … `tablet-09`) |
| Dužina opisa | 20–2000 karaktera (Unicode) |
| Dnevni kapacitet | 200 slanja |
| Radijus izložbe | 200 m |
| Maks. greška GPS | 500 m |
| Važenje lokacije | 60 min |
| Interval heartbeat tableta | 30 s |
| Prag „online“ | 90 s |
| Rezervni interval preuzimanja posla | 20 s (ako realtime signal izostane) |
| Trajanje lease-a generisanja | 5 min |
| Trajanje lease-a prikaza | 2 min |
| Crossfade | 1500 ms |
| Jezik UI | EN podrazumevano, SR opciono |

---

## 9. Otpornost tokom izložbe

Prioritet je **pouzdanost u sali**, ne dodatne funkcije.

- Nestanak Wi-Fi-ja na tabletu: ostaje poslednja slika; po povratku veze tablet nastavlja heartbeat i preuzimanje.
- Restart tableta: keširana slika se ponovo prikazuje, bez ponovnog zvanja modela.
- Jedan tablet ugašen: ostalih osam radi; poslovi idu na dostupne ekrane.
- OpenAI 429: ponovni pokušaj u okviru limita; prethodna slika na ekranu ostaje.
- OpenAI odbijanje sadržaja: slanje `failed`, slika se ne prikazuje.
- Svi tableti offline: red na serveru raste; ekrani ostaju kakvi jesu.
- Dnevni limit: novi posetioci vide poruku o kapacitetu; već prikazane slike ostaju.

Nema posebnog računara u sali. Oporavak je: struja, Wi-Fi, po potrebi restart APK-a.

---

## 10. Šta ovaj sistem namerno nije

- nije aplikacija za nalog ili mailing listu
- nije upload fotografije originala
- nije „AI filter“ preko kamere
- nije privatni generator slika na telefonu
- nije CMS za kustosko biranje koja se slika vidi
- nije analitika posetilaca
- nije višekorišćenje ili editovanje opisa

---

## 11. Šta galerija obezbeđuje, a šta donosi instalacija

**Galerija / prostor**

- sala, rasveta originala, postament/zid za 9 tableta
- struja i skriveno kabliranje
- Wi-Fi za tablete
- dozvola za QR i eventualni zidni natpis
- saglasnost sa uslovima privatnosti i izjavom o zadržavanju podataka

**Instalacija (produkcija)**

- originalna slika
- 9 provisionisanih tableta sa APK-om
- posetilački sajt na HTTPS domenu
- backend, red, generisanje slika, privatno skladište
- QR kod ka javnom URL-u
- tehnička proba: GPS u/van sale, iPhone + Android, raspodela na 9 ekrana, nestanak mreže, reboot

**Organizator pre otvaranja mora da zatvori**

- GPS koordinate sale (ne `DEV_SKIP_LOCATION`)
- OpenAI ključ i billing limit; isključiti mock generisanje
- ime umetnika/organizatora, naziv izložbe, kontakt, retention tekst
- vizuelno odobrenje kvaliteta slike na fizičkom tabletu

---

## 12. Jedna rečenica za predlog

**DECOY** je interaktivna instalacija u kojoj original ostaje nevidljiv mašini: posetioci jednom, sa telefona, pišu šta vide, a devet portretnih ekrana u sali pokazuje kako veštačka inteligencija tumači njihov jezik — nikad samu sliku.
