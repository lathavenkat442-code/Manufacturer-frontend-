
import { createClient } from '@supabase/supabase-js';

// INSTRUCTIONS FOR SUPABASE SETUP:
// 1. Go to https://supabase.com and create a new project.
// 2. Get your URL and ANON KEY from Project Settings -> API
// 3. Create a .env file in your project root and add:
//    VITE_SUPABASE_URL=https://mlorvufxszeapwxldios.supabase.co
//    VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sb3J2dWZ4c3plYXB3eGxkaW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzIzMDYsImV4cCI6MjA4ODQ0ODMwNn0.9-ouCYfyx94POXOp1d62RPO9d2iQTIUMKUdk0TKDqVY

const env = (import.meta as any).env || {};
const envUrl = env.VITE_SUPABASE_URL;
const envKey = env.VITE_SUPABASE_ANON_KEY;

// Fallback: Check LocalStorage (allows users to input keys in UI if .env is missing)
const localUrl = localStorage.getItem('viyabaari_supabase_url');
const localKey = localStorage.getItem('viyabaari_supabase_key');

let rawUrl = envUrl || localUrl;
const rawKey = envKey || localKey;

// Validation Helper
const isValidUrl = (url: string | null | undefined) => {
  if (!url) return false;
  try {
     return url.startsWith('http://') || url.startsWith('https://');
  } catch (e) {
     return false;
  }
};

// Attempt to fix common URL issues (missing protocol) for the check
if (rawUrl && !rawUrl.startsWith('http') && rawUrl.includes('.')) {
    rawUrl = `https://${rawUrl}`;
}

const isConfigValid = isValidUrl(rawUrl) && rawKey && rawKey !== 'undefined';

export const isSupabaseConfigured = !!isConfigValid;

if (!isSupabaseConfigured) {
  console.warn("Viyabaari: Supabase credentials missing or invalid. Online features will be disabled.");
}

// Initialize the client safely. 
// If URL is invalid, use a valid placeholder so the app doesn't crash on boot.
const safeUrl = isConfigValid ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = isConfigValid ? rawKey : 'placeholder';

export const supabase = createClient(safeUrl, safeKey);

// Helper to save config from UI with sanitization
export const saveSupabaseConfig = (url: string, key: string) => {
    if (!url || !key) return;
    
    let cleanUrl = url.trim();
    // Auto-append https if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
    }

    localStorage.setItem('viyabaari_supabase_url', cleanUrl);
    localStorage.setItem('viyabaari_supabase_key', key.trim());
    window.location.reload();
};

export const resetSupabaseConfig = () => {
    localStorage.removeItem('viyabaari_supabase_url');
    localStorage.removeItem('viyabaari_supabase_key');
    window.location.reload();
};
