"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export default function Home() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLElement>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/wallet/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "development_fallback_key",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: "success", text: "You're in. Check your inbox." });
        setFormData({ name: "", email: "" });
      } else {
        setStatus({ type: "error", text: data?.error || "Something went wrong. Please try again." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isValid = formData.name.trim() && formData.email.trim();

  return (
    <>
      {/* ── Inject keyframes directly — bypasses Tailwind purge entirely ── */}
      <style>{`
        @keyframes savronSlideUp {
          0%   { opacity: 0; transform: translateY(48px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
        @keyframes savronFadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .sv-nav   { animation: savronFadeIn   0.7s ease                    0.05s both; }
        .sv-logo  { animation: savronSlideUp  1.1s cubic-bezier(.16,1,.3,1) 0.18s both; }
        .sv-tag   { animation: savronSlideUp  0.95s cubic-bezier(.16,1,.3,1) 0.72s both; }
        .sv-quote { animation: savronSlideUp  0.95s cubic-bezier(.16,1,.3,1) 0.98s both; }
        .sv-cue   { animation: savronFadeIn   1s ease                       1.5s  both; }

        ::placeholder { color: rgba(232,228,220,0.22) !important; }
        input { background: transparent !important; }
      `}</style>

      <div style={{ background: "#1c1c1a", color: "#e8e4dc", fontFamily: "var(--font-montserrat), sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

        {/* ─── HERO ────────────────────────────────────────────────────── */}
        <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>

          {/* Background photo */}
          <div style={{ position: "absolute", inset: 0 }}>
            <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: "cover", objectPosition: "center 30%" }} priority />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(28,28,26,0.55) 0%, rgba(28,28,26,0.08) 42%, rgba(28,28,26,0.85) 100%)" }} />
          </div>

          {/* Nav */}
          <nav className="sv-nav" style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "32px 48px",
          }}>
            <Image src="/logo.png" alt="SAVRON" width={110} height={26}
              style={{ height: 20, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.85 }}
              priority
            />
            <button
              onClick={scrollToForm}
              style={{
                fontFamily: "var(--font-montserrat)", fontWeight: 500,
                fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase",
                color: "rgba(232,228,220,0.55)", background: "none", border: "none",
                cursor: "pointer", transition: "color 0.3s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e8e4dc")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,228,220,0.55)")}
            >
              Request Entry →
            </button>
          </nav>

          {/* ── Large centered logo — slides up on load ── */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10, textAlign: "center",
          }}>
            {/* overflow:hidden clips the logo during slide so it appears to rise from below */}
            <div style={{ overflow: "hidden", padding: "16px 0 20px" }}>
              <Image
                src="/logo.png"
                alt="SAVRON"
                width={600}
                height={140}
                className="sv-logo"
                style={{
                  width: "clamp(260px, 44vw, 580px)",
                  height: "auto",
                  filter: "brightness(0) invert(1)",
                  display: "block",
                }}
                priority
              />
            </div>
          </div>

          {/* Location + quote — below logo */}
          <div style={{
            position: "absolute", bottom: "15%",
            left: 0, right: 0, textAlign: "center",
            zIndex: 10, padding: "0 24px",
          }}>
            <p className="sv-tag" style={{
              fontFamily: "var(--font-montserrat)", fontWeight: 300,
              fontSize: 10, letterSpacing: "0.44em", textTransform: "uppercase",
              color: "rgba(232,228,220,0.42)", marginBottom: 20,
            }}>
              Minneapolis &nbsp;·&nbsp; Spring 2026
            </p>
            <p className="sv-quote" style={{
              fontFamily: "var(--font-playfair)", fontStyle: "italic",
              fontSize: "clamp(18px, 2.2vw, 28px)", fontWeight: 400,
              color: "rgba(232,228,220,0.7)", lineHeight: 1.5,
              maxWidth: 460, margin: "0 auto",
            }}>
              &ldquo;Some things are not announced.<br />They are simply experienced.&rdquo;
            </p>
          </div>

          {/* Scroll cue */}
          <div className="sv-cue" style={{
            position: "absolute", bottom: 36, left: "50%",
            transform: "translateX(-50%)", zIndex: 10, opacity: 0.28,
          }}>
            <div style={{ width: 1, height: 48, background: "#e8e4dc" }} />
          </div>
        </section>

        {/* ─── 001 — THE EXPERIENCE ────────────────────────────────────── */}
        <section style={{
          padding: "clamp(72px, 11vw, 150px) clamp(24px, 8vw, 120px)",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "clamp(40px, 6vw, 100px)", alignItems: "center",
          borderBottom: "1px solid rgba(232,228,220,0.07)",
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(232,228,220,0.28)", marginBottom: 28 }}>
              001 — The Experience
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 600, fontSize: "clamp(32px, 4vw, 58px)", lineHeight: 1.1, color: "#e8e4dc", letterSpacing: "-0.02em", marginBottom: 32 }}>
              Curated for the man who demands the extraordinary.
            </h2>
            <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 14, lineHeight: 1.9, color: "rgba(232,228,220,0.48)", maxWidth: 400 }}>
              Not every space is built for everyone. SAVRON is a private sanctuary,
              engineered for those who understand that the rarest luxury is time —
              and that how you spend it defines who you are.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 40, paddingLeft: "clamp(0px, 4vw, 60px)", borderLeft: "1px solid rgba(232,228,220,0.07)" }}>
            {[
              ["Intentional.", "Every detail considered. Nothing left to chance."],
              ["Private.", "Access by membership only. Your circle, your space."],
              ["Timeless.", "No trends. No noise. Just enduring excellence."],
            ].map(([title, desc]) => (
              <div key={title}>
                <p style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: 21, fontWeight: 400, color: "#e8e4dc", marginBottom: 8 }}>{title}</p>
                <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: "rgba(232,228,220,0.38)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 002 — THE STANDARD ──────────────────────────────────────── */}
        <section style={{ padding: "clamp(72px, 10vw, 130px) clamp(24px, 8vw, 120px)", borderBottom: "1px solid rgba(232,228,220,0.07)" }}>
          <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(232,228,220,0.28)", marginBottom: 40 }}>
            002 — The Standard
          </p>
          <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 500, fontSize: "clamp(24px, 3.6vw, 52px)", lineHeight: 1.25, color: "#e8e4dc", maxWidth: "82%", letterSpacing: "-0.01em" }}>
            Exclusivity is not a privilege you are given.
            It is a standard you hold yourself to.
            SAVRON exists for those who have already arrived —
            and understand that the finest spaces reflect that.
          </p>
        </section>

        {/* ─── 003 — REQUEST ENTRY ─────────────────────────────────────── */}
        <section
          ref={formRef}
          style={{
            padding: "clamp(72px, 10vw, 130px) clamp(24px, 8vw, 120px)",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "clamp(40px, 8vw, 120px)", alignItems: "start",
          }}
        >
          <div>
            <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(232,228,220,0.28)", marginBottom: 28 }}>
              003 — Membership
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 600, fontSize: "clamp(36px, 4vw, 62px)", lineHeight: 1.0, color: "#e8e4dc", letterSpacing: "-0.02em", marginBottom: 32 }}>
              Request Entry.
            </h2>
            <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 14, lineHeight: 1.9, color: "rgba(232,228,220,0.42)", maxWidth: 360, marginBottom: 44 }}>
              Reserve your access now. Your digital membership pass
              will be delivered directly to your inbox — ready for
              Apple Wallet or Google Wallet, always with you.
            </p>
            {["Apple Wallet", "Google Wallet"].map((item) => (
              <p key={item} style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 11, letterSpacing: "0.18em", color: "rgba(232,228,220,0.22)", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ width: 24, height: 1, background: "rgba(232,228,220,0.14)", display: "inline-block" }} />
                {item}
              </p>
            ))}
          </div>

          <div style={{ paddingTop: 8, display: "flex", flexDirection: "column", gap: 36 }}>
            {[
              { label: "Full Name",      type: "text",  key: "name",  placeholder: "Your name" },
              { label: "Email Address",  type: "email", key: "email", placeholder: "your@email.com" },
            ].map(({ label, type, key, placeholder }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontFamily: "var(--font-montserrat)", fontWeight: 500, fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(232,228,220,0.28)" }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={formData[key as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  style={{
                    background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(232,228,220,0.14)",
                    color: "#e8e4dc", padding: "12px 0",
                    fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 15,
                    outline: "none", width: "100%", transition: "border-color 0.3s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderBottomColor = "rgba(232,228,220,0.14)")}
                />
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={loading || !isValid}
              style={{
                marginTop: 8, background: "transparent",
                border: "1px solid rgba(232,228,220,0.18)",
                color: isValid ? "rgba(232,228,220,0.72)" : "rgba(232,228,220,0.2)",
                padding: "18px 36px", width: "100%",
                fontFamily: "var(--font-montserrat)", fontWeight: 500,
                fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase",
                cursor: isValid && !loading ? "pointer" : "not-allowed",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={e => {
                if (!loading && isValid) {
                  e.currentTarget.style.background = "rgba(232,228,220,0.06)";
                  e.currentTarget.style.borderColor = "rgba(232,228,220,0.36)";
                  e.currentTarget.style.color = "#e8e4dc";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(232,228,220,0.18)";
                e.currentTarget.style.color = isValid ? "rgba(232,228,220,0.72)" : "rgba(232,228,220,0.2)";
              }}
            >
              {loading ? "Sending..." : "Request Entry →"}
            </button>

            {status && (
              <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 12, letterSpacing: "0.1em", textAlign: "center", color: status.type === "success" ? "rgba(175,205,170,0.8)" : "rgba(210,130,130,0.8)" }}>
                {status.text}
              </p>
            )}

            <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,228,220,0.14)", textAlign: "center" }}>
              Invitation only &nbsp;·&nbsp; North Loop, Minneapolis
            </p>
          </div>
        </section>

        {/* ─── FOOTER ──────────────────────────────────────────────────── */}
        <footer style={{ borderTop: "1px solid rgba(232,228,220,0.07)", padding: "36px clamp(24px, 8vw, 120px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(232,228,220,0.16)" }}>
            © SAVRON 2026
          </p>
          <p style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(232,228,220,0.16)" }}>
            savronmn.com
          </p>
        </footer>

      </div>
    </>
  );
}
