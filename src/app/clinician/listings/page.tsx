'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getListings, saveListing, updateListing, deleteListing, type ClinicianListing } from '../store';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ListChecks, Clock, PoundSterling, Tag } from 'lucide-react';
import { Check } from 'lucide-react';

const CATEGORIES: ClinicianListing['category'][] = ['metabolic', 'mental-health', 'lifestyle', 'diagnostics', 'other'];
const CATEGORY_COLORS: Record<string, string> = {
  metabolic: '#a4d65e', 'mental-health': '#6366f1', lifestyle: '#f59e0b', diagnostics: '#22c55e', other: '#94a3b8',
};

// ─── Listing Form Modal ───────────────────────────────────────────────────────

interface FormState {
  title: string; description: string; category: ClinicianListing['category'];
  price: string; duration: string; availability: string; isActive: boolean;
}

const EMPTY_FORM: FormState = {
  title: '', description: '', category: 'metabolic',
  price: '', duration: '60', availability: '', isActive: true,
};

function ListingModal({ initial, onSave, onClose }: {
  initial?: ClinicianListing; onSave: (f: FormState) => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const [form, setForm] = useState<FormState>(
    initial
      ? { title: initial.title, description: initial.description, category: initial.category,
          price: String(initial.price), duration: String(initial.duration),
          availability: initial.availability, isActive: initial.isActive }
      : EMPTY_FORM,
  );
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { setError('Enter a valid price.'); return; }
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1) { setError('Enter a valid duration.'); return; }
    onSave(form);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: `1px solid ${colors.cardBorder}`,
    color: colors.foreground, fontSize: '16px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: colors.cardBorder }}>
          <h2 className="text-base font-semibold" style={{ color: colors.foreground }}>{initial ? 'Edit Listing' : 'New Listing'}</h2>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: colors.muted, background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Title <span style={{ color: colors.primary }}>*</span></label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 60-min Metabolic Health Consultation"
              className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
              placeholder="What does this session include?"
              className="w-full px-3 py-3 rounded-lg outline-none resize-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => set('category', c)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize"
                  style={{
                    background: form.category === c ? `${CATEGORY_COLORS[c]}20` : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${form.category === c ? `${CATEGORY_COLORS[c]}60` : 'rgba(255,255,255,0.15)'}`,
                    color: form.category === c ? CATEGORY_COLORS[c] : 'rgba(255,255,255,0.6)',
                  }}>
                  {c.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Price (£) <span style={{ color: colors.primary }}>*</span></label>
              <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="120"
                className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Duration (min) <span style={{ color: colors.primary }}>*</span></label>
              <input type="number" min="1" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="60"
                className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Availability</label>
            <input value={form.availability} onChange={(e) => set('availability', e.target.value)}
              placeholder="e.g. Mon–Fri 9am–5pm, Tue evenings"
              className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
          </div>

          <button type="button" onClick={() => set('isActive', !form.isActive)}
            className="flex items-center gap-2.5 text-sm">
            {form.isActive
              ? <ToggleRight className="h-6 w-6" style={{ color: colors.primary }} />
              : <ToggleLeft className="h-6 w-6" style={{ color: colors.muted }} />}
            <span style={{ color: form.isActive ? colors.foreground : colors.muted }}>
              {form.isActive ? 'Active — visible to patients' : 'Inactive — hidden from patients'}
            </span>
          </button>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: colors.cardBorder }}>
          <button onClick={submit}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: colors.primary, color: colors.primaryForeground }}>
            <Check className="h-4 w-4" />
            {initial ? 'Save Changes' : 'Create Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Listings Page ────────────────────────────────────────────────────────────

export default function ListingsPage() {
  const { colors } = useTheme();
  const [listings, setListings] = useState<ClinicianListing[]>([]);
  const [modal, setModal] = useState<'new' | ClinicianListing | null>(null);

  useEffect(() => setListings(getListings()), []);

  const refresh = () => setListings(getListings());

  const handleSave = (form: FormState) => {
    if (modal === 'new') {
      saveListing({ ...form, price: Number(form.price), duration: Number(form.duration) });
    } else if (modal && typeof modal !== 'string') {
      updateListing(modal.id, { ...form, price: Number(form.price), duration: Number(form.duration) });
    }
    setModal(null);
    refresh();
  };

  const toggleActive = (l: ClinicianListing) => {
    updateListing(l.id, { isActive: !l.isActive });
    refresh();
  };

  const remove = (id: string) => {
    if (!confirm('Delete this listing?')) return;
    deleteListing(id);
    refresh();
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.foreground }}>Listings</h1>
          <p className="text-sm" style={{ color: colors.muted }}>{listings.length} service{listings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ background: colors.primary, color: colors.primaryForeground }}
        >
          <Plus className="h-4 w-4" /> New Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center space-y-4"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <ListChecks className="h-12 w-12 mx-auto opacity-25" style={{ color: colors.muted }} />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.foreground }}>No listings yet</p>
            <p className="text-sm mt-1" style={{ color: colors.muted }}>Create your first service listing to appear in the marketplace.</p>
          </div>
          <button onClick={() => setModal('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: colors.primary, color: colors.primaryForeground }}>
            <Plus className="h-4 w-4" /> Add First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {listings.map((l) => {
            const catColor = CATEGORY_COLORS[l.category] ?? '#94a3b8';
            return (
              <div key={l.id} className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, opacity: l.isActive ? 1 : 0.6 }}>
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${catColor}18`, color: catColor }}>
                        {l.category.replace('-', ' ')}
                      </span>
                      {!l.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: colors.muted }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-1.5 leading-snug" style={{ color: colors.foreground }}>{l.title}</p>
                    {l.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: colors.muted }}>{l.description}</p>}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs" style={{ color: colors.muted }}>
                  <span className="flex items-center gap-1">
                    <PoundSterling className="h-3 w-3" /> {l.price}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {l.duration} min
                  </span>
                  {l.availability && (
                    <span className="flex items-center gap-1 truncate">
                      <Tag className="h-3 w-3 flex-shrink-0" /> {l.availability}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: colors.cardBorder }}>
                  <button onClick={() => toggleActive(l)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: colors.muted }}>
                    {l.isActive ? <ToggleRight className="h-3.5 w-3.5" style={{ color: colors.primary }} /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {l.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => setModal(l)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: colors.muted }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => remove(l.id)} className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ListingModal
          initial={modal === 'new' ? undefined : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
