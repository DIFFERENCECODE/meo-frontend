'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Activity, Stethoscope, Upload, Sun, Moon, BarChart3, MapPin, Star, ChevronRight, GripVertical, FlipHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type GraphDataPoint = {
  time: string;
  glucose: number;
  insulin: number;
};

type Vendor = {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  price: string;
  location: string;
  tags: string[];
  available: boolean;
};

// --- Grafana Service Data Types ---
interface BioAgeRecord {
  time: number;
  value: number;
  analyte: string;
  recordType: "CLINICAL" | "TARGET";
  subjectState: string;
  unit?: string;
  measurementSeries?: string;
}

interface BioAgeData {
  userid: string;
  records: BioAgeRecord[];
  count: number;
}

interface KraftDataPoint {
  time: number;
  measurementSeries: string;
  analyte: "Insulin" | "Glucose" | "Triglyceride";
  value: number;
  sessionlabel: string;
}

interface GraphData {
  user_email: string;
  bio_age_data: BioAgeData;
  kraft_curve_data: KraftDataPoint[];
}

// Transformed chart data for display
interface TransformedKraftPoint {
  time: string;
  glucose: number;
  insulin: number;
}

interface BioAgeMetrics {
  baseline: number | null;
  target: number | null;
  improvement: number | null;
  baselineDate: string | null;
  targetDate: string | null;
}

