import { copy } from "../copy/index.ts";

function env(name: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

const organizer = env("VITE_ARTIST_OR_ORGANIZER_NAME", "[ARTIST_OR_ORGANIZER_NAME]");
const exhibition = env("VITE_EXHIBITION_NAME", "[EXHIBITION_NAME]");
const email = env("VITE_CONTACT_EMAIL", "[CONTACT_EMAIL]");
const termsVersion = env("VITE_TERMS_VERSION", "1.0");
const retention = env(
  "VITE_DATA_RETENTION_DESCRIPTION",
  "[REQUIRED BEFORE PUBLIC LAUNCH: DATA_RETENTION_DESCRIPTION]",
);

export const termsMeta = {
  organizer,
  exhibition,
  email,
  termsVersion,
  retention,
};

export const termsParagraphsSr: string[] = [
  `Ovo obaveštenje se odnosi na učešće u instalaciji „${exhibition}“, koju organizuje ${organizer}. Verzija teksta: ${termsVersion}.`,
  "Učešće je dobrovoljno. Možete odustati pre slanja opisa tako što napustite stranicu. Nakon slanja, opis se ne može izmeniti niti poslati ponovo sa istog anonimnog identiteta pregledača.",
  "Lokacija se traži isključivo da bi se potvrdilo da se fizički nalazite u prostoru izložbe. Precizna geografska širina i dužina se namerno ne čuvaju u ovoj aplikaciji.",
  "Čuva se vaš pisani opis. Taj opis se šalje usluzi OpenAI radi generisanja slike veštačkom inteligencijom. Nastala slika može biti javno prikazana kao deo instalacije na fizičkim ekranima u galeriji.",
  "Ne unosite lične, kontakt ili osetljive podatke. Ne tražimo ime, e-poštu, nalog niti fotografiju.",
  "Neprimereni opisi mogu biti odbijeni od strane usluge veštačke inteligencije i tada neće biti prikazani.",
  "Dozvoljen je jedan slanje po anonimnom identitetu pregledača. Brisanje podataka pregledača, privatni režim ili drugi uređaj mogu omogućiti novo učešće.",
  `Zadržavanje podataka: ${retention}`,
  `Kontakt organizatora: ${email}`,
];

export const termsParagraphsEn: string[] = [
  `This notice applies to participation in the installation “${exhibition}”, organised by ${organizer}. Text version: ${termsVersion}.`,
  "Participation is voluntary. You may leave before submitting a description. After submission, the description cannot be changed and you cannot submit another from the same anonymous browser identity.",
  "Location is requested only to verify physical presence at the exhibition. Precise latitude and longitude are not intentionally stored by this application.",
  "Your written description is stored. That written description is sent to OpenAI for AI image generation. The resulting AI image can be publicly displayed as part of the installation on the physical gallery screens.",
  "Do not enter personal or sensitive information. We do not ask for a name, email, account, or photograph.",
  "Inappropriate submissions may be rejected by the AI service and will not be displayed.",
  "One submission is allowed per anonymous browser identity. Clearing browser data, using a private window, or another device may allow participation again.",
  `Data retention: ${retention}`,
  `Organiser contact: ${email}`,
];

export { copy };
