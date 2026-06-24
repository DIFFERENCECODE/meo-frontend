"use client";
import { useState, useEffect } from "react";
import { AuthShell, Field, Btn, Banner, linkRow, linkA } from "@/components/auth/ui";
export default function Reset() {
  const [email,setEmail]=useState(""); const [code,setCode]=useState(""); const [password,setPassword]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  useEffect(()=>{ const e=new URLSearchParams(window.location.search).get("email"); if(e) setEmail(e); },[]);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); setLoading(true);
    try{ const r=await fetch("/api/auth/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code,password})});
      const d=await r.json(); if(!r.ok){ setErr(d.error||"Reset failed."); return; }
      window.location.href="/login?reset=1";
    }catch{ setErr("Network error — please try again."); } finally{ setLoading(false); }
  }
  return (<AuthShell title="Choose a new password" subtitle="Enter the code we emailed + your new password">
    <Banner kind="err">{err}</Banner>
    <form onSubmit={submit}>
      <Field label="Email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Field label="Reset code" inputMode="numeric" required value={code} onChange={e=>setCode(e.target.value)} placeholder="123456"/>
      <Field label="New password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
      <Btn loading={loading} type="submit">Reset password</Btn>
    </form>
    <div style={linkRow}><a style={linkA} href="/login">Back to sign in</a></div>
  </AuthShell>);
}