// --- Mock Vendor Data ---
const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'EOS  Dr Arup Sen',
    category: 'Consultant Physician (Stroke, Geriatric & Internal Medicine)',
    description: 'Triple‑accredited consultant physician specialising in stroke, transient ischaemic attack (TIA), geriatric medicine, and complex internal medicine. Provides holistic, patient‑centred assessments with a focus on prevention, cognitive health, and long‑term wellbeing.',
    rating: 4.9,
    reviews: 127,
    price: '£400/session',
    location: 'London, UK',
    tags: ['Stroke', 'TIA', 'Geriatric Medicine', 'Hypertension', 'Cognitive Health', 'Internal Medicine'],
    available: true,
  },
  {
    id: '2',
    name: 'Taylor Made Rehab',
    category: 'Metabolic Recovery Specialists',
    description: 'Specialised protocol for delayed insulin response patterns. Combines targeted nutrition therapy, metabolic testing, and personalised supplementation.',
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

// --- Helper Functions for Graph Data ---

// Extract graph data from retrieved_sources
function extractGraphData(sources: { type?: string; gap_solved?: string }[]): GraphData | null {
  const graphSource = sources.find(s => s.type === "graph_data");
  if (!graphSource || !graphSource.gap_solved) return null;
  
  try {
    return JSON.parse(graphSource.gap_solved);
  } catch (e) {
    console.error("Failed to parse graph data:", e);
    return null;
  }
}

// Get baseline and target from bio age data
function getBioAgeMetrics(data: BioAgeData): BioAgeMetrics {
  const baseline = data.records.find(r => r.recordType === "CLINICAL");
  const target = data.records.find(r => r.recordType === "TARGET");
  
  return {
    baseline: baseline?.value ?? null,
    target: target?.value ?? null,
    improvement: baseline && target ? baseline.value - target.value : null,
    baselineDate: baseline ? new Date(baseline.time).toLocaleDateString() : null,
    targetDate: target ? new Date(target.time).toLocaleDateString() : null,
  };
}

// Transform kraft data for charting (group by time)
function transformKraftForChart(data: KraftDataPoint[]): TransformedKraftPoint[] {
  const timeMap = new Map<number, { time: number; Insulin?: number; Glucose?: number }>();
  
  data.forEach(point => {
    if (!timeMap.has(point.time)) {
      timeMap.set(point.time, { time: point.time });
    }
    const entry = timeMap.get(point.time)!;
    if (point.analyte === "Insulin" || point.analyte === "Glucose") {
      entry[point.analyte] = point.value;
    }
  });
  
  const sorted = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
  
  // Convert to chart format with time labels
  return sorted.map((entry, index) => ({
    time: `${(index * 0.5).toFixed(1)}hr`,
    glucose: entry.Glucose ?? 0,
    insulin: entry.Insulin ?? 0,
  }));
}

// Generate bio age trajectory data from records
function generateBioAgeTrajectory(metrics: BioAgeMetrics): BiologicalAgeDataPoint[] {
  if (metrics.baseline === null || metrics.target === null) {
    return biologicalAgeDataDefault;
  }
  
  // Generate a trajectory from baseline to target over 18 data points
  const points: BiologicalAgeDataPoint[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago
  
  const stepValue = (metrics.baseline - metrics.target) / 17;
  
  for (let i = 0; i < 18; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 5);
    points.push({
      date: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`,
      you: metrics.baseline - (stepValue * i),
      target: metrics.target,
    });
  }
  
  return points;
}

// --- Default Kraft Curve Data (fallback) ---
const kraftCurveDataDefault: GraphDataPoint[] = [
  { time: '0hr', glucose: 85, insulin: 5 },
  { time: '0.5hr', glucose: 145, insulin: 55 },
  { time: '1hr', glucose: 160, insulin: 95 },
  { time: '1.5hr', glucose: 150, insulin: 120 },
  { time: '2hr', glucose: 135, insulin: 95 },
  { time: '2.5hr', glucose: 115, insulin: 65 },
  { time: '3hr', glucose: 100, insulin: 40 },
  { time: '3.5hr', glucose: 92, insulin: 28 },
  { time: '4hr', glucose: 88, insulin: 18 },
  { time: '4.5hr', glucose: 85, insulin: 12 },
  { time: '5hr', glucose: 83, insulin: 8 },
];

// --- Biological Age Trajectory Data ---
type BiologicalAgeDataPoint = {
  date: string;
  you: number;
  target: number;
};

const biologicalAgeDataDefault: BiologicalAgeDataPoint[] = [
  { date: '09/22', you: 41.93, target: 41.5 },
  { date: '09/27', you: 41.9, target: 41.5 },
  { date: '10/02', you: 41.85, target: 41.5 },
  { date: '10/07', you: 41.8, target: 41.5 },
  { date: '10/12', you: 41.78, target: 41.5 },
  { date: '10/17', you: 41.75, target: 41.5 },
  { date: '10/22', you: 41.72, target: 41.5 },
  { date: '10/27', you: 41.68, target: 41.5 },
  { date: '11/01', you: 41.65, target: 41.5 },
  { date: '11/06', you: 41.62, target: 41.5 },
  { date: '11/11', you: 41.6, target: 41.5 },
  { date: '11/16', you: 41.58, target: 41.5 },
  { date: '11/21', you: 41.55, target: 41.5 },
  { date: '11/26', you: 41.53, target: 41.5 },
  { date: '12/01', you: 41.52, target: 41.5 },
  { date: '12/06', you: 41.51, target: 41.5 },
  { date: '12/11', you: 41.5, target: 41.5 },
  { date: '12/16', you: 41.5, target: 41.5 },
];

// --- Risk Score Gauge Component (ECharts) ---
function RiskScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : '#22c55e';

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '90%',
        center: ['50%', '50%'],
        progress: {
          show: true,
          width: 8,
          roundCap: true,
          itemStyle: {
            color: color,
          },
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 8,
            color: [[1, 'rgba(255, 255, 255, 0.1)']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { show: false },
        data: [{ value: score }],
      },
    ],
  };

  return (
    <div className="relative w-20 h-20">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-orange-500" />
      </div>
    </div>
  );
}

// --- Biological Age Gauge Component (ECharts Half-Circle Speedometer) ---
function BiologicalAgeGauge({ 
  biologicalAge, 
  chronologicalAge, 
  targetAge 
}: { 
  biologicalAge: number; 
  chronologicalAge: number; 
  targetAge: number;
}) {
  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '70%'],
        radius: '100%',
        min: 21,
        max: 85,
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#22c55e'],   // Green (21-40)
              [0.55, '#84cc16'],  // Lime (40-56)
              [0.7, '#eab308'],   // Yellow (56-66)
              [0.85, '#f97316'],  // Orange (66-75)
              [1, '#ef4444'],     // Red (75-85)
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '60%',
          width: 12,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: 'white',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 8,
            shadowOffsetY: 3,
          },
        },
        axisTick: {
          length: 8,
          lineStyle: {
            color: 'auto',
            width: 2,
          },
        },
        splitLine: {
          length: 15,
          lineStyle: {
            color: 'auto',
            width: 3,
          },
        },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 12,
          distance: -45,
          rotate: 'tangential',
          formatter: function (value: number) {
            if (value === 21 || value === 85) return value.toString();
            if (Math.abs(value - 57.6) < 5) return '57.6';
            if (value === 70 || value === 80) return value.toString();
            return '';
          },
        },
        title: {
          show: false,
        },
        detail: {
          fontSize: 28,
          fontWeight: 'bold',
          color: '#ffffff',
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return value.toFixed(1) + '\nAge';
          },
          lineHeight: 32,
        },
        data: [
          {
            value: biologicalAge,
          },
        ],
        // Add target marker using markPoint
        markPoint: {
          symbol: 'circle',
          symbolSize: 16,
          data: [
            {
              name: 'Target',
              value: targetAge,
              xAxis: targetAge,
              yAxis: 0,
              itemStyle: {
                color: '#22c55e',
                borderColor: 'white',
                borderWidth: 2,
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div className="relative flex flex-col items-center" style={{ width: 320, height: 200 }}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}

// --- Blood Droplet SVG Component ---
function BloodDroplet({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className}
      fill="currentColor"
    >
      <path d="M12 2C12 2 5 10 5 15C5 19.4183 8.13401 23 12 23C15.866 23 19 19.4183 19 15C19 10 12 2 12 2Z" />
    </svg>
  );
}

// --- Logo Component ---
function Logo({ size = 'large', onClick }: { size?: 'large' | 'small'; onClick?: () => void }) {
  const content = (
    <>
      <span className={cn(
        "font-bold text-foreground",
        size === 'large' ? "text-5xl" : "text-xl"
      )}>
        Me
      </span>
      <BloodDroplet 
        className={cn(
          "text-medical-primary",
          size === 'large' ? "w-10 h-10 mt-1" : "w-5 h-5"
        )} 
      />
    </>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="flex items-center gap-0 hover:opacity-80 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {content}
    </div>
  );
}

// --- Main Component ---
export default function MeOInterface() {
  // --- State ---
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphDataPoint[]>(kraftCurveDataDefault);
  // Bio age metrics from API
  const [bioAgeMetrics, setBioAgeMetrics] = useState<BioAgeMetrics>({
    baseline: 41.9,
    target: 41.5,
    improvement: 0.4,
    baselineDate: null,
    targetDate: null,
  });
  // Bio age trajectory data for chart
  const [bioAgeTrajectory, setBioAgeTrajectory] = useState<BiologicalAgeDataPoint[]>(biologicalAgeDataDefault);
  // viewMode is controlled by backend mode field - 'response' is default (full-width chat)
  const [viewMode, setViewMode] = useState<'response' | 'analysis' | 'solution'>('response');
  // Resizable panel width (percentage for chat panel when in split mode)
  const [chatPanelWidth, setChatPanelWidth] = useState(35);
  // Biological Age card flip state
  const [isBioAgeFlipped, setIsBioAgeFlipped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- Handle Send Message ---
  const handleSendMessage = async (e?: React.FormEvent, prefill?: string) => {
    e?.preventDefault();
    const messageText = prefill || input;
    if (!messageText.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setLoading(true);
    setIsActive(true);

    // Determine intended mode from query (but don't apply yet)
    const lowerMessage = messageText.toLowerCase();
    let intendedMode: 'response' | 'analysis' | 'solution' = viewMode;
    if (lowerMessage.includes('kraft') || lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
      intendedMode = 'analysis';
    } else if (lowerMessage.includes('specialist') || lowerMessage.includes('find')) {
      intendedMode = 'solution';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, session_id: 'demo_session' })
      });
      
      const data = await res.json();
      const botResponse = data.response;

      // Add the bot response first
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
      
      // Now apply the mode transition AFTER response is added
      // Backend mode takes priority, then fallback to frontend detection
      if (data.mode === 'analysis' || data.mode === 'solution') {
        setViewMode(data.mode);
      } else if (intendedMode !== 'response') {
        setViewMode(intendedMode);
      }
      
      // Check for graph data in sources when in analysis mode
      const finalMode = data.mode || intendedMode;
      if (finalMode === 'analysis') {
        const retrievedSources = data.retrieved_sources || [];
        const graphDataParsed = extractGraphData(retrievedSources);
        
        if (graphDataParsed) {
          // Extract and set bio age metrics
          if (graphDataParsed.bio_age_data) {
            const metrics = getBioAgeMetrics(graphDataParsed.bio_age_data);
            setBioAgeMetrics(metrics);
            setBioAgeTrajectory(generateBioAgeTrajectory(metrics));
          }
          
          // Transform and set kraft curve data
          if (graphDataParsed.kraft_curve_data && graphDataParsed.kraft_curve_data.length > 0) {
            const transformedKraft = transformKraftForChart(graphDataParsed.kraft_curve_data);
            setGraphData(transformedKraft);
          }
        }
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting. Please check your internet connection or try again later."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (text: string) => {
    // Don't set mode here - let handleSendMessage handle it after response
    handleSendMessage(undefined, text);
  };

  // Handle page refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // --- Resizable Panel Handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Clamp between 25% and 60%
    setChatPanelWidth(Math.min(60, Math.max(25, newWidth)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove mouse event listeners for resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Persist panel width to localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('meoChatPanelWidth');
    if (savedWidth) {
      setChatPanelWidth(parseFloat(savedWidth));
    }
  }, []);

  useEffect(() => {
    if (viewMode !== 'response') {
      localStorage.setItem('meoChatPanelWidth', chatPanelWidth.toString());
    }
  }, [chatPanelWidth, viewMode]);

  // --- Render: Initial State (Centered Search View) ---
  if (!isActive) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === 'dark' 
          ? "bg-gradient-to-b from-background via-medical-bg to-medical-accent/10" 
          : "bg-white"
      )}>
        {/* Limited Preview Badge - Fixed at top center */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full text-sm font-medium border border-medical-primary/40 bg-medical-primary/10 backdrop-blur-md text-medical-primary">
            Limited Preview
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 p-2 rounded-lg bg-background/80 backdrop-blur border border-medical-border hover:bg-medical-accent transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>

        <div className="w-full max-w-2xl mx-auto">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo size="large" onClick={handleRefresh} />
            </div>
            <p className="text-muted-foreground text-lg">Your Metabolic Health Partner</p>
          </div>

          {/* Search Input */}
          <div className="space-y-4">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                placeholder="Ask about your metabolic health..."
                className="w-full h-14 text-lg pl-5 pr-14 rounded-xl bg-card/80 backdrop-blur border border-medical-border shadow-lg focus:outline-none focus:ring-2 focus:ring-medical-primary/50 focus:border-medical-primary text-foreground placeholder:text-muted-foreground"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-2.5 rounded-lg bg-medical-primary hover:bg-medical-primary/90 text-primary-foreground transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {/* Action Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => handleActionClick("Analyze my Kraft Curve")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur border border-medical-border hover:bg-medical-accent hover:text-medical-primary hover:border-medical-primary transition-all text-sm font-medium text-foreground"
              >
                <Activity className="h-4 w-4" />
                Analyze my Kraft Curve
              </button>
              <button
                onClick={() => handleActionClick("Find a Specialist")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur border border-medical-border hover:bg-medical-accent hover:text-medical-primary hover:border-medical-primary transition-all text-sm font-medium text-foreground"
              >
                <Stethoscope className="h-4 w-4" />
                Find a Specialist
              </button>
              <button
                onClick={() => handleActionClick("Upload Lab Results")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur border border-medical-border hover:bg-medical-accent hover:text-medical-primary hover:border-medical-primary transition-all text-sm font-medium text-foreground"
              >
                <Upload className="h-4 w-4" />
                Upload Lab Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Active State (Response-First Layout) ---
  return (
    <div className={cn(
      "min-h-screen",
      theme === 'dark' 
        ? "bg-gradient-to-b from-background via-medical-bg to-medical-accent/10" 
        : "bg-white",
      isDragging && "select-none cursor-col-resize"
    )}>
      {/* Limited Preview Badge - Fixed at top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="px-4 py-2 rounded-full text-sm font-medium border border-medical-primary/40 bg-medical-primary/10 backdrop-blur-md text-medical-primary">
          Limited Preview
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-background/80 backdrop-blur border border-medical-border hover:bg-medical-accent transition-colors"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-foreground" />
        )}
      </button>

      {/* Layout Container */}
      <div ref={containerRef} className="h-screen flex overflow-hidden">
        
        {/* Chat Panel - Fixed, doesn't scroll with right panel */}
        <motion.div 
          layout
          className={cn(
            "flex flex-col bg-card/50 backdrop-blur h-screen flex-shrink-0",
            viewMode === 'response' 
              ? "border-0" 
              : "border-r border-medical-border"
          )}
          style={{ 
            width: viewMode === 'response' ? '100%' : `${chatPanelWidth}%`
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          
          {/* Header Section */}
          <div className="p-4 border-b border-medical-border flex items-center justify-between">
            <Logo size="small" onClick={handleRefresh} />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-medical-border hover:bg-medical-accent transition-colors text-foreground">
                <Stethoscope className="h-4 w-4" />
                Clinician Mode
              </button>
            </div>
          </div>

          {/* Message Thread - Centered Gemini-style layout */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "w-full",
                  msg.role === 'user' ? "flex justify-end" : ""
                )}>
                  {msg.role === 'user' ? (
                    // User Message - right-aligned bubble
                    <div 
                      className="max-w-[85%] rounded-2xl px-4 py-3"
                      style={{ backgroundColor: '#2C564C' }}
                    >
                      <p className="text-sm leading-relaxed text-white">{msg.content}</p>
                    </div>
                  ) : (
                    // Assistant Message - clean centered text, no bubble (Gemini-style)
                    <div className="w-full">
                      <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-medical-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Footer Input Section */}
          <div className="p-4 border-t border-medical-border">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative">
                <textarea
                  placeholder="Ask a follow-up..."
                  className="w-full py-3 pl-4 pr-12 rounded-xl bg-card/80 backdrop-blur border border-medical-border focus:outline-none focus:ring-2 focus:ring-medical-primary/50 text-foreground placeholder:text-muted-foreground resize-none overflow-hidden min-h-[48px] max-h-[200px]"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={1}
                />
                <button
                  type="submit"
                  className="absolute right-2 bottom-2 h-10 w-10 flex items-center justify-center rounded-lg bg-medical-primary hover:bg-medical-primary/90 text-primary-foreground transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Resizable Divider - Only shown in split mode */}
        <AnimatePresence>
          {viewMode !== 'response' && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 12 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              onMouseDown={handleMouseDown}
              className="hidden md:flex flex-col items-center justify-center cursor-col-resize hover:bg-medical-primary/10 transition-colors group"
            >
              <div className="h-16 w-1 rounded-full bg-medical-border group-hover:bg-medical-primary transition-colors" />
              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-medical-primary transition-colors my-2" />
              <div className="h-16 w-1 rounded-full bg-medical-border group-hover:bg-medical-primary transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel - Analysis/Solution Dashboard - Only shown when not in response mode */}
        <AnimatePresence>
          {viewMode !== 'response' && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden md:flex flex-1 flex-col p-8 overflow-y-auto h-screen"
            >
          
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {viewMode === 'analysis' ? 'Metabolic Analysis' : 'Recommended Support'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {viewMode === 'analysis' ? 'Based on your latest data' : 'Matched to your metabolic profile'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {viewMode === 'analysis' && (
                    <>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className="text-3xl font-bold text-orange-500">65</p>
                      </div>
                      <RiskScoreGauge score={65} />
                    </>
                  )}
                </div>
              </div>

              {/* Analysis View - Stacked Cards */}
          {viewMode === 'analysis' && (
            <div className="space-y-6 flex-1">
              
              {/* Card 1: Biological Age Analysis - Flippable */}
              <div className="perspective-1000">
                <div
                  className="relative cursor-pointer transition-transform duration-700"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isBioAgeFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsBioAgeFlipped(!isBioAgeFlipped)}
                >
                  {/* Front Side - Gauge Meter */}
                  <div 
                    className="bg-card/80 backdrop-blur border border-medical-border rounded-xl shadow-lg p-6"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <h2 className="text-xl font-bold text-foreground">Biological Age Analysis</h2>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsBioAgeFlipped(!isBioAgeFlipped); }}
                        className="p-2 rounded-lg hover:bg-medical-accent transition-colors"
                      >
                        <FlipHorizontal className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>

                    {/* Gauge Display */}
                    <div className="flex flex-col items-center py-4">
                      <BiologicalAgeGauge 
                        biologicalAge={bioAgeMetrics.baseline ?? 41.9} 
                        chronologicalAge={42} 
                        targetAge={bioAgeMetrics.target ?? 41.5} 
                      />
                      
                      {/* Text Below Gauge */}
                      <div className="text-center mt-4">
                        <p className="text-sm text-muted-foreground">
                          {bioAgeMetrics.improvement !== null && bioAgeMetrics.improvement > 0 ? (
                            <>Improvement: <span className="text-medical-primary font-bold">{bioAgeMetrics.improvement.toFixed(2)} years</span></>
                          ) : (
                            <>You are aging <span className="text-medical-primary font-bold">4% slower</span> than average</>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Target Age: {bioAgeMetrics.target?.toFixed(2) ?? '41.50'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Back Side - Line Chart Graph */}
                  <div 
                    className="absolute inset-0 bg-card/80 backdrop-blur border border-medical-border rounded-xl shadow-lg p-6"
                    style={{ 
                      backfaceVisibility: 'hidden', 
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <h2 className="text-xl font-bold text-foreground">Your Age Journey</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Clinical progress vs target over time</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsBioAgeFlipped(!isBioAgeFlipped); }}
                        className="p-2 rounded-lg hover:bg-medical-accent transition-colors"
                      >
                        <FlipHorizontal className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>

                    {/* Line Chart (ECharts) */}
                    <div className="h-[300px] w-full">
                      <ReactECharts
                        option={{
                          grid: {
                            top: 40,
                            right: 30,
                            bottom: 60,
                            left: 50,
                          },
                          xAxis: {
                            type: 'category',
                            data: bioAgeTrajectory.map(d => d.date),
                            axisLine: { lineStyle: { color: '#374151' } },
                            axisLabel: { color: '#9ca3af', fontSize: 10, interval: 2 },
                            axisTick: { lineStyle: { color: '#374151' } },
                          },
                          yAxis: {
                            type: 'value',
                            min: bioAgeMetrics.target ? bioAgeMetrics.target - 0.1 : 41.45,
                            max: bioAgeMetrics.baseline ? bioAgeMetrics.baseline + 0.05 : 41.95,
                            axisLine: { lineStyle: { color: '#374151' } },
                            axisLabel: { 
                              color: '#9ca3af', 
                              fontSize: 12,
                              formatter: (value: number) => value.toFixed(2),
                            },
                            splitLine: { lineStyle: { color: '#374151', opacity: 0.3, type: 'dashed' } },
                          },
                          tooltip: {
                            trigger: 'axis',
                            backgroundColor: '#1f2937',
                            borderColor: '#374151',
                            textStyle: { color: '#fff' },
                            formatter: (params: Array<{seriesName: string; value: number; marker: string}>) => {
                              return params.map(p => `${p.marker} ${p.seriesName}: ${p.value.toFixed(2)}`).join('<br/>');
                            },
                          },
                          legend: {
                            data: ['YOU', 'OUR TARGET'],
                            bottom: 10,
                            textStyle: { color: '#9ca3af' },
                          },
                          series: [
                            {
                              name: 'YOU',
                              type: 'line',
                              data: bioAgeTrajectory.map(d => d.you),
                              smooth: true,
                              lineStyle: { color: '#f97316', width: 3 },
                              itemStyle: { color: '#f97316' },
                              symbol: 'circle',
                              symbolSize: 8,
                            },
                            {
                              name: 'OUR TARGET',
                              type: 'line',
                              data: bioAgeTrajectory.map(d => d.target),
                              smooth: true,
                              lineStyle: { color: '#a4d65e', width: 3 },
                              itemStyle: { color: '#a4d65e' },
                              symbol: 'circle',
                              symbolSize: 8,
                            },
                          ],
                        } as EChartsOption}
                        style={{ width: '100%', height: '100%' }}
                        opts={{ renderer: 'svg' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Kraft Curve Analysis - Static */}
              <div className="bg-card/80 backdrop-blur border border-medical-border rounded-xl shadow-lg p-6">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Kraft Curve Analysis</h2>
                    <p className="text-sm text-muted-foreground">5-Hour Glucose Tolerance Test</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    At Risk
                  </span>
                </div>

                {/* Chart Section (ECharts) */}
                <div className="h-[350px] w-full">
                  <ReactECharts
                    option={{
                      animation: true,
                      grid: {
                        top: 60,
                        right: 80,
                        bottom: 80,
                        left: 60,
                        containLabel: false,
                      },
                      xAxis: {
                        type: 'category',
                        data: graphData.map(d => d.time),
                        boundaryGap: false,
                        axisLine: { lineStyle: { color: '#374151' } },
                        axisLabel: { color: '#9ca3af', fontSize: 12 },
                        axisTick: { lineStyle: { color: '#374151' } },
                      },
                      yAxis: [
                        {
                          type: 'value',
                          name: 'Glucose (mg/dL)',
                          min: 0,
                          max: 200,
                          position: 'left',
                          axisLine: { show: true, lineStyle: { color: '#3b82f6' } },
                          axisLabel: { color: '#3b82f6', fontSize: 12 },
                          splitLine: { lineStyle: { color: '#374151', opacity: 0.3, type: 'dashed' } },
                          nameTextStyle: { color: '#3b82f6', fontSize: 12 },
                          nameLocation: 'end',
                        },
                        {
                          type: 'value',
                          name: 'Insulin (μIU/mL)',
                          min: 0,
                          max: 150,
                          position: 'right',
                          axisLine: { show: true, lineStyle: { color: '#f97316' } },
                          axisLabel: { color: '#f97316', fontSize: 12 },
                          splitLine: { show: false },
                          nameTextStyle: { color: '#f97316', fontSize: 12 },
                          nameLocation: 'end',
                        },
                      ],
                      tooltip: {
                        trigger: 'axis',
                        backgroundColor: '#1f2937',
                        borderColor: '#374151',
                        textStyle: { color: '#fff' },
                      },
                      legend: {
                        data: ['glucose', 'insulin'],
                        bottom: 10,
                        textStyle: { color: '#9ca3af' },
                        icon: 'circle',
                      },
                      dataset: {
                        source: graphData,
                      },
                      series: [
                        {
                          name: 'glucose',
                          type: 'line',
                          yAxisIndex: 0,
                          encode: { x: 'time', y: 'glucose' },
                          smooth: 0.3,
                          showSymbol: true,
                          lineStyle: { color: '#3b82f6', width: 3 },
                          itemStyle: { color: '#3b82f6' },
                          symbol: 'circle',
                          symbolSize: 10,
                        },
                        {
                          name: 'insulin',
                          type: 'line',
                          yAxisIndex: 1,
                          encode: { x: 'time', y: 'insulin' },
                          smooth: 0.3,
                          showSymbol: true,
                          lineStyle: { color: '#f97316', width: 3 },
                          itemStyle: { color: '#f97316' },
                          symbol: 'circle',
                          symbolSize: 10,
                        },
                      ],
                    } as EChartsOption}
                    style={{ width: '100%', height: '100%' }}
                    notMerge={true}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-medical-accent/30 border border-medical-border rounded-lg p-4">
                    <p className="text-3xl font-bold text-blue-400">160</p>
                    <p className="text-xs text-muted-foreground">Peak Glucose</p>
                  </div>
                  <div className="bg-medical-accent/30 border border-medical-border rounded-lg p-4">
                    <p className="text-3xl font-bold text-orange-500">120</p>
                    <p className="text-xs text-muted-foreground">Peak Insulin</p>
                  </div>
                  <div className="bg-medical-accent/30 border border-medical-border rounded-lg p-4">
                    <p className="text-3xl font-bold text-medical-primary">5hr</p>
                    <p className="text-xs text-muted-foreground">Recovery Time</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Solution View - Vendor Cards */}
          {viewMode === 'solution' && (
            <div className="space-y-4">
              {mockVendors.map((vendor) => (
                <div 
                  key={vendor.id}
                  className="bg-card/80 backdrop-blur border border-medical-border rounded-xl p-6 hover:border-medical-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    {/* Left Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-medical-primary transition-colors">
                          {vendor.name}
                        </h3>
                        {vendor.available ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            Waitlist
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-medical-primary font-medium mb-2">{vendor.category}</p>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{vendor.description}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {vendor.tags.map((tag, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 rounded-md text-xs bg-medical-accent/50 text-foreground border border-medical-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-foreground font-medium">{vendor.rating}</span>
                          <span>({vendor.reviews} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{vendor.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Content - Price & CTA */}
                    <div className="flex flex-col items-end gap-3 ml-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{vendor.price}</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-medical-primary hover:bg-medical-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
                        Book Now
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}