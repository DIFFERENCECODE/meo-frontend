'use client';

import React, { useState, useEffect } from 'react';
import { User, Search, ChevronRight, Circle, Loader2 } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';

interface Patient {
  session_id: string;
  name: string;
  metabolic_goals: string[];
  role: string;
  vendor_id: string;
}

interface PatientListProps {
  onSelectPatient?: (sessionId: string) => void;
  selectedPatientId?: string | null;
  className?: string;
}

export function PatientList({ onSelectPatient, selectedPatientId, className }: PatientListProps) {
  const { theme } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Patient[]) => setPatients(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.session_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`rounded-xl border overflow-hidden ${className || ''}`}
      style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}
    >
      <div className="p-4 border-b" style={{ borderColor: theme.colors.cardBorder }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>Patient List</h3>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.colors.accent, color: theme.colors.muted }}>
            {filtered.length} patients
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.muted }} />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.foreground }}
          />
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.colors.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-center" style={{ color: theme.colors.muted }}>
            {patients.length === 0 ? 'No patients yet' : 'No matches'}
          </p>
        ) : (
          filtered.map((patient) => (
            <button
              key={patient.session_id}
              onClick={() => onSelectPatient?.(patient.session_id)}
              className="w-full p-3 flex items-center gap-3 border-b transition-colors"
              style={{
                borderColor: theme.colors.cardBorder,
                backgroundColor: selectedPatientId === patient.session_id ? theme.colors.accent : 'transparent',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.accent }}>
                <User className="h-5 w-5" style={{ color: theme.colors.primary }} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm" style={{ color: theme.colors.foreground }}>{patient.name}</span>
                  <Circle className="h-2 w-2" style={{ fill: patient.role === 'patient' ? theme.colors.success : theme.colors.warning, color: patient.role === 'patient' ? theme.colors.success : theme.colors.warning }} />
                </div>
                <p className="text-xs" style={{ color: theme.colors.muted }}>
                  {patient.metabolic_goals.length > 0 ? patient.metabolic_goals.join(', ') : patient.role}
                </p>
              </div>
              <ChevronRight className="h-4 w-4" style={{ color: theme.colors.muted }} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default PatientList;
