"use client";

import Section from '@/components/ui/Section';
import { Instagram } from 'lucide-react';

const Media = () => {
    return (
        <Section className="bg-savron-grey overflow-hidden px-0 md:px-0 lg:px-0">
            <div className="w-full min-h-[500px]">

                {/* Hype Image Container */}
                <div className="relative h-full min-h-[500px] w-full bg-black group">
                    <div
                        className="w-full h-full bg-cover bg-center grayscale opacity-60"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute bottom-12 left-8 md:left-12 lg:left-24 text-white z-20">
                        <p className="font-heading uppercase tracking-widest text-2xl md:text-3xl">Savron Lands in MPLS</p>
                        <p className="font-mono text-sm text-savron-silver mt-2">The Standard of Excellence</p>
                    </div>
                </div>
            </div>
        </Section>
    );
};

export default Media;

