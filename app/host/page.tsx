"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Barber, Booking } from '@/lib/types';
import { SERVICE_COLORS, TIME_SLOTS } from '@/lib/services-data';

export default function HostDashboard() {
    const supabase = createClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const fetchBookings = useCallback(async () => {
        const { data } = await supabase
            .from('bookings')
            .select('*')
            .eq('date', dateStr)
            .in('status', ['confirmed', 'completed', 'no_show'])
            .order('time');
        setBookings(data ?? []);
        setLastUpdated(new Date());
    }, [dateStr]);

    // Initial load
    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: barberData } = await supabase
                .from('barbers')
                .select('*')
                .eq('active', true)
                .order('name');
            setBarbers(barberData ?? []);
            await fetchBookings();
            setLoading(false);
        }
        init();
    }, [dateStr]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`host-bookings-${dateStr}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => { fetchBookings(); }
            )
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED');
            });

        return () => { supabase.removeChannel(channel); };
    }, [dateStr, fetchBookings]);

    const getBookingsForBarberAndTime = (barberId: string, time: string): Booking[] => {
        return bookings.filter(
            b => b.barber_id === barberId && b.time === time
        );
    };

    const getServiceColorClass = (serviceName: string) => {
        return SERVICE_COLORS[serviceName] ?? 'bg-white/10 border-white/20 text-white/70';
    };

    const statusDot = (status: Booking['status']) => {
        if (status === 'confirmed') return 'bg-savron-green';
        if (status === 'completed') return 'bg-blue-400';
        if (status === 'no_show') return 'bg-red-400';
        return 'bg-savron-silver';
    };

    const todayBookingCount = bookings.filter(b => b.status === 'confirmed').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const noShowCount = bookings.filter(b => b.status === 'no_show').length;

    return (
        <div className="min-h-screen bg-savron-black flex flex-col">
            {/* Header */}
            <header className="bg-savron-grey border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-heading text-xl uppercase tracking-widest text-white">Host View</h1>
                    <div className="flex items-center gap-1.5">
                        <Wifi className={cn("w-3 h-3", realtimeConnected ? "text-savron-green" : "text-savron-silver/40")} />
                        <span className={cn("text-[10px] uppercase tracking-widest", realtimeConnected ? "text-savron-green" : "text-savron-silver/40")}>
                            {realtimeConnected ? "Live" : "Connecting…"}
                        </span>
                    </div>
                </div>

                {/* Date nav */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedDate(d => subDays(d, 1))}
                        className="p-2 text-savron-silver hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center min-w-[160px]">
                        <p className="text-white font-heading uppercase tracking-widest text-sm">
                            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                        </p>
                        <p className="text-savron-silver text-xs uppercase tracking-widest">
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedDate(d => addDays(d, 1))}
                        className="p-2 text-savron-silver hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {!isToday(selectedDate) && (
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="text-xs uppercase tracking-widest text-savron-green hover:text-white transition-colors px-3 py-1 border border-savron-green/30 rounded-savron"
                        >
                            Today
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-white font-mono text-lg">{todayBookingCount}</p>
                        <p className="text-savron-silver text-[10px] uppercase tracking-widest">Confirmed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-400 font-mono text-lg">{completedCount}</p>
                        <p className="text-savron-silver text-[10px] uppercase tracking-widest">Done</p>
                    </div>
                    <div className="text-center">
                        <p className="text-red-400 font-mono text-lg">{noShowCount}</p>
                        <p className="text-savron-silver text-[10px] uppercase tracking-widest">No-show</p>
                    </div>
                    <button onClick={fetchBookings} className="p-2 text-savron-silver hover:text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-savron-green/30 border-t-savron-green rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-auto">
                    {/* Schedule grid */}
                    <div className="min-w-max">
                        {/* Column headers */}
                        <div className="flex border-b border-white/5 bg-savron-grey sticky top-0 z-10">
                            <div className="w-24 shrink-0 p-4 border-r border-white/5">
                                <span className="text-[10px] uppercase tracking-widest text-savron-silver/40">Time</span>
                            </div>
                            {barbers.map(barber => (
                                <div key={barber.id} className="w-52 shrink-0 p-4 border-r border-white/5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-savron-black relative shrink-0">
                                        {barber.image_url && (
                                            <Image src={barber.image_url} alt={barber.name} fill className="object-cover grayscale" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-heading uppercase tracking-widest leading-none">{barber.name}</p>
                                        <p className="text-savron-silver text-[10px] mt-0.5">{barber.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Time rows */}
                        {TIME_SLOTS.map((time, rowIdx) => (
                            <div
                                key={rowIdx}
                                className={cn(
                                    "flex border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors",
                                    rowIdx % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                                )}
                            >
                                {/* Time label */}
                                <div className="w-24 shrink-0 p-4 border-r border-white/5 flex items-start">
                                    <span className="text-savron-silver/50 text-xs font-mono">{time}</span>
                                </div>

                                {/* Barber cells */}
                                {barbers.map(barber => {
                                    const cellBookings = getBookingsForBarberAndTime(barber.id, time);
                                    return (
                                        <div key={barber.id} className="w-52 shrink-0 p-2 border-r border-white/5 min-h-[80px]">
                                            {cellBookings.map(booking => (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, scale: 0.96 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={cn(
                                                        "p-2.5 rounded-savron border text-xs space-y-1 mb-1",
                                                        getServiceColorClass(booking.service)
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium truncate">{booking.client_name ?? 'Walk-in'}</span>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(booking.status))} />
                                                    </div>
                                                    <p className="opacity-70 truncate">{booking.service}</p>
                                                    {booking.duration && (
                                                        <p className="opacity-50 text-[10px]">{booking.duration}</p>
                                                    )}
                                                    {booking.client_phone && (
                                                        <p className="opacity-50 text-[10px] font-mono">{booking.client_phone}</p>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="sticky bottom-0 bg-savron-black border-t border-white/5 px-6 py-3 flex items-center gap-6 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest text-savron-silver/40">Legend:</span>
                        {Object.entries(SERVICE_COLORS).map(([name, cls]) => (
                            <div key={name} className="flex items-center gap-2">
                                <div className={cn("w-2.5 h-2.5 rounded-full border", cls)} />
                                <span className="text-[10px] text-savron-silver/60 uppercase tracking-widest">{name}</span>
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-savron-green" /><span className="text-[10px] text-savron-silver/60 uppercase tracking-widest">Confirmed</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[10px] text-savron-silver/60 uppercase tracking-widest">Done</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-savron-silver/60 uppercase tracking-widest">No-show</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
