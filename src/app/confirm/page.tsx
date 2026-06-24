"use client";
import { useState, useEffect } from "react";
import { AuthShell, Field, Btn, GhostBtn, Banner, linkRow, linkA } from "@/components/auth/ui";
export default function Confirm() {
  const [email,setEmail]=useState(""); const [code,setCode]=useState("");
  const [err,setErr]=useState(""); const [ok,setOk]=useState(""); const [loading,setLoading]=useState(false);
  useEffect(()=>{ const e=new URLSearchParams(window.location.search).get("email"); if(e) setEmail(e); },[]);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try{ const r=await fetch("/api/auth/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code})});
      const d=await r.json(); if(!r.ok){ setErr(d.error||"Confirmation failed."); return; }
      window.location.href="/login?confirmed=1";
    }catch{ setErr("Network error — please try again."); } finally{ setLoading(false); }
  }
  async function resend(){ setErr(""); setOk(""); try{ const r=await fetch("/api/auth/resend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})}); const d=await r.json(); if(r.ok) setOk("A new code has been sent."); else setErr(d.error||"Could not resend."); }catch{ setErr("Network error."); } }
  return (<AuthShell title="Verify your email" subtitle="Enter the 6-digit code we emailed you">
    <Banner kind="err">{err}</Banner><Banner kind="ok">{ok}</Banner>
    <form onSubmit={submit}>
      <Field label="Email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Field label="Verification code" inputMode="numeric" required value={code} onChange={e=>setCode(e.target.value)} placeholder="123456"/>
      <Btn loading={loading} type="submit">Verify & continue</Btn>
    </form>
    <GhostBtn onClick={resend}>Resend code</GhostBtn>
    <div style={linkRow}><a style={linkA} href="/login">Back to sign in</a></div>
  </AuthShell>);
}
