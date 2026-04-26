import { createClient } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';

/**
 * Get the role of the currently logged-in user.
 * Returns null if not authenticated or role not found.
 */
export async function getUserRole(): Promise<{ role: UserRole; authId: string } | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('auth_id', user.id)
        .single();

    if (!data) return null;
    return { role: data.role as UserRole, authId: user.id };
}

/**
 * Get the barber record for the currently logged-in barber.
 */
export async function getCurrentBarber() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('auth_id', user.id)
        .single();

    return data;
}

/**
 * Get the client record for the currently logged-in client.
 */
export async function getCurrentClient() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('auth_id', user.id)
        .single();

    return data;
}
