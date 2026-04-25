"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Scissors, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Barber } from '@/lib/types';

export default function AdminBarbersPage() {
    const supabase = createClient();
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('barbers').select('*').order('created_at');
            if (data) setBarbers(data);
            setLoading(false);
        }
        load();
    }, []);

    const toggleActive = async (barber: Barber) => {
        const newActive = !barber.active;
        await supabase.from('barbers').update({ active: newActive }).eq('id', barber.id);
        setBarbers(prev => prev.map(b => b.id === barber.id ? { ...b, active: newActive } : b));
    };

    const copyLink = (slug: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-5 h-5 border-2 border-savron-green/30 border-t-savron-green rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-3xl uppercase tracking-widest text-white">Barbers</h1>
                    <p className="text-savron-silver text-sm mt-1">{barbers.length} barbers on the team</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {barbers.map(barber => (
                    <div key={barber.id} className={cn("bg-savron-grey border rounded-savron p-6 space-y-4 transition-all", barber.active ? "border-white/5" : "border-red-500/20 opacity-50")}>
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-savron-charcoal border border-white/10 relative shrink-0">
                                {barber.image_url && <Image src={barber.image_url} alt={barber.name} fill className="object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-heading uppercase tracking-wider">{barber.name}</h3>
                                <p className="text-savron-green text-xs uppercase tracking-widest">{barber.role}</p>
                                {barber.email && <p className="text-savron-silver/50 text-xs mt-1 truncate">{barber.email}</p>}
                            </div>
                        </div>

                        {barber.specialties && barber.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {barber.specialties.map((s, i) => (
                                    <span key={i} className="text-[10px] uppercase tracking-wider text-savron-silver bg-savron-charcoal px-2 py-1 border border-white/5 rounded-savron">{s}</span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <button
                                onClick={() => toggleActive(barber)}
                                className={cn("flex items-center gap-2 text-xs uppercase tracking-wider transition-all", barber.active ? "text-green-400" : "text-red-400")}
                            >
                                {barber.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                {barber.active ? 'Active' : 'Inactive'}
                            </button>

                            <button
                                onClick={() => copyLink(barber.slug)}
                                className="flex items-center gap-1 text-xs uppercase tracking-wider text-savron-silver hover:text-white transition-all"
                            >
                                {copiedSlug === barber.slug ? <Check className="w-3 h-3 text-savron-green" /> : <Copy className="w-3 h-3" />}
                                {copiedSlug === barber.slug ? 'Copied' : 'Booking Link'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
