'use client';

import React, { useState } from 'react';
import { User, Search, ChevronRight, Circle } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// Mock patient data
const mockPatients = [
  {
    id: '1',
    name: 'Sarah Johnson',
    age: 45,
    lastVisit: '2024-01-15',
    status: 'active',
    riskLevel: 'high',
    condition: 'Type 2 Diabetes',
  },
  {
    id: '2',
    name: 'Michael Chen',
    age: 52,
    lastVisit: '2024-01-14',
    status: 'active',
    riskLevel: 'medium',
    condition: 'Pre-diabetes',
  },
  {
    id: '3',
    name: 'Emma Williams',
    age: 38,
    lastVisit: '2024-01-12',
    status: 'pending',
    riskLevel: 'low',
    condition: 'Metabolic Syndrome',
  },
  {
    id: '4',
    name: 'James Brown',
    age: 61,
    lastVisit: '2024-01-10',
    status: 'active',
    riskLevel: 'high',
    condition: 'Insulin Resistance',
  },
];

interface PatientListProps {
  onSelectPatient?: (patientId: string) => void;
  className?: string;
}

export function PatientList({ onSelectPatient, className }: PatientListProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const filteredPatients = mockPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.muted;
    }
  };

  const handleSelectPatient = (id: string) => {
    setSelectedPatient(id);
    onSelectPatient?.(id);
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden ${className || ''}`}
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.cardBorder,
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: theme.colors.cardBorder }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-semibold"
            style={{ color: theme.colors.foreground }}
          >
            Patient List
          </h3>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.muted,
            }}
          >
            {filteredPatients.length} patients
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.colors.muted }}
          />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.cardBorder,
              color: theme.colors.foreground,
            }}
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredPatients.map((patient) => (
          <button
            key={patient.id}
            onClick={() => handleSelectPatient(patient.id)}
            className="w-full p-3 flex items-center gap-3 border-b transition-colors"
            style={{
              borderColor: theme.colors.cardBorder,
              backgroundColor:
                selectedPatient === patient.id
                  ? theme.colors.accent
                  : 'transparent',
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <User className="h-5 w-5" style={{ color: theme.colors.primary }} />
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span
                  className="font-medium text-sm"
                  style={{ color: theme.colors.foreground }}
                >
                  {patient.name}
                </span>
                <Circle
                  className="h-2 w-2"
                  style={{ fill: getRiskColor(patient.riskLevel), color: getRiskColor(patient.riskLevel) }}
                />
              </div>
              <p className="text-xs" style={{ color: theme.colors.muted }}>
                {patient.condition} • Age {patient.age}
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight
              className="h-4 w-4"
              style={{ color: theme.colors.muted }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default PatientList;
