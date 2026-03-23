'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { Trash2, Package, BookOpen } from 'lucide-react';

interface QdrantPoint {
  id: string;
  payload: Record<string, any>;
}

export default function ContentPage() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'vendors' | 'knowledge'>('vendors');
  const [vendors, setVendors] = useState<QdrantPoint[]>([]);
  const [knowledge, setKnowledge] = useState<QdrantPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const token = getIdToken();

  const fetchContent = () => {
    if (!token) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/admin/content/vendors', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/content/knowledge', { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, k]) => {
        setVendors(Array.isArray(v) ? v : []);
        setKnowledge(Array.isArray(k) ? k : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchContent(); }, []);

  const handleDelete = async (collection: 'vendors' | 'knowledge', id: string) => {
    if (!token || !confirm(`Delete this ${collection === 'vendors' ? 'vendor' : 'knowledge'} entry?`)) return;
    await fetch(`/api/admin/content/${collection}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchContent();
  };

  const items = tab === 'vendors' ? vendors : knowledge;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: colors.foreground }}>Content Management</h1>
      <p className="text-sm mb-6" style={{ color: colors.muted }}>Manage Qdrant vector store content (vendors and knowledge base)</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: colors.accent }}>
        {[
          { id: 'vendors' as const, label: 'Vendors', icon: Package, count: vendors.length },
          { id: 'knowledge' as const, label: 'Knowledge Base', icon: BookOpen, count: knowledge.length },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? colors.primary : 'transparent',
                color: isActive ? colors.primaryForeground : colors.muted,
              }}
            >
              <Icon className="h-4 w-4" />
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {/* Content List */}
      {loading ? (
        <p className="animate-pulse py-8 text-center" style={{ color: colors.muted }}>Loading content...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
          <p style={{ color: colors.muted }}>
            {tab === 'vendors' ? 'No vendors in Qdrant. Qdrant may not be connected.' : 'No knowledge base entries.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate" style={{ color: colors.foreground }}>
                      {item.payload?.title || item.payload?.name || `ID: ${item.id}`}
                    </p>
                    {item.payload?.category && (
                      <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.accent, color: colors.muted }}>
                        {item.payload.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: colors.muted }}>
                    {item.payload?.content || item.payload?.description || item.payload?.gap_solved || JSON.stringify(item.payload).slice(0, 200)}
                  </p>
                  <p className="text-xs mt-1 font-mono" style={{ color: colors.muted }}>
                    ID: {item.id}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(tab, item.id)}
                  className="p-2 rounded-lg hover:opacity-80 ml-3"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" style={{ color: colors.error }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
