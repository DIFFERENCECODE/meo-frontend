# Meo Frontend - Codebase Overview

## Introduction
**Meo** is a metabolic health AI assistant built to provide personalized insights, data visualization, and recommendations for users monitoring their metabolic health. This document serves as a comprehensive guide for developers joining the team.

---

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Key Components](#key-components)
5. [Data Flow](#data-flow)
6. [API Integration](#api-integration)
7. [Styling & Design System](#styling--design-system)
8. [Development Workflow](#development-workflow)
9. [Key Features](#key-features)

---

## Technology Stack

### Core Framework
- **Next.js 16.0.10** - React framework with App Router architecture
- **React 19.1.0** - UI library with latest features
- **TypeScript 5.x** - Type-safe development

### UI & Styling
- **Tailwind CSS v4** - Utility-first CSS framework
- **Framer Motion / Motion 12.x** - Animation library for smooth transitions
- **Lucide React** - Modern icon library
- **Tailwind Merge & CLSX** - Utility class management

### Data Visualization
- **ECharts 6.0** - Powerful charting library
- **echarts-for-react** - React wrapper for ECharts

### Content Rendering
- **React Markdown** - Markdown rendering for chat messages
- **remark-gfm** - GitHub Flavored Markdown support

### Development Tools
- **ESLint** - Code linting with Next.js preset
- **PostCSS** - CSS processing with Tailwind
- **Turbopack** - Fast bundler for development and builds

---

## Project Structure

```
meo-frontend/
├── src/
│   ├── app/                      # Next.js App Router directory
│   │   ├── api/                  # API routes (server-side)
│   │   │   └── chat/             # Chat API proxy endpoint
│   │   │       └── route.ts      # POST handler for chat messages
│   │   ├── lib/                  # Shared utilities and types
│   │   │   ├── api.ts           # API client functions
│   │   │   └── types.ts         # TypeScript type definitions
│   │   ├── layout.tsx           # Root layout with fonts and metadata
│   │   ├── page.tsx             # Home page (renders MeOInterface)
│   │   └── globals.css          # Global styles and CSS variables
│   └── components/              # Reusable React components
│       ├── Chatbot.tsx          # Main chat interface (1281 lines)
│       └── Chatbot.module.css   # Component-specific styles
├── public/                      # Static assets
│   ├── droplet-logo.png        # Application logo
│   └── *.svg                    # Various SVG icons
├── .gitignore                   # Git ignore rules
├── eslint.config.mjs            # ESLint configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── postcss.config.mjs           # PostCSS configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project documentation
```

### File Organization
- **App Router**: Uses Next.js 13+ App Router pattern with `src/app` directory
- **Colocation**: Types and utilities are colocated near their usage
- **Component Modularity**: Large components have dedicated CSS modules
- **API Routes**: Server-side API handlers in `src/app/api`

---

## Architecture Overview

### Application Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Browser Client                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │          MeOInterface Component                   │  │
│  │  - Chat UI                                       │  │
│  │  - Data Visualizations (ECharts)                │  │
│  │  - Vendor Marketplace                           │  │
│  └────────────────┬──────────────────────────────────┘  │
│                   │                                      │
│                   ▼                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │         API Client (lib/api.ts)                   │  │
│  │  postChatMessage(query, sessionId)               │  │
│  └────────────────┬──────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────┘
                    │ HTTP POST /api/chat
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Route                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │      /api/chat/route.ts (Proxy)                   │  │
│  │  - Validates input                               │  │
│  │  - Forwards to backend                           │  │
│  │  - Handles errors                                │  │
│  └────────────────┬──────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────┘
                    │ HTTP POST
                    ▼
┌─────────────────────────────────────────────────────────┐
│           External Backend API                           │
│     https://api.meo.meterbolic.com/api/chat             │
│  - AI Processing                                        │
│  - Metabolic Analysis                                   │
│  - Graph Data Generation                                │
└─────────────────────────────────────────────────────────┘
```

### Key Design Patterns
1. **Proxy Pattern**: Frontend API route acts as proxy to external backend
2. **Component State Management**: React hooks for local state (`useState`, `useEffect`, `useRef`)
3. **Client-Side Rendering**: Main interface is client-side (`'use client'`)
4. **Type Safety**: Comprehensive TypeScript interfaces throughout
5. **Separation of Concerns**: API logic, types, and UI components are separated

---

## Key Components

### 1. MeOInterface (`src/components/Chatbot.tsx`)
**Purpose**: Main chat interface with metabolic health visualizations

**Key Features**:
- Real-time chat interaction with AI assistant
- Multi-view layout with resizable panels
- Data visualization integration
- Vendor marketplace display
- Dark/Light theme toggle
- Animated UI transitions

**State Management**:
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [view, setView] = useState<'response' | 'analysis' | 'solution'>('response');
const [showSidebar, setShowSidebar] = useState(false);
const [theme, setTheme] = useState<'light' | 'dark'>('light');
const [leftWidth, setLeftWidth] = useState(30); // Panel sizing
```

**Sub-Components**:
- `RiskScoreGauge`: ECharts gauge visualization
- `KraftCurveChart`: Insulin/Glucose response chart
- `BiologicalAgeChart`: Age trajectory visualization
- `VendorCard`: Marketplace service provider card

### 2. API Route Handler (`src/app/api/chat/route.ts`)
**Purpose**: Server-side proxy for backend communication

**Responsibilities**:
- Request validation
- Session ID management
- Error handling and logging
- Response transformation

**Request Format**:
```typescript
{
  message: string;
  session_id: string;
}
```

**Response Format**:
```typescript
{
  response: string;
  session_id: string;
  retrieved_sources: Source[];
  mode?: 'response' | 'analysis' | 'solution';
}
```

### 3. Type Definitions (`src/app/lib/types.ts`)
**Purpose**: Centralized TypeScript type definitions

**Key Types**:
- `Source`: Document/data source metadata
- `Message`: Chat message structure
- `BioAgeData`: Biological age measurements
- `KraftDataPoint`: Metabolic response data points
- `GraphData`: Combined visualization data

### 4. API Client (`src/app/lib/api.ts`)
**Purpose**: Frontend API communication layer

**Main Function**:
```typescript
postChatMessage(query: string, sessionId: string): Promise<ChatResponse>
```

---

## Data Flow

### Chat Message Flow
```
1. User Input → MeOInterface state
2. Form Submit → postChatMessage()
3. API Client → POST /api/chat
4. API Route → Validate & Forward
5. Backend API → Process & Respond
6. API Route → Return response
7. API Client → Parse response
8. MeOInterface → Update messages state
9. UI → Render new message with visualizations
```

### Graph Data Flow
```
1. Backend includes graph_data in retrieved_sources
2. extractGraphData() parses JSON from gap_solved field
3. Data transformed into chart-ready format:
   - Bio Age: getBioAgeMetrics() → generateBioAgeTrajectory()
   - Kraft Curve: transformKraftForChart()
4. ECharts components render visualizations
5. Charts displayed in Analysis view
```

---

## API Integration

### Environment Variables
- **NEXT_PUBLIC_MEO_API_URL**: (Optional) Frontend-accessible API URL
- **MEO_API_URL**: Server-side API URL (hardcoded: `https://api.meo.meterbolic.com`)

### API Endpoints

#### POST `/api/chat`
**Request**:
```json
{
  "message": "What is my insulin response?",
  "session_id": "user_session_123"
}
```

**Response**:
```json
{
  "response": "Based on your Kraft curve...",
  "session_id": "user_session_123",
  "retrieved_sources": [
    {
      "source_name": "kraft_analysis",
      "type": "graph_data",
      "gap_solved": "{\"user_email\":\"...\", ...}"
    }
  ],
  "mode": "analysis"
}
```

### Error Handling
- Input validation (400 Bad Request)
- Backend errors (proxy status code)
- Network failures (500 Internal Server Error)
- Client-side error display in chat interface

---

## Styling & Design System

### Color System
Uses **OKLCH color space** for consistent, perceptually uniform colors.

**Light Mode**:
- Background: `oklch(0.99 0.005 180)` - Near white
- Medical Primary: `oklch(0.62 0.14 180)` - Cyan blue
- Borders: `oklch(0.88 0.02 180)` - Soft gray

**Dark Mode**:
- Background: `oklch(0.15 0.01 240)` - Deep blue-black
- Medical Primary: `oklch(0.65 0.16 180)` - Bright cyan
- Elevated surfaces: `oklch(0.18 0.01 240)`

### CSS Architecture
1. **Tailwind v4**: Utility classes via `@import "tailwindcss"`
2. **CSS Variables**: Theme values in `:root` and `.dark`
3. **Custom Variants**: Dark mode using `@custom-variant`
4. **Module CSS**: Component-specific styles in `.module.css`

### Utility Functions
```typescript
// Tailwind class merging
cn(...inputs: (string | undefined | null | false)[])
```

### Animation
- **Framer Motion**: Page transitions, message animations
- **ECharts**: Smooth chart updates
- **CSS Transitions**: Theme switching, hover effects

---

## Development Workflow

### Available Scripts
```bash
# Start development server (with Turbopack)
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Development Server
- **URL**: http://localhost:3000
- **Hot Reload**: Enabled via Turbopack
- **Port**: 3000 (default)

### Build Process
1. TypeScript compilation
2. Turbopack bundling
3. Static generation for pages
4. CSS optimization
5. Image optimization

### Code Quality
- **ESLint**: Next.js core web vitals + TypeScript rules
- **TypeScript**: Strict mode enabled
- **Path Aliases**: `@/*` maps to `./src/*`

---

## Key Features

### 1. **AI-Powered Chat Interface**
- Conversational interaction with metabolic health assistant
- Markdown support with GitHub Flavored Markdown
- Streaming-like message display
- Session management

### 2. **Multi-View Layout**
- **Response View**: Chat-focused interface
- **Analysis View**: Data visualizations and metrics
- **Solution View**: Vendor marketplace
- Resizable panels with drag handles

### 3. **Data Visualizations**
- **Kraft Curve**: Glucose and insulin response over time
- **Biological Age Trajectory**: Progress toward target age
- **Risk Score Gauge**: Visual health risk indicator
- Interactive ECharts with tooltips and legends

### 4. **Vendor Marketplace**
- Healthcare provider discovery
- Service categorization and filtering
- Rating and review display
- Availability indicators
- Location-based filtering

### 5. **Theme Support**
- Light/Dark mode toggle
- Persistent theme preference
- Smooth transitions
- Accessible color contrasts

### 6. **Responsive Design**
- Mobile-friendly layouts
- Touch-optimized interactions
- Adaptive panel sizing
- Flexible grid systems

### 7. **Real-time Updates**
- Dynamic graph data integration
- Live chart updates from API
- Animated state transitions

---

## Implementation Highlights

### Performance Optimizations
1. **Turbopack**: Fast bundling and hot reload
2. **Code Splitting**: Automatic with Next.js App Router
3. **Image Optimization**: Next.js built-in image handling
4. **Font Optimization**: `next/font` with Geist fonts
5. **SVG Rendering**: ECharts uses SVG for crisp charts

### Type Safety
- Comprehensive TypeScript coverage
- Strict mode enabled
- Interface definitions for all data structures
- Type-safe API client

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance

### Error Handling
- User-friendly error messages
- Graceful fallbacks for missing data
- Console logging for debugging
- Try-catch blocks for async operations

---

## Getting Started as a New Developer

### Prerequisites
- Node.js 20+ installed
- npm, yarn, pnpm, or bun package manager
- Git for version control

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Key Files to Review First
1. `src/app/page.tsx` - Application entry point
2. `src/components/Chatbot.tsx` - Main UI component
3. `src/app/lib/types.ts` - Type definitions
4. `src/app/api/chat/route.ts` - API proxy logic
5. `src/app/globals.css` - Design system

### Common Tasks
- **Add new message type**: Update `Message` type in types.ts
- **Add new chart**: Create component using ReactECharts
- **Modify chat logic**: Edit Chatbot.tsx handleSendMessage
- **Update API**: Modify api/chat/route.ts
- **Style changes**: Edit globals.css or component CSS modules

---

## Architecture Decisions

### Why Next.js App Router?
- Server-side rendering capabilities
- Built-in API routes for proxy pattern
- File-based routing simplicity
- Excellent TypeScript support
- Production-ready optimizations

### Why ECharts?
- Rich visualization options
- High performance with large datasets
- Extensive customization
- Professional appearance
- React integration available

### Why Proxy Pattern?
- Hide backend API details from client
- Add authentication/validation layer
- Centralized error handling
- CORS management
- Future flexibility for backend changes

### Why Tailwind CSS v4?
- Utility-first approach increases velocity
- Consistent design system
- Smaller CSS bundle
- Dark mode support built-in
- Excellent TypeScript support with new version

---

## Future Considerations

### Potential Enhancements
- State management library (Zustand/Recoil) for complex state
- React Query for API caching and optimistic updates
- Storybook for component documentation
- End-to-end testing with Playwright
- Unit tests with Jest/Vitest
- Progressive Web App (PWA) features
- WebSocket support for real-time updates
- Multi-language support (i18n)

### Scalability Notes
- Component structure supports easy extraction
- API client can be extended for additional endpoints
- Type system facilitates safe refactoring
- CSS architecture scales with utility-first approach

---

## Conclusion

The Meo Frontend is a modern, type-safe React application built with Next.js that provides a sophisticated interface for metabolic health monitoring. The codebase follows current best practices with clear separation of concerns, comprehensive type definitions, and a maintainable component architecture.

**Key Strengths**:
- Strong TypeScript integration
- Clean architectural patterns
- Rich data visualization capabilities
- Responsive and accessible design
- Developer-friendly structure

**For Questions or Contributions**:
Refer to the main README.md for deployment instructions and contribution guidelines.
