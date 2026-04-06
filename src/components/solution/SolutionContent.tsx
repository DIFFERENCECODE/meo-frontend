'use client';

import React from 'react';
import { Star, MapPin, ChevronRight } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// Mock vendor data
const mockVendors = [
  {
    id: '1',
    name: 'EOS Dr Arup Sen',
    category: 'Consultant Physician (Stroke, Geriatric & Internal Medicine)',
    description:
      'Triple-accredited consultant physician specialising in stroke, transient ischaemic attack (TIA), geriatric medicine, and complex internal medicine.',
    rating: 4.9,
    reviews: 127,
    price: '£400/session',
    location: 'London, UK',
    tags: ['Stroke', 'TIA', 'Geriatric Medicine', 'Hypertension', 'Cognitive Health'],
    available: true,
  },
  {
    id: '2',
    name: 'Taylor Made Rehab',
    category: 'Metabolic Recovery Specialists',
    description:
      'Specialised protocol for delayed insulin response patterns. Combines targeted nutrition therapy, metabolic testing, and personalised supplementation.',
    rating: 4.9,
    reviews: 127,
    price: '£120/session',
    location: 'London, UK',
    tags: ['Insulin Resistance', 'Fatigue Protocol', 'Nutrition'],
    available: true,
  },
  {
    id: '3',
    name: 'Glucose Optimization Clinic',
    category: 'Continuous Monitoring',
    description: 'CGM-based coaching program with real-time glucose monitoring and lifestyle optimization strategies.',
    rating: 4.7,
    reviews: 203,
    price: '£150/month',
    location: 'Manchester, UK',
    tags: ['CGM', 'Coaching', 'Lifestyle'],
    available: false,
  },
];

interface VendorCard {
  id: string;
  name: string;
  category: string;
  description: string;
  price?: string;
  location?: string;
  tags: string[];
  available: boolean;
  url?: string | null;
  score?: number | null;
  rating?: number;
  reviews?: number;
}

interface SolutionContentProps {
  vendors?: VendorCard[];
}

export function SolutionContent({ vendors = [] }: SolutionContentProps) {
  const { theme } = useTheme();
  const displayVendors: VendorCard[] = vendors.length > 0 ? vendors : mockVendors;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: theme.colors.foreground }}>
          Recommended Support
        </h1>
        <p className="text-sm" style={{ color: theme.colors.muted }}>
          {vendors.length > 0 ? `${vendors.length} matches found` : 'Matched to your metabolic profile'}
        </p>
      </div>

      {/* Vendor Cards */}
      {displayVendors.map((vendor) => (
        <div
          key={vendor.id}
          className="rounded-xl p-6 border transition-all cursor-pointer group"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3
                  className="text-xl font-bold transition-colors"
                  style={{ color: theme.colors.foreground }}
                >
                  {vendor.name}
                </h3>
                {vendor.available ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${theme.colors.success}20`,
                      color: theme.colors.success,
                      border: `1px solid ${theme.colors.success}40`,
                    }}
                  >
                    Available
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${theme.colors.muted}20`,
                      color: theme.colors.muted,
                      border: `1px solid ${theme.colors.muted}40`,
                    }}
                  >
                    Waitlist
                  </span>
                )}
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                {vendor.category}
              </p>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: theme.colors.muted }}>
                {vendor.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {vendor.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md text-xs"
                    style={{
                      backgroundColor: theme.colors.accent,
                      color: theme.colors.foreground,
                      border: `1px solid ${theme.colors.cardBorder}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-sm" style={{ color: theme.colors.muted }}>
                {vendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span style={{ color: theme.colors.foreground }} className="font-medium">
                      {vendor.rating}
                    </span>
                    {vendor.reviews && <span>({vendor.reviews} reviews)</span>}
                  </div>
                )}
                {vendor.score && (
                  <div className="flex items-center gap-1">
                    <span>Match: {Math.round(vendor.score * 100)}%</span>
                  </div>
                )}
                {vendor.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{vendor.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex flex-col items-end gap-3 ml-6">
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: theme.colors.foreground }}>
                  {vendor.price}
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.primaryForeground,
                }}
              >
                Book Now
                <ChevronRight className="h-4 w-4" />
              </button>
              <button className="text-sm transition-colors" style={{ color: theme.colors.muted }}>
                Learn More
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SolutionContent;
