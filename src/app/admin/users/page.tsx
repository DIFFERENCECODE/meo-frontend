'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { useDebounce } from '@/lib/hooks';
import { Search, Trash2, UserCog, Zap, X, Download, ArrowUp, ArrowDown } from 'lucide-react';

interface User {
  cognito_sub: string;
  email: string;
  name: string | null;
  meterbolic_userid: string | null;
  organization_id: number | null;
  created_at: string | null;
  role: string;
  vendor_id: string;
  metabolic_goals: string[];
}

// Column keys driving sort. Kept in sync with the table headers below
// so clicking a header is enough to switch sort target — no separate
// dropdown needed.
type SortKey = 'email' | 'name' | 'role' | 'meterbolic_userid' | 'vendor_id' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function UsersPage() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [saving, setSaving] = useState(false);
  // Default to created_at DESC so the freshest signups land at the top —
  // matches the dashboard's "Recent Signups" panel ordering.
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const token = getIdToken();

  const fetchUsers = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const debouncedSearch = useDebounce(search, 300);

  // Sort + filter pipeline. Filter first (cheaper), then sort.
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const matched = users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (u.email || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.meterbolic_userid || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...matched].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      // created_at sorts as date; everything else as case-insensitive string.
      if (sortKey === 'created_at') {
        return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
      }
      return av.toLowerCase().localeCompare(bv.toLowerCase()) * dir;
    });
  }, [users, debouncedSearch, sortKey, sortDir, roleFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // First click on a fresh column: descending for date, ascending
      // for everything else (alphabetical readability default).
      setSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  // CSV export of the *currently filtered + sorted* set, so the file
  // matches what the admin sees on screen. RFC 4180 quoting: wrap every
  // field in double quotes and escape embedded quotes by doubling.
  const exportCsv = () => {
    const headers = ['email', 'name', 'role', 'meterbolic_userid', 'vendor_id', 'created_at', 'cognito_sub'];
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(','),
      ...filtered.map((u) =>
        [u.email, u.name, u.role, u.meterbolic_userid, u.vendor_id, u.created_at, u.cognito_sub]
          .map(escape).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meo-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditVendor(user.vendor_id);
  };

  const handleSave = async () => {
    if (!editingUser || !token) return;
    setSaving(true);
    await fetch(`/api/admin/users/${editingUser.cognito_sub}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole, vendor_id: editVendor }),
    });
    setEditingUser(null);
    setSaving(false);
    fetchUsers();
  };

  const handleDelete = async (sub: string) => {
    if (!token || !confirm('Delete this user and all their data?')) return;
    await fetch(`/api/admin/users/${sub}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const handleProvision = async (sub: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/users/${sub}/provision`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    alert(`Provisioning: ${data.status} ${data.meterbolic_userid || ''}`);
    fetchUsers();
  };

  // Sort-key map for the header row. Headers without a matching key
  // (e.g. "Actions") are rendered non-clickable.
  const HEADERS: Array<{ label: string; key?: SortKey }> = [
    { label: 'Email', key: 'email' },
    { label: 'Name', key: 'name' },
    { label: 'Role', key: 'role' },
    { label: 'Meterbolic ID', key: 'meterbolic_userid' },
    { label: 'Vendor', key: 'vendor_id' },
    { label: 'Created', key: 'created_at' },
    { label: 'Actions' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>User Management</h1>
          <p className="text-sm" style={{ color: colors.muted }}>
            {filtered.length === users.length
              ? `${users.length} total users`
              : `${filtered.length} of ${users.length} users`}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.foreground }}
          title="Export visible users to CSV"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Search + role filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.muted }} />
          <input
            type="text"
            placeholder="Search by email, name, role, or Meterbolic ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.foreground }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg px-3 py-2.5 border text-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.foreground }}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          {['demo', 'patient', 'clinician', 'practitioner', 'admin'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                {HEADERS.map((h) => {
                  const sortable = !!h.key;
                  const isActive = sortable && sortKey === h.key;
                  return (
                    <th
                      key={h.label}
                      onClick={sortable ? () => toggleSort(h.key as SortKey) : undefined}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider select-none ${sortable ? 'cursor-pointer hover:opacity-80' : ''}`}
                      style={{ color: isActive ? colors.foreground : colors.muted }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {h.label}
                        {isActive && (sortDir === 'asc'
                          ? <ArrowUp className="h-3 w-3" />
                          : <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center animate-pulse" style={{ color: colors.muted }}>Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: colors.muted }}>No users found</td></tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.cognito_sub} style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                    <td className="px-4 py-3" style={{ color: colors.foreground }}>{user.email}</td>
                    <td className="px-4 py-3" style={{ color: colors.foreground }}>{user.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: user.role === 'admin' ? `${colors.error}20` : user.role === 'patient' ? `${colors.success}20` : `${colors.warning}20`,
                          color: user.role === 'admin' ? colors.error : user.role === 'patient' ? colors.success : colors.warning,
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: user.meterbolic_userid ? colors.foreground : colors.muted }}>
                      {user.meterbolic_userid || 'not provisioned'}
                    </td>
                    <td className="px-4 py-3" style={{ color: colors.foreground }}>{user.vendor_id}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: colors.muted }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(user)} className="p-1.5 rounded hover:opacity-80" title="Edit">
                          <UserCog className="h-4 w-4" style={{ color: colors.primary }} />
                        </button>
                        {!user.meterbolic_userid && (
                          <button onClick={() => handleProvision(user.cognito_sub)} className="p-1.5 rounded hover:opacity-80" title="Provision">
                            <Zap className="h-4 w-4" style={{ color: colors.warning }} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(user.cognito_sub)} className="p-1.5 rounded hover:opacity-80" title="Delete">
                          <Trash2 className="h-4 w-4" style={{ color: colors.error }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border p-6 w-full max-w-md" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: colors.foreground }}>Edit User</h3>
              <button onClick={() => setEditingUser(null)}><X className="h-5 w-5" style={{ color: colors.muted }} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: colors.muted }}>{editingUser.email}</p>

            <label className="block text-xs mb-1" style={{ color: colors.muted }}>Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-4 text-sm"
              style={{ backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.foreground }}
            >
              {['demo', 'patient', 'clinician', 'practitioner', 'admin'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label className="block text-xs mb-1" style={{ color: colors.muted }}>Vendor</label>
            <select
              value={editVendor}
              onChange={(e) => setEditVendor(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border mb-6 text-sm"
              style={{ backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.foreground }}
            >
              {['meterbolic', 'eos'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg py-2 font-medium disabled:opacity-70"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 rounded-lg py-2 border"
                style={{ borderColor: colors.cardBorder, color: colors.muted }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
