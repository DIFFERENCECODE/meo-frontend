"use client";
import { useState } from "react";
import { AuthShell, Field, Btn, GhostBtn, Banner, linkRow, linkA } from "@/components/auth/ui";
import { storeIdToken, storeRefreshToken, getGoogleLoginUrl, getAppleLoginUrl } from "@/app/lib/auth";
export default function Login() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [unconfirmed,setUnconfirmed]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); setUnconfirmed(false); setLoading(true);
    try{ const r=await fetch("/api/auth/signin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const d=await r.json();
      if(!r.ok){ if(d.code==="UserNotConfirmedException") setUnconfirmed(true); setErr(d.error||"Sign in failed."); return; }
      storeIdToken(d.id_token); if(d.refresh_token) storeRefreshToken(d.refresh_token);
      window.location.href="/";
    }catch{ setErr("Network error — please try again."); } finally{ setLoading(false); }
  }
  return (<AuthShell title="Welcome back" subtitle="Sign in to your Meo account">
    {(err || unconfirmed) && <Banner kind="err">{err}{unconfirmed && <> — <a style={linkA} href={`/confirm?email=${encodeURIComponent(email)}`}>verify now</a></>}</Banner>}
    <form onSubmit={submit}>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
      <div style={{textAlign:"right",marginBottom:8}}><a style={{...linkA,fontSize:13}} href="/forgot">Forgot password?</a></div>
      <Btn loading={loading} type="submit">Sign in</Btn>
    </form>
    <GhostBtn onClick={()=>{window.location.href=getGoogleLoginUrl();}}>Continue with Google</GhostBtn>
    <GhostBtn onClick={()=>{window.location.href=getAppleLoginUrl();}}>Continue with Apple</GhostBtn>
    <div style={linkRow}>Need an account? <a style={linkA} href="/signup">Sign up</a></div>
  </AuthShell>);
}
