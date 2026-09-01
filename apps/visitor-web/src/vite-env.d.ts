/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_ARTIST_OR_ORGANIZER_NAME: string;
  readonly VITE_EXHIBITION_NAME: string;
  readonly VITE_CONTACT_EMAIL: string;
  readonly VITE_TERMS_VERSION: string;
  readonly VITE_DATA_RETENTION_DESCRIPTION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
