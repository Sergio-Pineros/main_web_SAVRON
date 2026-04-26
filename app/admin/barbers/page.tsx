"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Scissors, Copy, Check, ToggleLeft, ToggleRight, UserCheck, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Barber } from '@/lib/types';

export default function AdminBarbersPage() {
    const supabase = createClient();
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const [copiedReg, setCopiedReg] = useState(false);

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

    const approveBarber = async (barber: Barber) => {
        await supabase.from('barbers').update({ active: true }).eq('id', barber.id);
        setBarbers(prev => prev.map(b => b.id === barber.id ? { ...b, active: true } : b));
    };

    const copyBookingLink = (slug: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const copyRegistrationLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/barber/register`);
        setCopiedReg(true);
        setTimeout(() => setCopiedReg(false), 2000);
    };

    const active  = barbers.filter(b => b.active);
    const pending = barbers.filter(b => !b.active);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-5 h-5 border-2 border-savron-green/30 border-t-savron-green rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-heading text-3xl uppercase tracking-widest text-white">Barbers</h1>
                    <p className="text-savron-silver text-sm mt-1">{active.length} active · {pending.length} pending approval</p>
                </div>
                <button
                    onClick={copyRegistrationLink}
                    className="flex items-center gap-2 px-4 py-2.5 border border-white/10 text-[10px] uppercase tracking-widest text-savron-silver hover:text-white hover:border-white/25 transition-all"
                >
                    {copiedReg ? <Check className="w-3 h-3 text-savron-green" /> : <LinkIcon className="w-3 h-3" />}
                    {copiedReg ? 'Link Copied!' : 'Copy Registration Link'}
                </button>
            </div>

            {/* Pending approvals */}
            {pending.length > 0 && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/70 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 inline-block" />
                        Pending Approval ({pending.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.map(barber => (
                            <div key={barber.id} className="bg-savron-grey border border-amber-500/15 rounded-savron p-5 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-savron-charcoal border border-white/10 relative shrink-0">
                                        {barber.image_url && <Image src={barber.image_url} alt={barber.name} fill className="object-cover" />}
                                        {!barber.image_url && <Scissors className="w-4 h-4 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-heading uppercase tracking-wider text-sm">{barber.name}</h3>
                                        {barber.email && <p className="text-savron-silver/50 text-xs truncate">{barber.email}</p>}
                                        {barber.phone && <p className="text-savron-silver/40 text-xs">{barber.phone}</p>}
                                    </div>
                                </div>
                                {barber.bio && (
                                    <p className="text-savron-silver/50 text-xs leading-relaxed line-clamp-2">{barber.bio}</p>
                                )}
                                {barber.specialties && barber.specialties.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {barber.specialties.map((s, i) => (
                                            <span key={i} className="text-[9px] uppercase tracking-wider text-savron-silver/60 bg-savron-charcoal px-2 py-0.5 border border-white/5">{s}</span>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => approveBarber(barber)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-widest bg-savron-green/10 border border-savron-green/20 text-savron-green hover:bg-savron-green/20 transition-all"
                                >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Approve & Activate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active barbers */}
            <div>
                {pending.length > 0 && (
                    <p className="text-[10px] uppercase tracking-[0.3em] text-savron-silver/40 mb-4">Active Team</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {active.map(barber => (
                        <div key={barber.id} className="bg-savron-grey border border-white/5 rounded-savron p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-savron-charcoal border border-white/10 relative shrink-0">
                                    {barber.image_url
                                        ? <Image src={barber.image_url} alt={barber.name} fill className="object-cover" />
                                        : <Scissors className="w-5 h-5 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    }
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
                                    className={cn("flex items-center gap-2 text-xs uppercase tracking-wider transition-all", "text-green-400 hover:text-red-400")}
                                >
                                    <ToggleRight className="w-4 h-4" />
                                    Active
                                </button>
                                <button
                                    onClick={() => copyBookingLink(barber.slug)}
                                    className="flex items-center gap-1 text-xs uppercase tracking-wider text-savron-silver hover:text-white transition-all"
                                >
                                    {copiedSlug === barber.slug ? <Check className="w-3 h-3 text-savron-green" /> : <Copy className="w-3 h-3" />}
                                    {copiedSlug === barber.slug ? 'Copied' : 'Booking Link'}
                                </button>
                            </div>
                        </div>
                    ))}

                    {active.length === 0 && (
                        <p className="text-savron-silver/30 text-sm col-span-3">No active barbers yet. Approve pending applications above.</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
