export type CopyPair = {
  sr: string;
  en: string;
};

export const copy = {
  introTitle: {
    sr: "ŠTA TI VIDIŠ?",
    en: "WHAT DO YOU SEE?",
  },
  introBody1: {
    sr: "Imate jednu priliku da opišete sliku pred sobom.",
    en: "You have one opportunity to describe the painting in front of you.",
  },
  introBody2: {
    sr: "Vaš opis će biti interpretiran pomoću veštačke inteligencije i postaće deo ove instalacije.",
    en: "Your description will be interpreted using artificial intelligence and become part of this installation.",
  },
  introBody3: {
    sr: "Za učešće je potrebno da se nalazite u prostoru izložbe.",
    en: "Participation is available only inside the exhibition.",
  },
  termsCheckbox: {
    sr: "Prihvatam Uslove korišćenja i Obaveštenje o privatnosti.",
    en: "I accept the Terms and Privacy Notice.",
  },
  termsLink: {
    sr: "Uslovi korišćenja i Obaveštenje o privatnosti",
    en: "Terms and Privacy Notice",
  },
  continue: {
    sr: "NASTAVI",
    en: "CONTINUE",
  },
  continueWithLocation: {
    sr: "DOZVOLI LOKACIJU I NASTAVI",
    en: "ALLOW LOCATION & CONTINUE",
  },
  locationDeniedTitle: {
    sr: "Pristup lokaciji nije dozvoljen.",
    en: "Location access was not allowed.",
  },
  locationDeniedBody: {
    sr: "Lokacija je potrebna samo da bismo potvrdili da se nalazite u prostoru izložbe. Vaša precizna lokacija se ne čuva.",
    en: "Location is used only to confirm that you are at the exhibition. Your precise location is not stored.",
  },
  tryAgain: {
    sr: "POKUŠAJ PONOVO",
    en: "TRY AGAIN",
  },
  locationOutside: {
    sr: "Učešće je dostupno samo u prostoru izložbe.",
    en: "Participation is available only inside the exhibition.",
  },
  locationInaccurate: {
    sr: "Trenutno nije moguće pouzdano utvrditi lokaciju. Molimo pokušajte ponovo.",
    en: "Your location cannot currently be verified accurately. Please try again.",
  },
  describeTitle: {
    sr: "OPIŠITE ŠTA VIDITE",
    en: "DESCRIBE WHAT YOU SEE",
  },
  describeBody1: {
    sr: "Opišite sliku pred sobom što detaljnije možete.",
    en: "Describe the painting in front of you in as much detail as you can.",
  },
  describeBody2: {
    sr: "Ne postoji tačan odgovor.",
    en: "There is no correct answer.",
  },
  submit: {
    sr: "POŠALJI",
    en: "SUBMIT",
  },
  confirmTitle: {
    sr: "POSLATI OPIS?",
    en: "SUBMIT YOUR DESCRIPTION?",
  },
  confirmBody: {
    sr: "Nakon slanja opis nije moguće izmeniti i ne možete poslati novi.",
    en: "Once submitted, your description cannot be changed and you cannot submit another.",
  },
  back: {
    sr: "NAZAD",
    en: "BACK",
  },
  confirmSubmit: {
    sr: "POŠALJI",
    en: "SUBMIT",
  },
  thanksTitle: {
    sr: "HVALA.",
    en: "THANK YOU.",
  },
  thanksBody1: {
    sr: "Vaš opis je postao deo instalacije.",
    en: "Your description has become part of the installation.",
  },
  thanksBody2: {
    sr: "Pogledajte ekrane.",
    en: "Look toward the screens.",
  },
  tooShort: {
    sr: "Molimo unesite malo detaljniji opis.",
    en: "Please provide a little more detail.",
  },
  networkError: {
    sr: "Veza trenutno nije dostupna. Vaš opis još nije poslat. Pokušajte ponovo.",
    en: "The connection is currently unavailable. Your description has not been submitted. Please try again.",
  },
  capacity: {
    sr: "Instalacija je danas dostigla maksimalan broj novih interpretacija.",
    en: "The installation has reached its maximum number of new interpretations for today.",
  },
  termsTitle: {
    sr: "Uslovi korišćenja i Obaveštenje o privatnosti",
    en: "Terms of Use and Privacy Notice",
  },
  close: {
    sr: "ZATVORI",
    en: "CLOSE",
  },
} as const satisfies Record<string, CopyPair>;

export type CopyKey = keyof typeof copy;
