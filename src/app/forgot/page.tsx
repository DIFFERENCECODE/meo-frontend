"use client";
import { useState } from "react";
import { AuthShell, Field, Btn, Banner, linkRow, linkA } from "@/components/auth/ui";
export default function Forgot() {
  const [email,setEmail]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); setLoading(true);
    try{ const r=await fetch("/api/auth/forgot",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      const d=await r.json(); if(!r.ok){ setErr(d.error||"Could not start reset."); return; }
      window.location.href=`/reset?email=${encodeURIComponent(email)}`;
    }catch{ setErr("Network error — please try again."); } finally{ setLoading(false); }
  }
  return (<AuthShell title="Reset your password" subtitle="We'll email you a reset code">
    <Banner kind="err">{err}</Banner>
    <form onSubmit={submit}>
      <Field label="Email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Btn loading={loading} type="submit">Send reset code</Btn>
    </form>
    <div style={linkRow}><a style={linkA} href="/login">Back to sign in</a></div>
  </AuthShell>);
}
