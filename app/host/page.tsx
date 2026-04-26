"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
    format, addDays, subDays, isToday, isSameMonth,
    startOfWeek, endOfWeek, eachDayOfInterval,
    startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Barber, Booking } from '@/lib/types';
import { SERVICE_COLORS, TIME_SLOTS } from '@/lib/services-data';

type CalView = 'day' | 'week' | 'month';

export default function HostDashboard() {
    const supabase = createClient();
    const [view, setView] = useState<CalView>('day');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const [rangeStart, rangeEnd] = useMemo(() => {
        if (view === 'day') {
            const d = format(selectedDate, 'yyyy-MM-dd');
            return [d, d];
        }
        if (view === 'week') {
            return [
                format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            ];
        }
        return [
            format(startOfMonth(selectedDate), 'yyyy-MM-dd'),
            format(endOfMonth(selectedDate), 'yyyy-MM-dd'),
        ];
    }, [view, selectedDate]);

    const fetchBookings = useCallback(async () => {
        const { data } = await supabase
            .from('bookings')
            .select('*')
            .gte('date', rangeStart)
            .lte('date', rangeEnd)
            .in('status', ['confirmed', 'completed', 'no_show'])
            .order('time');
        setBookings(data ?? []);
    }, [rangeStart, rangeEnd]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: barberData } = await supabase
                .from('barbers').select('*').eq('active', true).order('name');
            setBarbers(barberData ?? []);
            await fetchBookings();
            setLoading(false);
        }
        init();
    }, [rangeStart, rangeEnd]);

    useEffect(() => {
        const channel = supabase
            .channel(`host-${rangeStart}-${rangeEnd}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
            .subscribe(status => setRealtimeConnected(status === 'SUBSCRIBED'));
        return () => { supabase.removeChannel(channel); };
    }, [rangeStart, rangeEnd, fetchBookings]);

    // Navigation
    const prev = () => {
        if (view === 'day')   setSelectedDate(d => subDays(d, 1));
        if (view === 'week')  setSelectedDate(d => subWeeks(d, 1));
        if (view === 'month') setSelectedDate(d => subMonths(d, 1));
    };
    const next = () => {
        if (view === 'day')   setSelectedDate(d => addDays(d, 1));
        if (view === 'week')  setSelectedDate(d => addWeeks(d, 1));
        if (view === 'month') setSelectedDate(d => addMonths(d, 1));
    };

    // Header label
    const headingLabel = (() => {
        if (view === 'day')   return isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE');
        if (view === 'week') {
            const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
            return format(ws, 'MMM') === format(we, 'MMM')
                ? format(ws, 'MMMM yyyy')
                : `${format(ws, 'MMM')} – ${format(we, 'MMM yyyy')}`;
        }
        return format(selectedDate, 'MMMM yyyy');
    })();

    const subLabel = (() => {
        if (view === 'day')   return format(selectedDate, 'MMMM d, yyyy');
        if (view === 'week') {
            const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
            return `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`;
        }
        return `${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`;
    })();

    // Helpers
    const bookingsForBarberTime = (barberId: string, time: string) =>
        bookings.filter(b => b.barber_id === barberId && b.time === time);

    const bookingsForDayTime = (day: Date, time: string) => {
        const d = format(day, 'yyyy-MM-dd');
        return bookings.filter(b => b.date === d && b.time === time);
    };

    const bookingsForDay = (day: Date) => {
        const d = format(day, 'yyyy-MM-dd');
        return bookings.filter(b => b.date === d);
    };

    const svcColor = (s: string) => SERVICE_COLORS[s] ?? 'bg-white/10 border-white/20 text-white/70';

    const statusDot = (s: Booking['status']) =>
        s === 'confirmed' ? 'bg-savron-green' : s === 'completed' ? 'bg-blue-400' : s === 'no_show' ? 'bg-red-400' : 'bg-savron-silver';

    const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
    const completed  = bookings.filter(b => b.status === 'completed').length;
    const noShow     = bookings.filter(b => b.status === 'no_show').length;

    const weekDays = eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end:   endOfWeek(selectedDate,   { weekStartsOn: 1 }),
    });

    const calDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
        end:   endOfWeek(endOfMonth(selectedDate),     { weekStartsOn: 1 }),
    });

    return (
        <div className="min-h-screen bg-savron-black flex flex-col">

            {/* ── Header ── */}
            <header className="bg-savron-grey border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 gap-4 flex-wrap">

                {/* Left: title + live + view switcher */}
                <div className="flex items-center gap-4">
                    <h1 className="font-heading text-xl uppercase tracking-widest text-white">Host View</h1>
                    <div className="flex items-center gap-1.5">
                        <Wifi className={cn("w-3 h-3", realtimeConnected ? "text-savron-green" : "text-savron-silver/40")} />
                        <span className={cn("text-[10px] uppercase tracking-widest", realtimeConnected ? "text-savron-green" : "text-savron-silver/40")}>
                            {realtimeConnected ? "Live" : "Connecting…"}
                        </span>
                    </div>

                    {/* View toggle */}
                    <div className="flex border border-white/10 rounded-savron overflow-hidden">
                        {(['day', 'week', 'month'] as CalView[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] uppercase tracking-widest transition-all",
                                    view === v
                                        ? "bg-savron-green/15 text-savron-green"
                                        : "text-savron-silver hover:text-white hover:bg-white/5"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Centre: date nav */}
                <div className="flex items-center gap-3">
                    <button onClick={prev} className="p-2 text-savron-silver hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center min-w-[160px]">
                        <p className="text-white font-heading uppercase tracking-widest text-sm">{headingLabel}</p>
                        <p className="text-savron-silver text-xs uppercase tracking-widest">{subLabel}</p>
                    </div>
                    <button onClick={next} className="p-2 text-savron-silver hover:text-white transition-colors">
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

                {/* Right: stats */}
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-white font-mono text-lg">{confirmed}</p>
                        <p className="text-savron-silver text-[10px] uppercase tracking-widest">Confirmed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-400 font-mono text-lg">{completed}</p>
                        <p className="text-savron-silver text-[10px] uppercase tracking-widest">Done</p>
                    </div>
                    <div className="text-center">
                        <p className="text-red-400 font-mono text-lg">{noShow}</p>
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
                <>
                    {/* ══════════════════════════════════════
                        DAY VIEW
                    ══════════════════════════════════════ */}
                    {view === 'day' && (
                        <div className="flex-1 overflow-auto">
                            <div className="min-w-max">
                                {/* Barber column headers */}
                                <div className="flex border-b border-white/5 bg-savron-grey sticky top-0 z-10">
                                    <div className="w-24 shrink-0 p-4 border-r border-white/5">
                                        <span className="text-[10px] uppercase tracking-widest text-savron-silver/40">Time</span>
                                    </div>
                                    {barbers.map(barber => (
                                        <div key={barber.id} className="w-52 shrink-0 p-4 border-r border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-savron-black relative shrink-0">
                                                {barber.image_url && <Image src={barber.image_url} alt={barber.name} fill className="object-cover grayscale" />}
                                            </div>
                                            <div>
                                                <p className="text-white text-xs font-heading uppercase tracking-widest leading-none">{barber.name}</p>
                                                <p className="text-savron-silver text-[10px] mt-0.5">{barber.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {TIME_SLOTS.map((time, i) => (
                                    <div key={i} className={cn("flex border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors", i % 2 !== 0 && "bg-white/[0.01]")}>
                                        <div className="w-24 shrink-0 p-4 border-r border-white/5 flex items-start">
                                            <span className="text-savron-silver/50 text-xs font-mono">{time}</span>
                                        </div>
                                        {barbers.map(barber => {
                                            const cells = bookingsForBarberTime(barber.id, time);
                                            return (
                                                <div key={barber.id} className="w-52 shrink-0 p-2 border-r border-white/5 min-h-[80px]">
                                                    {cells.map(b => (
                                                        <motion.div key={b.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                                            className={cn("p-2.5 rounded-savron border text-xs space-y-1 mb-1", svcColor(b.service))}>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-medium truncate">{b.client_name ?? 'Walk-in'}</span>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(b.status))} />
                                                            </div>
                                                            <p className="opacity-70 truncate">{b.service}</p>
                                                            {b.duration && <p className="opacity-50 text-[10px]">{b.duration}</p>}
                                                            {b.client_phone && <p className="opacity-50 text-[10px] font-mono">{b.client_phone}</p>}
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

                    {/* ══════════════════════════════════════
                        WEEK VIEW
                    ══════════════════════════════════════ */}
                    {view === 'week' && (
                        <div className="flex-1 overflow-auto">
                            <div className="min-w-max">
                                {/* Day column headers */}
                                <div className="flex border-b border-white/5 bg-savron-grey sticky top-0 z-10">
                                    <div className="w-24 shrink-0 p-4 border-r border-white/5">
                                        <span className="text-[10px] uppercase tracking-widest text-savron-silver/40">Time</span>
                                    </div>
                                    {weekDays.map(day => {
                                        const count = bookingsForDay(day).length;
                                        return (
                                            <div
                                                key={day.toISOString()}
                                                onClick={() => { setSelectedDate(day); setView('day'); }}
                                                className={cn(
                                                    "w-44 shrink-0 p-3 border-r border-white/5 text-center cursor-pointer hover:bg-white/5 transition-colors",
                                                    isToday(day) && "bg-savron-green/5"
                                                )}
                                            >
                                                <p className={cn("text-xs font-heading uppercase tracking-widest", isToday(day) ? "text-savron-green" : "text-white")}>
                                                    {format(day, 'EEE')}
                                                </p>
                                                <p className={cn("text-lg font-mono", isToday(day) ? "text-savron-green" : "text-savron-silver/70")}>
                                                    {format(day, 'd')}
                                                </p>
                                                {count > 0 && (
                                                    <span className="text-[9px] text-savron-silver/40 uppercase tracking-widest">{count} appt{count !== 1 ? 's' : ''}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {TIME_SLOTS.map((time, i) => (
                                    <div key={i} className={cn("flex border-b border-white/[0.03]", i % 2 !== 0 && "bg-white/[0.01]")}>
                                        <div className="w-24 shrink-0 p-4 border-r border-white/5 flex items-start">
                                            <span className="text-savron-silver/50 text-xs font-mono">{time}</span>
                                        </div>
                                        {weekDays.map(day => {
                                            const cells = bookingsForDayTime(day, time);
                                            return (
                                                <div
                                                    key={day.toISOString()}
                                                    className={cn(
                                                        "w-44 shrink-0 p-1.5 border-r border-white/5 min-h-[72px]",
                                                        isToday(day) && "bg-savron-green/[0.03]"
                                                    )}
                                                >
                                                    {cells.map(b => (
                                                        <motion.div key={b.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                                            className={cn("p-1.5 rounded-savron border text-[10px] mb-1 space-y-0.5", svcColor(b.service))}>
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="font-medium truncate">{b.client_name ?? 'Walk-in'}</span>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(b.status))} />
                                                            </div>
                                                            <p className="opacity-60 truncate">{b.barber_name ?? b.service}</p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════
                        MONTH VIEW
                    ══════════════════════════════════════ */}
                    {view === 'month' && (
                        <div className="flex-1 overflow-auto p-6">
                            {/* Day-of-week headers */}
                            <div className="grid grid-cols-7 mb-1">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="text-center py-2 text-[10px] uppercase tracking-widest text-savron-silver/40">{d}</div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-savron overflow-hidden">
                                {calDays.map(day => {
                                    const dayBookings = bookingsForDay(day);
                                    const inMonth = isSameMonth(day, selectedDate);
                                    const today = isToday(day);
                                    const MAX = 3;
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onClick={() => { setSelectedDate(day); setView('day'); }}
                                            className={cn(
                                                "min-h-[120px] p-2 bg-savron-black cursor-pointer transition-colors hover:bg-savron-grey/80",
                                                !inMonth && "opacity-25"
                                            )}
                                        >
                                            {/* Date number */}
                                            <div className={cn(
                                                "w-7 h-7 flex items-center justify-center rounded-full text-xs font-mono mb-1.5 transition-colors",
                                                today
                                                    ? "bg-savron-green text-black font-semibold"
                                                    : "text-savron-silver hover:text-white"
                                            )}>
                                                {format(day, 'd')}
                                            </div>

                                            {/* Booking pills */}
                                            <div className="space-y-0.5">
                                                {dayBookings.slice(0, MAX).map(b => (
                                                    <div
                                                        key={b.id}
                                                        className={cn("px-1.5 py-0.5 rounded text-[9px] truncate border leading-tight", svcColor(b.service))}
                                                    >
                                                        {b.time?.replace(':00 ', '').replace(' ', '').toLowerCase()} · {b.client_name ?? 'Walk-in'}
                                                    </div>
                                                ))}
                                                {dayBookings.length > MAX && (
                                                    <p className="text-[9px] text-savron-silver/40 pl-1">
                                                        +{dayBookings.length - MAX} more
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
