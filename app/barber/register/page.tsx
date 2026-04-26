"use client";

import { useState, useRef } from "react";
import Image from "next/image";

const SPECIALTIES = [
    "Signature Fades",
    "Classic Cuts",
    "Hot Towel Shaves",
    "Beard Sculpting",
    "Textured Styles",
    "Color Work",
    "Line-ups",
    "Kids Cuts",
    "Modern Cuts",
    "Executive Cut",
];

export default function BarberRegisterPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        bio: "",
        instagram_url: "",
    });
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const fd = new FormData();
            fd.append("name", form.name.trim());
            fd.append("email", form.email.trim());
            fd.append("phone", form.phone.trim());
            fd.append("bio", form.bio.trim());
            fd.append("instagram_url", form.instagram_url.trim());
            fd.append("specialties", selectedSpecialties.join(", "));
            if (imageFile) fd.append("image", imageFile);

            const res = await fetch("/api/barbers/register", { method: "POST", body: fd });
            const data = await res.json();

            if (res.ok && data.success) {
                setDone(true);
            } else {
                setError(data.error || "Something went wrong. Please try again.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full bg-transparent border-b border-white/10 text-white placeholder-white/20 py-3 text-sm font-light tracking-wide focus:outline-none focus:border-white/35 transition-colors";
    const labelCls = "block text-[9px] uppercase tracking-[0.35em] text-white/30 mb-2";

    if (done) {
        return (
            <div style={{ minHeight: "100vh", background: "#0d0d0b", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
                <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
                    <div style={{ position: "relative", width: 100, height: 24, margin: "0 auto 48px" }}>
                        <Image src="/logo.png" alt="SAVRON" fill style={{ objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />
                    </div>
                    <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(232,228,220,0.28)", marginBottom: 24 }}>
                        Application Received
                    </p>
                    <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(32px,4vw,48px)", fontWeight: 400, color: "#e8e4dc", lineHeight: 1.1, marginBottom: 24 }}>
                        We&apos;ll be in touch.
                    </h1>
                    <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 300, lineHeight: 1.9, color: "rgba(232,228,220,0.4)", maxWidth: 340, margin: "0 auto" }}>
                        Your profile has been submitted for review. Once approved by the SAVRON team, you&apos;ll be added to the roster and receive your login credentials.
                    </p>
                    <div style={{ width: 1, height: 48, background: "rgba(232,228,220,0.15)", margin: "40px auto 0" }} />
                    <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(232,228,220,0.18)", marginTop: 16 }}>
                        North Loop · Minneapolis
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "#0d0d0b", color: "#e8e4dc", fontFamily: "var(--font-montserrat), sans-serif" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(48px,8vw,96px) 24px" }}>

                {/* Header */}
                <div style={{ marginBottom: 56 }}>
                    <div style={{ position: "relative", width: 100, height: 22, marginBottom: 48 }}>
                        <Image src="/logo.png" alt="SAVRON" fill style={{ objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1)", opacity: 0.65 }} />
                    </div>
                    <p style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(232,228,220,0.25)", marginBottom: 20 }}>
                        Team Application
                    </p>
                    <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(28px,4vw,48px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#e8e4dc", marginBottom: 16 }}>
                        Join the roster.
                    </h1>
                    <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.85, color: "rgba(232,228,220,0.4)", maxWidth: 420 }}>
                        Fill out your profile below. Your application will be reviewed by the SAVRON team — approved barbers are added to the booking system and client-facing roster.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 36 }}>

                    {/* Profile photo */}
                    <div>
                        <label className={labelCls}>Profile Photo</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 72, height: 72, borderRadius: "50%",
                                    border: "1px solid rgba(232,228,220,0.15)",
                                    background: "rgba(232,228,220,0.03)",
                                    overflow: "hidden", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative", flexShrink: 0,
                                }}
                            >
                                {imagePreview
                                    ? <Image src={imagePreview} alt="Preview" fill style={{ objectFit: "cover" }} />
                                    : <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(232,228,220,0.25)" }}>Add</span>
                                }
                            </div>
                            <div>
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,228,220,0.45)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                    {imagePreview ? "Change photo" : "Upload photo"} →
                                </button>
                                <p style={{ fontSize: 10, color: "rgba(232,228,220,0.2)", marginTop: 4 }}>JPG or PNG, max 5MB</p>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                    </div>

                    {/* Name + Email */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input className={inputCls} type="text" required placeholder="Marcus V."
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelCls}>Email Address *</label>
                            <input className={inputCls} type="email" required placeholder="you@email.com"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                    </div>

                    {/* Phone + Instagram */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                        <div>
                            <label className={labelCls}>Phone</label>
                            <input className={inputCls} type="tel" placeholder="(612) 000-0000"
                                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelCls}>Instagram</label>
                            <input className={inputCls} type="text" placeholder="@yourhandle"
                                value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className={labelCls}>Bio</label>
                        <textarea
                            placeholder="Tell us about your experience, style, and what you bring to the chair..."
                            value={form.bio}
                            onChange={e => setForm({ ...form, bio: e.target.value })}
                            rows={4}
                            style={{
                                width: "100%", background: "transparent",
                                border: "none", borderBottom: "1px solid rgba(232,228,220,0.1)",
                                color: "#e8e4dc", padding: "12px 0",
                                fontSize: 13, fontWeight: 300, fontFamily: "var(--font-montserrat)",
                                lineHeight: 1.75, outline: "none", resize: "none",
                                transition: "border-color 0.3s",
                            }}
                            onFocus={e => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.35)")}
                            onBlur={e => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.1)")}
                        />
                    </div>

                    {/* Specialties */}
                    <div>
                        <label className={labelCls}>Specialties (select all that apply)</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                            {SPECIALTIES.map(s => (
                                <button
                                    key={s} type="button"
                                    onClick={() => toggleSpecialty(s)}
                                    style={{
                                        padding: "8px 14px",
                                        fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                                        border: selectedSpecialties.includes(s)
                                            ? "1px solid rgba(232,228,220,0.45)"
                                            : "1px solid rgba(232,228,220,0.1)",
                                        background: selectedSpecialties.includes(s)
                                            ? "rgba(232,228,220,0.07)"
                                            : "transparent",
                                        color: selectedSpecialties.includes(s)
                                            ? "#e8e4dc"
                                            : "rgba(232,228,220,0.35)",
                                        cursor: "pointer",
                                        transition: "all 0.25s",
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p style={{ fontSize: 12, color: "rgba(210,130,130,0.85)", letterSpacing: "0.05em" }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !form.name.trim() || !form.email.trim()}
                        style={{
                            marginTop: 8,
                            background: "transparent",
                            border: "1px solid rgba(232,228,220,0.18)",
                            color: "rgba(232,228,220,0.65)",
                            padding: "18px 36px",
                            fontFamily: "var(--font-montserrat)",
                            fontWeight: 500, fontSize: 10,
                            letterSpacing: "0.32em", textTransform: "uppercase",
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "all 0.35s ease",
                            opacity: (!form.name.trim() || !form.email.trim()) ? 0.4 : 1,
                        }}
                        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(232,228,220,0.06)"; e.currentTarget.style.color = "#e8e4dc"; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(232,228,220,0.65)"; }}
                    >
                        {loading ? "Submitting…" : "Submit Application →"}
                    </button>
                </form>

                <p style={{ marginTop: 48, fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(232,228,220,0.15)" }}>
                    SAVRON · North Loop · Minneapolis
                </p>
            </div>
        </div>
    );
}
