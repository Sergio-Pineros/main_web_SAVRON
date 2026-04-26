"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import StatusBadge from '@/components/crm/StatusBadge';
import type { Barber, Booking } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, LayoutGrid, List, X, DollarSign, CreditCard, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { SERVICES, SERVICE_COLORS, TIME_SLOTS } from '@/lib/services-data';

type ViewMode = 'calendar' | 'list';

export default function BookingsPage() {
    const supabase = createClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [filter, setFilter] = useState<string>('all');
    
    // Booking Detail Modal
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [charging, setCharging] = useState(false);
    const [selectedBarberId, setSelectedBarberId] = useState<string>('all');

    // New Walk-in Modal
    const [walkinSlot, setWalkinSlot] = useState<{ barber_id: string, barber_name: string, time: string } | null>(null);
    const [walkinData, setWalkinData] = useState({ client_name: '', phone: '', email: '', service: SERVICES[0].name as string });
    const [savingWalkin, setSavingWalkin] = useState(false);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [barberRes, bookingRes] = await Promise.all([
            supabase.from('barbers').select('*').eq('active', true).order('name'),
            viewMode === 'calendar'
                ? supabase.from('bookings').select('*').eq('date', dateStr).in('status', ['confirmed', 'completed', 'no_show']).order('time')
                : supabase.from('bookings').select('*').order('date', { ascending: false }).limit(200),
        ]);
        setBarbers(barberRes.data ?? []);
        setBookings(bookingRes.data ?? []);
        setLoading(false);
    }, [dateStr, viewMode]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Realtime
    useEffect(() => {
        const channel = supabase
            .channel(`admin-bookings-${dateStr}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [dateStr, fetchData]);

    async function updateStatus(id: string, status: string) {
        await supabase.from('bookings').update({ status }).eq('id', id);
        setSelectedBooking(null);
        fetchData();
    }

    async function chargeBooking(bookingId: string, mode: 'redirect' | 'link') {
        setCharging(true);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, mode }),
            });
            const data = await res.json();
            if (mode === 'redirect' && data.url) {
                window.open(data.url, '_blank');
            } else if (mode === 'link') {
                alert(data.sent ? 'Payment link sent to client email!' : 'Payment link created (no email on file)');
            }
        } catch (err) {
            alert('Failed to create checkout');
        }
        setCharging(false);
    }

    async function deleteBooking(id: string) {
        if (!confirm('Are you sure you want to completely delete this booking?')) return;
        await supabase.from('bookings').delete().eq('id', id);
        setSelectedBooking(null);
        fetchData();
    }

    async function saveWalkin(e: React.FormEvent) {
        e.preventDefault();
        if (!walkinSlot) return;
        setSavingWalkin(true);

        const svc = SERVICES.find(s => s.name === walkinData.service) || SERVICES[0];

        await supabase.from('bookings').insert({
            barber_id: walkinSlot.barber_id,
            barber_name: walkinSlot.barber_name,
            date: dateStr,
            time: walkinSlot.time,
            client_name: walkinData.client_name || 'Walk-in Client',
            client_phone: walkinData.phone || null,
            client_email: walkinData.email || null,
            service: svc.name,
            duration: svc.duration,
            price: svc.price,
            status: 'confirmed'
        });

        setWalkinSlot(null);
        setWalkinData({ client_name: '', phone: '', email: '', service: SERVICES[0].name });
        setSavingWalkin(false);
        fetchData();
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        // Parse the local YYYY-MM-DD string exactly as midnight to avoid timezone shift
        const [year, month, day] = e.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    };

    const getBookingsForBarberAndTime = (barberId: string, time: string) =>
        bookings.filter(b => b.barber_id === barberId && b.time === time);

    const getServiceColor = (name: string) => SERVICE_COLORS[name] ?? 'bg-white/10 border-white/20 text-white/70';
    const statusDot = (s: Booking['status']) =>
        s === 'confirmed' ? 'bg-savron-green' : s === 'completed' ? 'bg-blue-400' : s === 'no_show' ? 'bg-red-400' : 'bg-savron-silver';

    const filteredList = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    
    const visibleBarbers = selectedBarberId === 'all' 
        ? barbers 
        : barbers.filter(b => b.id === selectedBarberId);

    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;

    return (
        <div className="space-y-6 entry-fade flex flex-col h-[calc(100vh-6rem)]">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="font-heading text-3xl uppercase tracking-widest text-white">Bookings</h1>
                        <p className="text-savron-silver text-sm uppercase tracking-wider mt-1">
                            {viewMode === 'calendar' ? `${confirmedCount} confirmed · ${completedCount} done` : 'All Appointments'}
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            if (barbers.length > 0) {
                                setWalkinSlot({ barber_id: barbers[0].id, barber_name: barbers[0].name, time: '10:00 AM' });
                            }
                        }}
                        className="ml-4 px-4 py-2 bg-savron-green text-black uppercase tracking-widest text-[10px] font-bold rounded-savron hover:bg-opacity-90 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> New Booking
                    </button>
                </div>
                
                {viewMode === 'calendar' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                        <button 
                            onClick={() => setSelectedBarberId('all')}
                            className={cn("px-3 py-1.5 text-[10px] uppercase tracking-widest border rounded-savron transition-all whitespace-nowrap",
                                selectedBarberId === 'all' ? 'bg-savron-green/15 text-savron-green border-savron-green/20' : 'text-savron-silver border-white/10 hover:border-white/20 hover:text-white'
                            )}
                        >
                            All Barbers
                        </button>
                        {barbers.map(b => (
                            <button 
                                key={b.id}
                                onClick={() => setSelectedBarberId(b.id)}
                                className={cn("px-3 py-1.5 text-[10px] uppercase tracking-widest border rounded-savron transition-all whitespace-nowrap",
                                    selectedBarberId === b.id ? 'bg-savron-green/15 text-savron-green border-savron-green/20' : 'text-savron-silver border-white/10 hover:border-white/20 hover:text-white'
                                )}
                            >
                                {b.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {/* View toggle */}
                    <div className="flex border border-white/10 rounded-savron overflow-hidden shrink-0">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn("px-3 py-2 text-xs uppercase tracking-widest transition-all", viewMode === 'calendar' ? "bg-savron-green/15 text-savron-green" : "text-savron-silver hover:text-white")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("px-3 py-2 text-xs uppercase tracking-widest transition-all border-l border-white/10", viewMode === 'list' ? "bg-savron-green/15 text-savron-green" : "text-savron-silver hover:text-white")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {viewMode === 'calendar' && (
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-savron border border-white/10 shrink-0">
                            <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 text-savron-silver hover:text-white transition-colors rounded-lg hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
                            
                            <div className="relative flex items-center group">
                                <label htmlFor="cal-date" className="absolute left-0 right-0 top-0 bottom-0 cursor-pointer w-full h-full z-10 opacity-0">
                                    <input 
                                        type="date" 
                                        id="cal-date"
                                        value={dateStr}
                                        onChange={handleDateChange}
                                        className="w-full h-full"
                                    />
                                </label>
                                <div className="text-center min-w-[140px] px-2 py-1 rounded-lg group-hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2">
                                    <CalendarIcon className="w-3.5 h-3.5 text-savron-silver hidden sm:block" />
                                    <div>
                                        <p className="text-white font-heading uppercase tracking-widest text-sm leading-none">{isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE')}</p>
                                        <p className="text-savron-silver text-[10px] uppercase tracking-widest mt-0.5">{format(selectedDate, 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-2 text-savron-silver hover:text-white transition-colors rounded-lg hover:bg-white/5"><ChevronRight className="w-4 h-4" /></button>
                            
                            {!isToday(selectedDate) && (
                                <button onClick={() => setSelectedDate(new Date())} className="ml-1 text-[10px] uppercase tracking-widest text-savron-green hover:text-white px-3 py-1.5 border border-savron-green/30 rounded-lg hover:bg-savron-green/10 transition-all">Today</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-savron-green/30 border-t-savron-green rounded-full animate-spin" />
                </div>
            ) : viewMode === 'calendar' ? (
                /* ─── Calendar Grid ─────────────────── */
                <div className="card-savron flex-1 flex flex-col overflow-hidden p-0 rounded-xl border border-white/10">
                    <div className="flex border-b border-white/5 bg-savron-black sticky top-0 z-10">
                        <div className="w-20 shrink-0 p-3 border-r border-white/5 flex items-center justify-center bg-black/20">
                            <span className="text-[9px] uppercase tracking-widest text-savron-silver/40">Time</span>
                        </div>
                        {visibleBarbers.map(b => (
                            <div key={b.id} className="flex-1 min-w-[180px] p-3 border-r border-white/5 flex items-center gap-3 bg-black/20">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-savron-grey relative shrink-0">
                                    {b.image_url && <Image src={b.image_url} alt={b.name} fill className="object-cover grayscale" />}
                                </div>
                                <div>
                                    <p className="text-white text-xs font-heading text-center uppercase tracking-widest leading-none">{b.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {TIME_SLOTS.map((time, i) => (
                            <div key={i} className={cn("flex border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group", i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]")}>
                                <div className="w-20 shrink-0 p-3 border-r border-white/5 flex items-start justify-center">
                                    <span className="text-savron-silver/40 text-[10px] font-mono mt-1">{time}</span>
                                </div>
                                {visibleBarbers.map(barber => {
                                    const cell = getBookingsForBarberAndTime(barber.id, time);
                                    const isEmpty = cell.length === 0;

                                    return (
                                        <div 
                                            key={barber.id} 
                                            className={cn(
                                                "flex-1 min-w-[180px] p-1.5 border-r border-white/5 min-h-[70px] relative transition-colors",
                                                isEmpty ? "cursor-pointer hover:bg-white/[0.03]" : ""
                                            )}
                                            onClick={() => {
                                                if (isEmpty) {
                                                    setWalkinSlot({ barber_id: barber.id, barber_name: barber.name, time });
                                                }
                                            }}
                                        >
                                            {isEmpty && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="text-[10px] uppercase tracking-widest text-savron-silver flex items-center gap-1">
                                                        <Plus className="w-3 h-3" /> Walk-in
                                                    </span>
                                                </div>
                                            )}

                                            {cell.map(booking => (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                                    className={cn("p-2 rounded-lg border text-xs space-y-1 mb-1 cursor-pointer hover:brightness-110 transition-all z-10 relative shadow-md shadow-black/20", getServiceColor(booking.service))}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold truncate">{booking.client_name ?? 'Walk-in'}</span>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(booking.status))} />
                                                    </div>
                                                    <p className="opacity-80 truncate text-[10px] uppercase tracking-wider">{booking.service}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {/* Bottom padding for scrolling */}
                        <div className="h-20" />
                    </div>
                </div>
            ) : (
                /* ─── List View ─────────────────── */
                <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex gap-2 flex-wrap shrink-0">
                        {['all', 'confirmed', 'completed', 'cancelled', 'no_show'].map(f => (
                            <button
                                key={f} onClick={() => setFilter(f)}
                                className={cn("px-4 py-2 text-[10px] uppercase tracking-widest rounded-savron border transition-all",
                                    filter === f ? 'bg-savron-green/15 text-savron-green border-savron-green/20' : 'text-savron-silver border-white/10 hover:border-white/20 hover:text-white'
                                )}
                            >
                                {f.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="card-savron flex-1 overflow-auto p-0">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-savron-grey z-10 shadow-md">
                                <tr className="border-b border-white/5">
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Date</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Time</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Client</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Service</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Barber</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Price</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal">Status</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest text-savron-silver/50 font-normal"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map(b => (
                                    <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedBooking(b)}>
                                        <td className="p-4 text-white text-sm">{(() => { try { return format(new Date(b.date), 'MMM d'); } catch { return b.date; } })()}</td>
                                        <td className="p-4 text-savron-green text-sm font-mono">{b.time}</td>
                                        <td className="p-4 text-white text-sm">{b.client_name || '—'}</td>
                                        <td className="p-4 text-savron-silver text-xs">{b.service}</td>
                                        <td className="p-4 text-savron-silver text-xs">{b.barber_name || '—'}</td>
                                        <td className="p-4 text-white text-sm font-mono">{b.price || '—'}</td>
                                        <td className="p-4"><StatusBadge status={b.status} /></td>
                                        <td className="p-4" onClick={e => e.stopPropagation()}>
                                            {b.status === 'confirmed' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateStatus(b.id, 'completed')} className="text-[10px] uppercase tracking-widest text-green-400 hover:text-green-300">Done</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredList.length === 0 && (
                                    <tr><td colSpan={8} className="p-12 text-center text-savron-silver/50 text-sm uppercase tracking-widest">No bookings found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Walk-in Modal */}
            <AnimatePresence>
                {walkinSlot && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setWalkinSlot(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-savron-grey border border-white/10 rounded-savron w-full max-w-sm shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 rounded-t-savron">
                                <div>
                                    <h2 className="text-white font-heading text-lg uppercase tracking-wider">New Booking</h2>
                                    <p className="text-savron-silver text-[10px] uppercase tracking-widest mt-0.5">
                                        {format(selectedDate, 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <button onClick={() => setWalkinSlot(null)} className="text-savron-silver hover:text-white p-1 rounded-md hover:bg-white/5"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={saveWalkin} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] uppercase tracking-widest text-savron-silver/50 mb-1.5 block ml-1">Barber</label>
                                        <select 
                                            value={walkinSlot.barber_id} 
                                            onChange={e => {
                                                const selected = barbers.find(b => b.id === e.target.value);
                                                if (selected) setWalkinSlot(p => p ? { ...p, barber_id: selected.id, barber_name: selected.name } : null);
                                            }} 
                                            className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-savron-green transition-colors appearance-none font-medium"
                                        >
                                            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] uppercase tracking-widest text-savron-silver/50 mb-1.5 block ml-1">Time</label>
                                        <select 
                                            value={walkinSlot.time} 
                                            onChange={e => setWalkinSlot(p => p ? { ...p, time: e.target.value } : null)} 
                                            className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-savron-green transition-colors appearance-none font-medium"
                                        >
                                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase tracking-widest text-savron-silver/50 mb-1.5 block ml-1">Client Name (Required)</label>
                                    <input 
                                        required 
                                        placeholder="E.g. John Doe or 'Walk-in'" 
                                        value={walkinData.client_name} 
                                        onChange={e => setWalkinData(p => ({ ...p, client_name: e.target.value }))} 
                                        className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-savron-green transition-colors font-medium"
                                        autoFocus
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[9px] uppercase tracking-widest text-savron-silver/50 mb-1.5 block ml-1">Service</label>
                                    <select 
                                        value={walkinData.service} 
                                        onChange={e => setWalkinData(p => ({ ...p, service: e.target.value }))} 
                                        className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-savron-green transition-colors appearance-none font-medium"
                                    >
                                        {SERVICES.map(s => (
                                            <option key={s.id} value={s.name}>{s.name} — {s.price}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-2 border-t border-white/5">
                                    <p className="text-[9px] uppercase tracking-widest text-savron-silver/40 mb-3 text-center">Optional Contact Info</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input 
                                            type="tel" 
                                            placeholder="Phone" 
                                            value={walkinData.phone} 
                                            onChange={e => setWalkinData(p => ({ ...p, phone: e.target.value }))} 
                                            className="w-full bg-black/30 border border-white/5 text-savron-silver text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/20 transition-colors"
                                        />
                                        <input 
                                            type="email" 
                                            placeholder="Email" 
                                            value={walkinData.email} 
                                            onChange={e => setWalkinData(p => ({ ...p, email: e.target.value }))} 
                                            className="w-full bg-black/30 border border-white/5 text-savron-silver text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/20 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={savingWalkin}
                                        className="w-full py-2.5 text-xs font-semibold uppercase tracking-widest bg-savron-green text-black rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {savingWalkin ? 'Saving...' : 'Book Walk-in'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Booking Detail Modal */}
            <AnimatePresence>
                {selectedBooking && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setSelectedBooking(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-savron-grey border border-white/10 rounded-savron w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-white font-heading text-lg uppercase tracking-wider">Booking Details</h2>
                                <button onClick={() => setSelectedBooking(null)} className="text-savron-silver hover:text-white p-1 rounded-md hover:bg-white/5"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Client</span>
                                        <p className="text-white text-sm font-medium">{selectedBooking.client_name || 'Walk-in'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Service</span>
                                        <p className="text-white text-sm">{selectedBooking.service}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Barber</span>
                                        <p className="text-white text-sm">{selectedBooking.barber_name || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Date & Time</span>
                                        <p className="text-white text-sm">{selectedBooking.date} · {selectedBooking.time}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Price</span>
                                        <p className="text-savron-green text-lg font-mono font-bold">{selectedBooking.price || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Status</span>
                                        <div><StatusBadge status={selectedBooking.status} /></div>
                                    </div>
                                </div>
                                {selectedBooking.client_email && (
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Email</span>
                                        <p className="text-savron-silver text-sm">{selectedBooking.client_email}</p>
                                    </div>
                                )}
                                {selectedBooking.client_phone && (
                                    <div className="space-y-1">
                                        <span className="text-savron-silver text-[10px] uppercase tracking-wider">Phone</span>
                                        <p className="text-savron-silver text-sm font-mono">{selectedBooking.client_phone}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-white/5 space-y-3 bg-black/20 rounded-b-savron">
                                {/* Status actions */}
                                {selectedBooking.status === 'confirmed' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => updateStatus(selectedBooking.id, 'completed')} className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all">
                                            Mark Complete
                                        </button>
                                        <button onClick={() => updateStatus(selectedBooking.id, 'cancelled')} className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all">
                                            Cancel
                                        </button>
                                        <button onClick={() => updateStatus(selectedBooking.id, 'no_show')} className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-all">
                                            No-show
                                        </button>
                                    </div>
                                )}
                                {/* Stripe charge buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => chargeBooking(selectedBooking.id, 'redirect')}
                                        disabled={charging || selectedBooking.payment_status === 'paid'}
                                        className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-savron-green text-black rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:bg-savron-silver disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <CreditCard className="w-3 h-3" /> {selectedBooking.payment_status === 'paid' ? 'Paid' : 'Charge POS'}
                                    </button>
                                    <button
                                        onClick={() => chargeBooking(selectedBooking.id, 'link')}
                                        disabled={charging || selectedBooking.payment_status === 'paid'}
                                        className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest bg-white/5 text-savron-silver border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <DollarSign className="w-3 h-3" /> Pay Link
                                    </button>
                                    <button
                                        onClick={() => deleteBooking(selectedBooking.id)}
                                        title="Delete Booking"
                                        className="px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
