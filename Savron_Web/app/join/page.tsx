"use client";

import Section from '@/components/ui/Section';
import ApplicationForm from '@/components/join/ApplicationForm';
import { motion } from 'framer-motion';

export default function JoinPage() {
    return (
        <main className="min-h-screen bg-savron-black pt-20">

            {/* Header Section */}
            <Section className="bg-savron-grey relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1593702295094-aea8c5c13d8d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-heading text-5xl md:text-7xl uppercase tracking-widest text-white"
                    >
                        Join the <span className="text-savron-green">Craft</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-savron-silver text-lg font-light"
                    >
                        We are looking for elite barbers who are obsessed with detail and dedicated to the art of grooming.
                        If you believe you have what it takes to uphold the SAVRON standard, we want to hear from you.
                    </motion.p>
                </div>
            </Section>

            {/* Application Form Section */}
            <Section>
                <div className="max-w-2xl mx-auto">
                    <ApplicationForm />
                </div>
            </Section>

        </main>
    );
}
