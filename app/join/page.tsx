"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, Scissors, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function BarberRegistration() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        
        try {
            const res = await fetch('/api/barbers/register', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Failed to submit registration');
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImagePreview(url);
        }
    };

    const inputClasses = "w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/25 px-5 py-4 text-sm font-light tracking-wide focus:outline-none focus:border-savron-green/50 focus:bg-white/[0.05] transition-all rounded-savron";
    const labelClasses = "block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2 ml-1";

    return (
        <main className="min-h-screen bg-savron-black flex flex-col relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-savron-grey/30 rounded-full blur-[120px] mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-savron-green/5 rounded-full blur-[100px] mix-blend-overlay"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 w-full py-8 px-6 md:px-12 flex justify-center border-b border-white/5 bg-black/20 backdrop-blur-md">
                <Link href="/" className="relative w-32 h-8 block">
                    <Image src="/logo.png" alt="SAVRON" fill className="object-contain" priority />
                </Link>
            </header>

            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
                <div className="w-full max-w-2xl">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-savron-grey border border-white/10 p-12 text-center rounded-[24px] shadow-2xl"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                                    className="w-20 h-20 bg-savron-green/10 rounded-full flex items-center justify-center mx-auto mb-6 text-savron-green"
                                >
                                    <CheckCircle2 size={40} />
                                </motion.div>
                                <h2 className="font-heading text-3xl text-white uppercase tracking-widest mb-4">
                                    Registration Received
                                </h2>
                                <p className="text-savron-silver font-light leading-relaxed mb-8 max-w-md mx-auto">
                                    Thank you for registering with SAVRON. Our team will review your profile and contact you shortly. Once approved, your profile will be live on our platform.
                                </p>
                                <Link href="/" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white text-xs uppercase tracking-widest hover:bg-white/10 transition-all rounded-savron">
                                    Return Home
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-savron-grey/80 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[24px] shadow-2xl"
                            >
                                <div className="text-center mb-10">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-savron-green mb-4 flex items-center justify-center gap-2">
                                        <Scissors size={12} /> Join the team
                                    </p>
                                    <h1 className="font-heading text-3xl md:text-4xl text-white uppercase tracking-widest mb-4">
                                        Barber Registration
                                    </h1>
                                    <p className="text-savron-silver/70 font-light text-sm">
                                        Complete your profile to be listed on the SAVRON platform.
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-8 p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-light tracking-wide text-center rounded-savron">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Full Name *</label>
                                            <input type="text" name="name" required className={inputClasses} placeholder="John Doe" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Email Address *</label>
                                            <input type="email" name="email" required className={inputClasses} placeholder="john@example.com" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Phone Number *</label>
                                            <input type="tel" name="phone" required className={inputClasses} placeholder="(555) 123-4567" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Instagram Profile</label>
                                            <input type="url" name="instagram_url" className={inputClasses} placeholder="https://instagram.com/yourhandle" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Bio / About You</label>
                                        <textarea 
                                            name="bio" 
                                            rows={4} 
                                            className={`${inputClasses} resize-none`} 
                                            placeholder="Tell us about your experience and style..."
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Profile Picture (Optional)</label>
                                        <div className="relative group cursor-pointer">
                                            <input 
                                                type="file" 
                                                name="image" 
                                                accept="image/*" 
                                                onChange={handleImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                            />
                                            <div className="border-2 border-dashed border-white/10 rounded-savron p-8 flex flex-col items-center justify-center text-center group-hover:border-savron-green/40 group-hover:bg-white/[0.02] transition-all relative overflow-hidden">
                                                {imagePreview ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <Image src={imagePreview} alt="Preview" fill className="object-cover opacity-60" />
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Upload size={20} className="text-white mb-2" />
                                                            <span className="text-[10px] uppercase tracking-widest text-white font-medium">Change Photo</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                            <Upload size={20} className="text-white/50 group-hover:text-savron-green" />
                                                        </div>
                                                        <span className="text-xs text-white/50 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Upload Photo</span>
                                                        <span className="text-[10px] text-white/30">JPG, PNG, WebP (Max 5MB)</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-savron-green text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-opacity-90 transition-all rounded-savron disabled:opacity-50 group"
                                        >
                                            {loading ? 'Submitting...' : 'Complete Registration'}
                                            {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                                        </button>
                                        <p className="text-center text-[10px] text-white/30 tracking-widest mt-4">
                                            By registering, you agree to SAVRON&apos;s terms and conditions.
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
