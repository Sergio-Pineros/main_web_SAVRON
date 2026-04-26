import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function buildSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function uniqueSlug(supabase: ReturnType<typeof getSupabaseAdmin>, base: string): Promise<string> {
    let candidate = base;
    let n = 2;
    while (true) {
        const { data } = await supabase.from('barbers').select('id').eq('slug', candidate).maybeSingle();
        if (!data) return candidate;
        candidate = `${base}-${n++}`;
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const formData = await req.formData();

        const name          = (formData.get('name')          as string | null)?.trim();
        const email         = (formData.get('email')         as string | null)?.trim();
        const phone         = (formData.get('phone')         as string | null)?.trim() || null;
        const bio           = (formData.get('bio')           as string | null)?.trim() || null;
        const instagram_url = (formData.get('instagram_url') as string | null)?.trim() || null;
        const specialties   = (formData.get('specialties')   as string | null)?.trim() || null;
        const image         = formData.get('image') as File | null;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const slug = await uniqueSlug(supabase, buildSlug(name));

        let image_url: string | null = null;
        if (image && image.size > 0) {
            const buffer = Buffer.from(await image.arrayBuffer());
            const ext    = image.name.split('.').pop();
            const fileName = `${Date.now()}_${slug}.${ext}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('barbers')
                .upload(fileName, buffer, { contentType: image.type, upsert: false });

            if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabase.storage.from('barbers').getPublicUrl(fileName);
                image_url = publicUrl;
            } else {
                console.warn('Image upload failed (bucket may not exist yet):', uploadError?.message);
            }
        }

        const specialtiesArray = specialties
            ? specialties.split(',').map(s => s.trim()).filter(Boolean)
            : null;

        const { data: newBarber, error: insertError } = await supabase
            .from('barbers')
            .insert({
                name,
                slug,
                email,
                phone,
                bio,
                instagram_url,
                image_url,
                specialties: specialtiesArray,
                active: false,   // admin must approve before barber goes live
                role: 'Barber',
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to save profile', detail: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, barber: newBarber });

    } catch (err) {
        console.error('Registration API error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
