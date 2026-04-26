"use client";

import { Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function BookingsPage() {
    return (
        <div className="space-y-6 entry-fade flex flex-col h-[calc(100vh-6rem)]">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
                <div>
                    <h1 className="font-heading text-3xl uppercase tracking-widest text-white">Calendar</h1>
                    <p className="text-savron-silver text-sm uppercase tracking-wider mt-1">
                        Manage Appointments & Walk-ins
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="https://calendar.google.com/calendar/u/0/r"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-savron-silver hover:text-white border border-white/10 rounded-savron hover:border-white/30 transition-all"
                    >
                        <ExternalLink size={14} /> Open in Google Calendar
                    </Link>
                </div>
            </div>

            {/* Calendar Embed */}
            <div className="card-savron flex-1 w-full overflow-hidden p-0 border border-white/10 rounded-xl relative bg-white">
                {/* 
                    The iframe provides the live Google Calendar view. 
                    Since Google Calendar doesn't naturally support a dark mode embed, 
                    we leave the background white to blend with the iframe's native look.
                */}
                <iframe
                    src="https://calendar.google.com/calendar/embed?src=647974e05fc3f7623a296d4bf0a07a875fbabbf1c93155fc80f16000841ba73b%40group.calendar.google.com&ctz=America%2FChicago"
                    style={{ border: 0 }}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    className="absolute inset-0 w-full h-full"
                    title="SAVRON Appointments"
                ></iframe>
            </div>
        </div>
    );
}
