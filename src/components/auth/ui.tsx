"use client";
import React, { useEffect } from "react";

// Brand tokens mirrored from the marketing site's design-tokens.ts
// (meterbolic.com single source of truth) so login feels continuous.
const C = {
  bg: "#1c4a40", bgDeep: "#143730", card: "rgba(30,70,60,0.85)",
  border: "rgba(255,255,255,0.14)", borderInteractive: "rgba(255,255,255,0.40)",
  primary: "#a4d65e", primaryFg: "#0f2a1f", fg: "#f0ede6", muted: "#c4bfb8", link: "#cdf08a",
};
const FONT = 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (document.getElementById("manrope-font")) return;
    const l = document.createElement("link");
    l.id = "manrope-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: FONT, background: `radial-gradient(900px 500px at 50% -10%, rgba(164,214,94,0.12), transparent), ${C.bgDeep}` }}>
      <div style={{ width: "100%", maxWidth: 420, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: "36px 28px", boxShadow: "0 24px 70px rgba(0,0,0,.45)", backdropFilter: "blur(10px)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: C.primary, color: C.primaryFg,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 23, margin: "0 auto 16px" }}>M</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.fg, margin: "0 0 6px", letterSpacing: "-.3px" }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field(p: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = p;
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.fg, marginBottom: 6 }}>{label}</span>
      <input {...rest} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.borderInteractive}`,
        fontSize: 15, outline: "none", boxSizing: "border-box", color: C.fg, background: "rgba(255,255,255,0.05)", fontFamily: FONT }} />
    </label>
  );
}
export function Btn({ children, loading, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...p} disabled={loading || p.disabled}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: C.primary, color: C.primaryFg,
        fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}>
      {loading ? "Please wait…" : children}
    </button>
  );
}
export function GhostBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${C.borderInteractive}`,
        background: "rgba(255,255,255,0.03)", color: C.fg, fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: "pointer", marginTop: 8 }}>{children}</button>
  );
}
export function Banner({ kind, children }: { kind: "err" | "ok"; children: React.ReactNode }) {
  if (!children) return null;
  const err = kind === "err";
  return <div style={{ fontSize: 13, padding: "10px 12px", borderRadius: 10, marginBottom: 14,
    background: err ? "rgba(245,158,11,0.14)" : "rgba(164,214,94,0.16)", color: err ? "#fcd34d" : C.link,
    border: `1px solid ${err ? "rgba(245,158,11,0.35)" : "rgba(164,214,94,0.35)"}` }}>{children}</div>;
}
export const linkRow: React.CSSProperties = { textAlign: "center", fontSize: 13, color: "#c4bfb8", marginTop: 18 };
export const linkA: React.CSSProperties = { color: "#cdf08a", fontWeight: 600, textDecoration: "none" };
