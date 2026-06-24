"use client";
import { useState } from "react";
import { AuthShell, Field, Btn, Banner, linkRow, linkA } from "@/components/auth/ui";
export default function Signup() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); setLoading(true);
    try{ const r=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});
      const d=await r.json(); if(!r.ok){ setErr(d.error||"Sign up failed."); return; }
      window.location.href=`/confirm?email=${encodeURIComponent(email)}`;
    }catch{ setErr("Network error — please try again."); } finally{ setLoading(false); }
  }
  return (<AuthShell title="Create your account" subtitle="Start your Meo journey">
    <Banner kind="err">{err}</Banner>
    <form onSubmit={submit}>
      <Field label="Name" type="text" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Field label="Password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
      <p style={{fontSize:12,color:"#64748b",margin:"-6px 0 12px"}}>At least 8 characters, with upper & lower case, a number and a symbol.</p>
      <Btn loading={loading} type="submit">Create account</Btn>
    </form>
    <div style={linkRow}>Already have an account? <a style={linkA} href="/login">Sign in</a></div>
  </AuthShell>);
}
