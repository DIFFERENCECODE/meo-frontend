# Quick Reference Guide

## Quick Start
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Check code quality
```

## Project at a Glance

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Charts**: ECharts 6
- **Animations**: Framer Motion 12

### Directory Structure
```
src/
├── app/
│   ├── api/chat/route.ts    # Backend proxy
│   ├── lib/                 # Utilities & types
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
└── components/
    └── Chatbot.tsx          # Main UI (1281 lines)
```

## Common Operations

### Adding a New Feature to Chat
1. Update types in `src/app/lib/types.ts`
2. Modify `Chatbot.tsx` component logic
3. Update API handler if backend changes needed

### Creating a New Visualization
1. Import ECharts types: `import type { EChartsOption } from 'echarts'`
2. Create component with `ReactECharts`
3. Pass data from chat response via state

### Modifying Styles
- **Global**: Edit `src/app/globals.css`
- **Component**: Edit `Chatbot.module.css`
- **Inline**: Use Tailwind utility classes

### Adding API Endpoint
1. Create folder in `src/app/api/[name]/`
2. Add `route.ts` with exported HTTP methods
3. Use `NextRequest` and `NextResponse` types

## Code Patterns

### Type-Safe API Call
```typescript
import { postChatMessage } from '@/app/lib/api';

const response = await postChatMessage(message, sessionId);
// response is typed as ChatResponse
```

### Adding a Chart
```typescript
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

function MyChart({ data }: { data: number[] }) {
  const option: EChartsOption = {
    series: [{ type: 'line', data }]
  };
  return <ReactECharts option={option} />;
}
```

### Styling with Tailwind
```tsx
// Use cn() helper for conditional classes
import { cn } from './utils';

<div className={cn(
  "base-classes",
  condition && "conditional-classes"
)} />
```

### Dark Mode Styling
```css
/* globals.css */
:root {
  --my-color: oklch(0.99 0.005 180);
}

.dark {
  --my-color: oklch(0.15 0.01 240);
}
```

## Data Flow Patterns

### Chat Message Flow
```
User Input → State → API Client → Proxy → Backend
                  ↓
Backend Response → Proxy → API Client → State → UI
```

### Graph Data Extraction
```typescript
// From backend response
const graphData = extractGraphData(response.retrieved_sources);

// Transform for charts
const chartData = transformKraftForChart(graphData.kraft_curve_data);
```

## Debugging Tips

### Check API Calls
- Open browser DevTools → Network tab
- Look for `/api/chat` requests
- Check Console for `[Proxy]` logs

### View Current State
```typescript
// Add console.log in Chatbot.tsx
useEffect(() => {
  console.log('Messages:', messages);
  console.log('View:', view);
}, [messages, view]);
```

### Test Backend Connection
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test"}'
```

## File Locations Cheat Sheet

| Task | File Path |
|------|-----------|
| Main UI | `src/components/Chatbot.tsx` |
| API proxy | `src/app/api/chat/route.ts` |
| Types | `src/app/lib/types.ts` |
| API client | `src/app/lib/api.ts` |
| Global styles | `src/app/globals.css` |
| Root layout | `src/app/layout.tsx` |
| Home page | `src/app/page.tsx` |
| Config | `next.config.ts`, `tsconfig.json` |

## Important Conventions

### Naming
- Components: PascalCase (`MyComponent`)
- Files: camelCase or PascalCase
- Types/Interfaces: PascalCase
- Functions: camelCase
- CSS variables: kebab-case

### Import Aliases
- `@/*` → `src/*` (configured in tsconfig.json)
- Example: `import { types } from '@/app/lib/types'`

### Component Structure
```typescript
'use client'; // If client-side only

import statements...

// Types
type Props = { ... };

// Component
export default function MyComponent({ props }: Props) {
  // Hooks
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => { ... }, []);
  
  // Handlers
  const handleClick = () => { ... };
  
  // Render
  return ( ... );
}
```

## Environment Variables

### Frontend (NEXT_PUBLIC_*)
- Accessible in browser
- Example: `NEXT_PUBLIC_MEO_API_URL`
- Usage: `process.env.NEXT_PUBLIC_MEO_API_URL`

### Server-side
- Only in API routes and server components
- Example: `MEO_API_URL`
- Usage: `process.env.MEO_API_URL`

## Build & Deploy

### Local Build Test
```bash
npm run build
npm start
# Visit http://localhost:3000
```

### Production Checklist
- [ ] Run `npm run lint`
- [ ] Test build: `npm run build`
- [ ] Check environment variables
- [ ] Test API connectivity
- [ ] Verify charts render
- [ ] Test dark mode

## Performance Tips

1. **Images**: Use Next.js `<Image>` component
2. **Code Splitting**: Happens automatically
3. **CSS**: Purged automatically by Tailwind
4. **Charts**: Use SVG renderer for better performance
5. **API**: Consider caching repeated requests

## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .next
npm run build
```

### Type Errors
```bash
# Regenerate types
npx tsc --noEmit
```

### Linting Issues
```bash
# Auto-fix
npm run lint -- --fix
```

### Port Already in Use
```bash
# Change port
npm run dev -- -p 3001
```

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [ECharts Examples](https://echarts.apache.org/examples/)
- [Framer Motion API](https://www.framer.com/motion/)

## Getting Help

1. Check `CODEBASE_OVERVIEW.md` for detailed architecture
2. Review existing code patterns in similar files
3. Check console logs for runtime errors
4. Use TypeScript IntelliSense for API exploration
5. Review Git history for context on changes
