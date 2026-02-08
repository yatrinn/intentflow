# IntentFlow — One-Page Report

## Problem

Most websites show the same homepage to every visitor, regardless of why they arrived. Enterprise companies solve this with expensive personalization tools (Optimizely, Dynamic Yield — $50K+ annually). Small and medium businesses, Shopify stores, and independent websites cannot access this technology, leaving massive conversion potential untapped.

## Solution

**IntentFlow** is a plug-and-play AI personalization widget installable via a single `<script>` tag. It detects visitor intent from context signals and instantly personalizes the hero section with the optimal template, image, headline, and CTA — all client-side, with zero backend required.

## How It Works

**Core Pipeline:** Visitor → Intent Detector (7 signals) → Decision Engine → DOM Injector → Personalized Hero

**Feedback Loop:** Context Observer watches real-time behavior → re-triggers Intent Detector → re-personalizes mid-session

1. **Intent Detection** — Analyzes 7 signal types: URL/UTM params, referrer, behavior, persona toggle, device type, time of day, and screen size
2. **Decision Engine** — Scores signals, selects the best template and content from a finite registry, outputs an explainable decision object with confidence and reasoning
3. **DOM Injection** — Safely swaps hero content with smooth transitions; graceful fallback on error
4. **Context Observer** — Watches real-time behavior (scroll velocity, clicks, hover dwell, section visibility) and re-personalizes mid-session
5. **A/B Explorer** — Random variant split per intent with automatic winner selection
6. **Multi-Page** — Page-aware personalization across homepage, product, category, and landing pages

## Technical Highlights

| Component | Implementation |
|---|---|
| **Architecture** | 100% client-side JavaScript, zero dependencies, no build tools |
| **Intent Signals** | 7 types: UTM/query params, referrer, behavior, persona toggle, device type, time of day, screen size |
| **Templates** | 3 hero layouts: Impact, Comparison, Value — stored as JSON registry |
| **Assets** | 6 hero images, 6 badge icons, 5 content variants per intent |
| **Explainability** | Every decision outputs structured JSON with signals, confidence, and reasoning |
| **Re-Personalization** | Real-time behavioral observer adapts hero DURING visit (IntersectionObserver, scroll velocity, click patterns) |
| **Safety** | Finite templates (no generation), fallback to default, error boundary |
| **Developer Tools** | Debug overlay (Ctrl+Shift+D), preview mode, event tracking console |
| **A/B Exploration** | Random variant split per intent, localStorage CTR tracking, auto-winner selection |
| **Multi-Page** | Page-aware personalization: homepage, product, category, and landing pages |
| **Analytics Dashboard** | Conversion funnel, intent distribution, signal breakdown, ROI projections |

## Results & Demo

The demo store (UltraView Monitors) demonstrates 5 distinct hero experiences based on visitor intent:
- **Buy Now** → Gaming hero + "Shop Now" CTA
- **Compare** → Split-screen comparison + "Compare Models" CTA
- **Use Case** → Design studio + "Explore by Use Case" CTA
- **Budget** → Value-focused + "View Deals" CTA
- **Default** → Premium general hero

All variants are accessible via URL parameters (`?intent=buy_now`) or the live persona toggle bar.

## Market Opportunity

Personalization for the long tail — **6M+ Shopify stores**, millions of SMB websites, all currently showing static content. IntentFlow is the "Stripe for website experiences": simple to install, powerful under the hood. If plug-and-play personalization becomes easy and safe, it becomes a default growth lever for every small business online.

---

**Built by Yannik Trinn** | 4th Hack-Nation Global AI Hackathon 2026 | [github.com/yatrinn/intentflow](https://github.com/yatrinn/intentflow)
