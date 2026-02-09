# Architecture Diagram

## High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Application                        │ │
│  │                  (Client-Side Rendering)                    │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │         MeOInterface Component (Main UI)             │ │ │
│  │  │                                                       │ │ │
│  │  │  • Chat Interface (Messages, Input)                  │ │ │
│  │  │  • Multi-View Layout (Response/Analysis/Solution)    │ │ │
│  │  │  • Theme Toggle (Light/Dark)                         │ │ │
│  │  │  • Resizable Panels                                  │ │ │
│  │  │                                                       │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │       Data Visualization Components              │ │ │ │
│  │  │  │                                                   │ │ │ │
│  │  │  │  • RiskScoreGauge (ECharts)                      │ │ │ │
│  │  │  │  • KraftCurveChart (Glucose/Insulin)             │ │ │ │
│  │  │  │  • BiologicalAgeChart (Age Trajectory)           │ │ │ │
│  │  │  │  • VendorCards (Marketplace)                     │ │ │ │
│  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                 │ │
│  │                           │ postChatMessage(query)          │ │
│  │                           ▼                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │           API Client (lib/api.ts)                     │ │ │
│  │  │                                                       │ │ │
│  │  │  • Request formatting                                │ │ │
│  │  │  • Response parsing                                  │ │ │
│  │  │  • Error handling                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────┬──────────────────────────────────────┘ │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         │ HTTP POST /api/chat
                         │ { message, session_id }
                         │
┌────────────────────────▼──────────────────────────────────────┐
│                  Next.js Server (API Routes)                   │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           API Route: /api/chat/route.ts                   │ │
│  │                   (Proxy Pattern)                         │ │
│  │                                                           │ │
│  │  1. Request Validation                                   │ │
│  │     • Check message presence                             │ │
│  │     • Validate session_id                                │ │
│  │                                                           │ │
│  │  2. Logging                                              │ │
│  │     • Log incoming request                               │ │
│  │     • Log backend response                               │ │
│  │                                                           │ │
│  │  3. Proxy to Backend                                     │ │
│  │     • Forward to external API                            │ │
│  │     • Handle errors                                      │ │
│  │     • Transform response                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ https://api.meo.meterbolic.com/api/chat
                         │
┌────────────────────────▼──────────────────────────────────────┐
│              External Meo Backend API                          │
│                                                                │
│  • AI Processing (LLM Integration)                            │
│  • Metabolic Health Analysis                                  │
│  • Graph Data Generation (Bio Age, Kraft Curves)              │
│  • Document/Source Retrieval                                  │
│  • Session Management                                         │
└────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App Root (layout.tsx)
│
└── Home Page (page.tsx)
    │
    └── MeOInterface (Chatbot.tsx) [CLIENT COMPONENT]
        │
        ├── Header
        │   ├── Logo
        │   ├── Title
        │   └── Theme Toggle Button
        │
        ├── Main Content Area
        │   │
        │   ├── Left Panel (Resizable)
        │   │   └── Chat Interface
        │   │       ├── Message List
        │   │       │   └── Message Items
        │   │       │       ├── User Message
        │   │       │       └── Assistant Message
        │   │       │           └── ReactMarkdown Content
        │   │       │
        │   │       └── Input Area
        │   │           ├── Textarea
        │   │           └── Send Button
        │   │
        │   ├── Resize Handle (Draggable)
        │   │
        │   └── Right Panel
        │       │
        │       ├── View Selector Tabs
        │       │   ├── Response Tab
        │       │   ├── Analysis Tab
        │       │   └── Solution Tab
        │       │
        │       └── View Content (Conditional)
        │           │
        │           ├── Response View
        │           │   └── [Empty - Focus on chat]
        │           │
        │           ├── Analysis View
        │           │   ├── RiskScoreGauge
        │           │   ├── KraftCurveChart (ECharts)
        │           │   ├── BiologicalAgeChart (ECharts)
        │           │   └── Metrics Cards
        │           │
        │           └── Solution View
        │               └── Vendor Cards List
        │                   └── VendorCard × N
        │                       ├── Vendor Info
        │                       ├── Rating
        │                       ├── Tags
        │                       └── Action Buttons
        │
        └── Sidebar (Conditional)
            └── [Future: History, Settings]
```

## Data Flow Diagram

```
┌─────────────┐
│ User Types  │
│  Message    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Input State Update  │
│ useState(message)   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Form Submit         │
│ handleSendMessage() │
└──────┬──────────────┘
       │
       ├─► Add user message to state
       │   setMessages([...messages, userMsg])
       │
       ├─► Set loading state
       │   setIsLoading(true)
       │
       ▼
┌────────────────────────────┐
│ API Client Call            │
│ postChatMessage(query, id) │
└──────┬─────────────────────┘
       │
       │ POST /api/chat
       │ { message, session_id }
       │
       ▼
┌────────────────────────────┐
│ Next.js API Route          │
│ /api/chat/route.ts         │
│                            │
│ 1. Validate                │
│ 2. Log                     │
│ 3. Forward to backend      │
└──────┬─────────────────────┘
       │
       │ POST https://api.meo.meterbolic.com/api/chat
       │
       ▼
┌────────────────────────────┐
│ Backend Processing         │
│ • AI Analysis              │
│ • Generate response        │
│ • Retrieve sources         │
│ • Create graph data        │
└──────┬─────────────────────┘
       │
       │ Response JSON
       │ { response, session_id, 
       │   retrieved_sources, mode }
       │
       ▼
