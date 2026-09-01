'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getListings, saveListing, updateListing, deleteListing, type ClinicianListing } from '../store';

const CATEGORIES: { value: ClinicianListing['category']; label: string; color: string }[] = [
  { value: 'metabolic',     label: 'Metabolic',      color: '#a4d65e' },
  { value: 'mental-health', label: 'Mental health',  color: '#8b8df6' },
  { value: 'lifestyle',     label: 'Lifestyle',      color: '#f5b942' },
  { value: 'diagnostics',   label: 'Diagnostics',    color: '#4ade80' },
  { value: 'other',         label: 'Other',          color: 'rgba(255,255,255,.6)' },
];

const STATUS_COLORS = {
  active: { bg: 'rgba(164,214,94,.12)', fg: '#a4d65e', bd: 'rgba(164,214,94,.3)' },
  draft:  { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.6)', bd: 'rgba(255,255,255,.15)' },
};

function catColor(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? 'rgba(255,255,255,.6)';
}

interface FormState {
  title: string;
  description: string;
  category: ClinicianListing['category'];
  price: string;
  duration: string;
  availability: string;
  isActive: boolean;
}

const EMPTY: FormState = { title: '', description: '', category: 'metabolic', price: '', duration: '', availability: '', isActive: true };

export default function ListingsPage() {
  const [listings, setListings] = useState<ClinicianListing[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const refresh = useCallback(() => setListings(getListings()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const openModal = () => { setForm(EMPTY); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = () => {
    saveListing({
      title: form.title || 'Untitled',
      description: form.description,
      category: form.category,
      price: parseFloat(form.price) || 0,
      duration: parseInt(form.duration) || 60,
      availability: form.availability,
      isActive: form.isActive,
    });
    refresh();
    closeModal();
  };

  const toggleActive = (id: string, current: boolean) => {
    updateListing(id, { isActive: !current });
    refresh();
  };

  const remove = (id: string) => {
    deleteListing(id);
    refresh();
  };

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
    background: 'rgba(20,45,45,.7)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', ...style,
  });

  return (
    <main style={{ flex: 1, minWidth: 0, position: 'relative', overflowY: 'auto', padding: '34px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-.025em' }}>Listings</h1>
          <div style={{ marginTop: 7, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>The services patients can book with you inside MeO</div>
        </div>
        <button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '12px 22px', border: 0, borderRadius: 999, background: '#a4d65e', color: '#123030', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add listing
        </button>
      </div>

      {/* Empty state */}
      {listings.length === 0 ? (
        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '70px 30px', borderRadius: 12, border: '1.5px dashed rgba(255,255,255,.18)', background: 'rgba(40,70,70,.35)' }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(164,214,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a4d65e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h12M9 12h12M9 18h12M3 6l1.4 1.4L7 5M3 12l1.4 1.4L7 11M3 18l1.4 1.4L7 17"/></svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>No listings yet</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.55)', maxWidth: 400, textAlign: 'center', lineHeight: 1.5 }}>Create your first listing so patients can book a session directly from their MeO app.</div>
          <button onClick={openModal} style={{ marginTop: 6, cursor: 'pointer', padding: '10px 20px', borderRadius: 999, background: 'rgba(164,214,94,.1)', border: '1px solid rgba(164,214,94,.45)', color: '#a4d65e', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Add your first listing</button>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listings.map((l) => {
            const sc = l.isActive ? STATUS_COLORS.active : STATUS_COLORS.draft;
            const cc = catColor(l.category);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 12, background: 'rgba(40,70,70,.8)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{l.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: sc.bg, color: sc.fg, border: `1px solid ${sc.bd}` }}>
                      {l.isActive ? 'Active' : 'Draft'}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: `${cc}12`, color: cc, border: `1px solid ${cc}30` }}>
                      {CATEGORIES.find((c) => c.value === l.category)?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, marginBottom: 6 }}>{l.description}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                    <span>£{l.price}</span>
                    <span>·</span>
                    <span>{l.duration} mins</span>
                    {l.availability && <><span>·</span><span>{l.availability}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(l.id, l.isActive)} style={{ padding: '7px 14px', borderRadius: 999, background: 'none', border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.7)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {l.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(l.id)} style={{ padding: '7px 14px', borderRadius: 999, background: 'none', border: '1px solid rgba(248,113,113,.3)', color: '#f87171', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New listing modal */}
      {modalOpen && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,26,.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: '100%', overflowY: 'auto', borderRadius: 16, background: '#22494a', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>New listing</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>Visible to patients once active</div>
              </div>
              <button onClick={closeModal} style={{ width: 32, height: 32, border: 0, borderRadius: 999, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Title</div>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Metabolic reset consultation" style={inp()} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Description</div>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="What does this session cover?" style={{ ...inp(), resize: 'none', lineHeight: '1.55' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Category</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map((c) => {
                    const sel = form.category === c.value;
                    return (
                      <button key={c.value} onClick={() => setForm((f) => ({ ...f, category: c.value }))} style={{ cursor: 'pointer', padding: '8px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', background: sel ? 'rgba(255,255,255,.05)' : 'transparent', border: `1px solid ${sel ? c.color : 'rgba(255,255,255,.16)'}`, color: sel ? c.color : 'rgba(255,255,255,.6)' }}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Price (£)</div>
                  <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="120" style={inp()} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Duration (mins)</div>
                  <input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="45" style={inp()} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Availability</div>
                <input value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} placeholder="e.g. Tue & Thu, 09:00–13:00 · UK time" style={inp()} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(20,45,45,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Active</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Patients can book this listing now</div>
                </div>
                <button onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} style={{ width: 48, height: 27, flexShrink: 0, border: 0, borderRadius: 999, cursor: 'pointer', padding: 3, display: 'flex', justifyContent: form.isActive ? 'flex-end' : 'flex-start', background: form.isActive ? '#a4d65e' : 'rgba(255,255,255,.18)', transition: 'background .2s', fontFamily: 'inherit' }}>
                  <span style={{ width: 21, height: 21, borderRadius: 999, background: '#fff', display: 'block' }} />
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <button onClick={closeModal} style={{ cursor: 'pointer', padding: '11px 20px', borderRadius: 999, background: 'none', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.75)', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} style={{ cursor: 'pointer', padding: '11px 26px', border: 0, borderRadius: 999, background: '#a4d65e', color: '#123030', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}>Save listing</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
