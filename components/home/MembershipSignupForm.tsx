"use client";

import { useState } from "react";

export default function MembershipSignupForm() {
    const [form, setForm] = useState({ name: "", email: "", phone: "" });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const isValid = form.name.trim() && form.email.trim();

    const handleSubmit = async () => {
        if (!isValid || loading) return;
        setLoading(true);
        setStatus(null);
        try {
            const res = await fetch("/api/wallet/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStatus({ type: "success", text: "You're in. Check your inbox for your pass." });
                setForm({ name: "", email: "", phone: "" });
            } else if (res.status === 409) {
                setStatus({ type: "error", text: "This email is already on the list." });
            } else {
                setStatus({ type: "error", text: data?.error || "Something went wrong. Please try again." });
            }
        } catch {
            setStatus({ type: "error", text: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        background: "transparent",
        border: "none",
        borderBottom: "1px solid rgba(232,228,220,0.12)",
        color: "#e8e4dc",
        padding: "10px 0",
        fontFamily: "var(--font-montserrat), sans-serif",
        fontWeight: 300,
        fontSize: 13,
        outline: "none",
        width: "100%",
        transition: "border-color 0.3s",
    };

    const labelStyle: React.CSSProperties = {
        fontFamily: "var(--font-montserrat), sans-serif",
        fontWeight: 500,
        fontSize: 9,
        letterSpacing: "0.36em",
        textTransform: "uppercase",
        color: "rgba(232,228,220,0.28)",
        display: "block",
        marginBottom: 8,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
                { label: "Full Name", type: "text", key: "name", placeholder: "Your name", required: true },
                { label: "Email Address", type: "email", key: "email", placeholder: "your@email.com", required: true },
                { label: "Phone (optional)", type: "tel", key: "phone", placeholder: "+1 (612) 000-0000", required: false },
            ].map(({ label, type, key, placeholder }) => (
                <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input
                        type={type}
                        placeholder={placeholder}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.42)")}
                        onBlur={(e) => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.12)")}
                    />
                </div>
            ))}

            <button
                onClick={handleSubmit}
                disabled={loading || !isValid}
                style={{
                    marginTop: 4,
                    background: "transparent",
                    border: "1px solid rgba(232,228,220,0.15)",
                    color: isValid ? "rgba(232,228,220,0.65)" : "rgba(232,228,220,0.2)",
                    padding: "15px 28px",
                    width: "100%",
                    fontFamily: "var(--font-montserrat), sans-serif",
                    fontWeight: 500,
                    fontSize: 9,
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    cursor: isValid && !loading ? "pointer" : "not-allowed",
                    transition: "all 0.35s ease",
                }}
                onMouseEnter={(e) => {
                    if (!loading && isValid) {
                        e.currentTarget.style.background = "rgba(232,228,220,0.05)";
                        e.currentTarget.style.borderColor = "rgba(232,228,220,0.3)";
                        e.currentTarget.style.color = "#e8e4dc";
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(232,228,220,0.15)";
                    e.currentTarget.style.color = isValid ? "rgba(232,228,220,0.65)" : "rgba(232,228,220,0.2)";
                }}
            >
                {loading ? "Sending…" : "Join the List →"}
            </button>

            {status && (
                <p style={{
                    fontFamily: "var(--font-montserrat), sans-serif",
                    fontWeight: 300,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    color: status.type === "success" ? "rgba(175,205,170,0.85)" : "rgba(210,130,130,0.85)",
                }}>
                    {status.text}
                </p>
            )}
        </div>
    );
}