┌────────────────────────────┐
│ API Route Returns          │
│ NextResponse.json(data)    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ API Client Receives        │
│ return await resp.json()   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Process Response           │
│ • Parse graph data         │
│ • Extract sources          │
│ • Determine view mode      │
└──────┬─────────────────────┘
       │
       ├─► Add AI message to state
       │   setMessages([...messages, aiMsg])
       │
       ├─► Update view if mode specified
       │   setView(response.mode)
       │
       ├─► Store session ID
       │   setSessionId(response.session_id)
       │
       └─► Clear loading state
           setIsLoading(false)
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│              Component State (useState)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  messages: Message[]                                    │
│    ├─► Stores entire chat history                      │
│    └─► Triggers re-render of message list              │
│                                                          │
│  input: string                                          │
│    ├─► Controlled textarea input                       │
│    └─► Cleared after message sent                      │
│                                                          │
│  isLoading: boolean                                     │
│    ├─► Shows loading spinner                           │
│    └─► Disables input during API call                  │
│                                                          │
│  view: 'response' | 'analysis' | 'solution'            │
│    ├─► Controls right panel display                    │
│    └─► Can be set by backend via response.mode         │
│                                                          │
│  theme: 'light' | 'dark'                               │
│    ├─► Applied to root element                         │
│    └─► Triggers CSS variable changes                   │
│                                                          │
│  leftWidth: number                                     │
│    ├─► Controls resizable panel width                  │
│    └─► Updated by drag interactions                    │
│                                                          │
│  sessionId: string                                     │
│    ├─► Maintains conversation context                  │
│    └─► Persisted across messages                       │
│                                                          │
│  showSidebar: boolean                                  │
│    └─► Controls sidebar visibility (future use)        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## File Dependencies

```
src/app/page.tsx
    └─► imports MeOInterface from ../components/Chatbot

src/components/Chatbot.tsx [1281 lines]
    ├─► react hooks (useState, useEffect, useRef, useCallback)
    ├─► lucide-react (icons)
    ├─► framer-motion (animations)
    ├─► echarts-for-react (charts)
    ├─► react-markdown (message rendering)
    ├─► remark-gfm (markdown plugin)
    ├─► clsx, tailwind-merge (styling utilities)
    └─► Local API client (implicit via fetch to /api/chat)

src/app/api/chat/route.ts
    ├─► next/server (NextRequest, NextResponse)
    └─► External API: https://api.meo.meterbolic.com/api/chat

src/app/lib/api.ts
    └─► imports types from ./types

src/app/lib/types.ts
    └─► Pure TypeScript interfaces (no imports)

src/app/layout.tsx
    ├─► next/font/google (Geist fonts)
    └─► ./globals.css

src/app/globals.css
    └─► tailwindcss (import)
```

## Request/Response Flow Detail

### Request Structure
```
Browser                        Next.js API              Backend
   │                               │                       │
   │  POST /api/chat              │                       │
   │  ───────────────────────────>│                       │
   │  {                           │                       │
   │    message: string,          │                       │
   │    session_id: string        │  POST /api/chat      │
   │  }                           │  ──────────────────> │
   │                              │  {                    │
   │                              │    message: string,   │
   │                              │    session_id: string │
   │                              │  }                    │
   │                              │                       │
   │                              │       (Processing)    │
   │                              │                       │
   │                              │  <─────────────────── │
   │                              │  {                    │
   │                              │    response: string,  │
   │                              │    session_id: str,   │
   │                              │    retrieved_sources, │
   │                              │    mode?: string      │
   │  <───────────────────────────│  }                    │
   │  {                           │                       │
   │    response: string,         │                       │
   │    session_id: string,       │                       │
   │    retrieved_sources: [...], │                       │
   │    mode?: string             │                       │
   │  }                           │                       │
   │                               │                       │
```

### Error Handling Flow
```
   Error Occurs
       │
       ├─► Input Validation Error
       │       └─► Return 400 Bad Request
       │           { error: 'Message is required' }
       │
       ├─► Backend API Error
       │       └─► Log error details
       │           └─► Return backend status code
       │               { error: 'Backend error: 500' }
       │
       └─► Network/Unexpected Error
               └─► Log error to console
                   └─► Return 500 Internal Server Error
                       { error: 'Failed to process chat request' }
```

## Technology Integration Points

```
┌────────────────────────────────────────────────────────┐
│                    Browser APIs                         │
│  • localStorage (theme preference - future)            │
│  • fetch API (HTTP requests)                           │
│  • ResizeObserver (panel resizing - future)            │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                  React Ecosystem                        │
│  • React 19 (useState, useEffect, useRef, useCallback) │
│  • Framer Motion (AnimatePresence, motion components)  │
│  • ReactMarkdown (Content rendering)                   │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                 Next.js Framework                       │
│  • App Router (file-based routing)                     │
│  • API Routes (server-side handlers)                   │
│  • next/font (Google Fonts optimization)               │
│  • Image optimization (built-in)                       │
│  • Turbopack (bundling)                                │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                  Styling Stack                          │
│  • Tailwind CSS v4 (utility classes)                   │
│  • PostCSS (CSS processing)                            │
│  • CSS Variables (theming)                             │
│  • OKLCH Color Space (modern colors)                   │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│              Visualization Libraries                    │
│  • ECharts 6.0 (core charting engine)                  │
│  • echarts-for-react (React wrapper)                   │
│  • SVG Renderer (crisp graphics)                       │
└────────────────────────────────────────────────────────┘
```

---

This architecture provides:
- **Separation of Concerns**: UI, API, and backend are clearly separated
- **Type Safety**: TypeScript throughout the stack
- **Scalability**: Component-based architecture allows easy expansion
- **Maintainability**: Clear data flow and state management
- **Performance**: Optimized bundling and rendering with Next.js
- **Security**: Backend API credentials hidden via proxy pattern
