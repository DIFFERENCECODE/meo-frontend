# Meterbolic Web (meo-frontend)

Next.js 16 web application for the Meterbolic metabolic health platform. Provides patient-facing features (AI chat, analysis dashboards, solution recommendations) alongside admin and practitioner management panels.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4, Motion (animations)
- **Charts:** ECharts 6 (Bio Age, Kraft curves)
- **Icons:** Lucide React
- **Auth:** AWS Cognito (email/password + Google social auth)
- **Payments:** Stripe subscriptions (Free / Pro / Clinic tiers), RevenueCat webhook endpoint
- **State:** React useState (no external state library)
- **Backend proxy:** Routes requests to the chatbot-rag FastAPI service

## Prerequisites

- Node.js >= 20
- npm >= 10
- AWS Cognito user pool configured
- Stripe account with product/price IDs
- Access to the chatbot-rag API

## Setup

```bash
git clone <repo-url>
cd meo-frontend
npm install
cp .env.example .env.local   # then fill in values below
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Cognito
COGNITO_USER_POOL_ID=eu-north-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_cognito_client_id
COGNITO_CLIENT_SECRET=your_cognito_client_secret
COGNITO_ISSUER=https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_XXXXXXXXX

# Backend API
MEO_API_URL=http://localhost:8080

# Anthropic (server-side AI calls)
ANTHROPIC_API_KEY=sk-ant-XXXXXXXX

# Stripe
STRIPE_SECRET_KEY=sk_test_XXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXX
STRIPE_PRICE_PRO=price_XXXXXXXX
STRIPE_PRICE_CLINIC=price_XXXXXXXX

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_secret
```

## Running

```bash
# Development (port 3000)
npm run dev

# Production build
npm run build
npm start

# Lint
npm run lint
```

Open http://localhost:3000 in your browser.

## Project Structure

```
src/
  app/                  # Next.js App Router pages
    admin/              # Admin panel (users, content, monitoring)
    api/                # API route handlers (proxy to backend, webhooks)
    lib/                # Utilities and type definitions
    pricing/            # Subscription / pricing page
    profile/            # User profile with measurements
    layout.tsx          # Root layout (three-panel structure)
    page.tsx            # Landing / chat page
    globals.css         # Global styles
  components/           # Shared React components
  lib/                  # Utilities, API clients, helpers
  theme/                # Vendor theming (Meterbolic / Eos)
```

## Features

- **MeO AI Chat** -- Conversational assistant powered by the chatbot-rag backend
- **Analysis Dashboard** -- Bio Age score, Kraft insulin/glucose curves rendered with ECharts
- **Solution Recommendations** -- Vendor/product suggestions based on metabolic data
- **Profile and Measurements** -- View and manage personal health metrics
- **Admin Panel** -- User management, content editing, system monitoring
- **Practitioner Mode** -- Patient list, per-patient dashboards, clinician tools
- **Cognito Auth** -- Email/password and Google social sign-in
- **Stripe Subscriptions** -- Free, Pro, and Clinic tiers with checkout flow
- **RevenueCat Webhook** -- Syncs mobile in-app purchase state
- **Vendor Theming** -- Switch between Meterbolic and Eos brand themes
- **Three-Panel Layout** -- Sidebar navigation, main content, contextual detail panel

## Related Documentation

- [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md) -- Full guide to the project structure and implementation
- [ARCHITECTURE.md](./ARCHITECTURE.md) -- Architecture diagrams and data flow
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) -- Quick reference for common development tasks
