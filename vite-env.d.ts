// Reference to vite/client removed to fix type definition error

interface Window {
  process: any;
}

interface WindowEventMap {
  'beforeinstallprompt': any;
  'appinstalled': any;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
