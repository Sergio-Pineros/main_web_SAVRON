import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const formData = await req.formData();
        
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const bio = formData.get('bio') as string;
        const instagram_url = formData.get('instagram_url') as string;
        const services = formData.get('services') as string; // Comma separated list
        const image = formData.get('image') as File | null;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        let image_url = null;

        // Handle Image Upload if provided
        if (image && image.size > 0) {
            const buffer = Buffer.from(await image.arrayBuffer());
            const fileExt = image.name.split('.').pop();
            const fileName = `${Date.now()}_${name.replace(/\s+/g, '_').toLowerCase()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('barbers')
                .upload(fileName, buffer, {
                    contentType: image.type,
                    upsert: false
                });

            if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabase.storage
                    .from('barbers')
                    .getPublicUrl(fileName);
                image_url = publicUrl;
            } else {
                console.warn('Image upload failed (bucket might not exist). Continuing without image:', uploadError);
            }
        }

        // Insert Barber
        // We set active: false so the admin must approve them before they show up publicly.
        const { data: newBarber, error: insertError } = await supabase
            .from('barbers')
            .insert({
                name,
                email,
                phone: phone || null,
                bio: bio || null,
                instagram_url: instagram_url || null,
                image_url: image_url,
                active: false 
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to register barber profile' }, { status: 500 });
        }

        return NextResponse.json({ success: true, barber: newBarber });

    } catch (err) {
        console.error('Registration API error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
