import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both legacy anon key and new publishable key formats
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Use a valid placeholder URL during build/prerender when env vars aren't configured
    const url = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
    const key = supabaseKey && supabaseKey.length > 10 ? supabaseKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

    return createBrowserClient(url, key);
}
