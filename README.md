# ⚡ IntentFlow

**Plug-and-play AI personalization for any website — in a single script tag.**

IntentFlow detects visitor intent from context signals (UTM parameters, referrer, behavior) and instantly personalizes your hero section with the optimal template, image, headline, and CTA. No backend required. No complex setup. Just paste one snippet.

![IntentFlow Demo](demo/assets/hero-default.png)

---

## 🎯 What It Does

| Feature | Description |
|---|---|
| **Intent Detection** | Analyzes 4+ signal types (UTM params, referrer, on-page behavior, persona toggle) to determine why a visitor arrived |
| **Smart Decision Engine** | Rules-based AI selects the best hero template, image, and CTA from a finite registry — with full explainability |
| **DOM Injection** | Safely swaps hero content with smooth fade transitions; auto-fallback to default on error |
| **3 Hero Templates** | Impact (buy), Comparison (research), Value (budget) — each with distinct layouts optimized for different intents |
| **6 Asset Variants** | Gaming, office, creative, budget, comparison, and default hero images |
| **Debug Overlay** | "Why this variant?" panel showing detected intent, confidence, signals, and full decision JSON |
| **Preview Mode** | Site-owner panel to simulate all intents and see variants live |
| **Event Tracking** | Lightweight client-side analytics for impressions, CTA clicks, and variant swaps |

---

## 🚀 Quick Start (< 5 Minutes)

### 1. Paste one script tag

```html
<!-- Single script tag — that's all you need -->
<script src="intentflow.bundle.js"></script>
```

### 2. Mark your hero section

```html
<section data-intentflow-hero data-intentflow-assets="assets/">
  <!-- Your default hero content (shown as fallback) -->
  <h1>Welcome to our store</h1>
  <a href="#shop">Shop Now</a>
</section>
```

### 3. Done ✅

IntentFlow auto-initializes on page load, detects visitor intent from context signals, and swaps in the optimal hero variant with a smooth transition. If anything fails, your default content is preserved.

> **Modular install** — For advanced setups, load individual modules instead:
> ```html
> <script src="sdk/engine/intent-detector.js"></script>
> <script src="sdk/engine/decision-engine.js"></script>
> <script src="sdk/engine/event-tracker.js"></script>
> <script src="sdk/ui/injector.js"></script>
> <script src="sdk/ui/debug-overlay.js"></script>
> <script src="sdk/ui/preview-mode.js"></script>
> <script src="sdk/intentflow.js"></script>
> ```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Visitor Arrives                        │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│   Intent Detector    │────▶│   Decision Engine    │
│                      │     │                      │
│ • UTM / Query Params │     │ • Template Selection │
│ • Referrer Analysis  │     │ • Image Selection    │
│ • Behavior Signals   │     │ • CTA Optimization   │
│ • Persona Override   │     │ • Explainable Output │
└─────────────────────┘     └──────────┬───────────┘
                                       │
              ┌────────────────────────┤
              ▼                        ▼
┌──────────────────┐    ┌────────────────────────┐
│ Template Registry │    │     Asset Library       │
│  (templates.json) │    │     (assets.json)       │
│                   │    │                         │
│ • hero-impact     │    │ • 6 hero images         │
│ • hero-comparison │    │ • 6 badge icons         │
│ • hero-value      │    │ • 5 content variants    │
└──────────────────┘    └────────────────────────┘
              │                        │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │    DOM Injector        │
              │                        │
              │ • Safe DOM mutation     │
              │ • Smooth transitions   │
              │ • Fallback on error    │
              └────────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │Debug Overlay │ │Event Log │ │Preview Mode  │
    └──────────────┘ └──────────┘ └──────────────┘
```

---

## 📊 Decision Object (Explainability)

Every personalization decision outputs a structured JSON object:

```json
{
  "intent": "COMPARE",
  "confidence": 0.92,
  "template": "hero-comparison",
  "templateName": "Comparison Hero",
  "hero_image": "assets/hero-comparison.png",
  "headline": "Find Your Perfect Match",
  "subheadline": "Side-by-side specs, real benchmarks, and honest reviews.",
  "cta_text": "Compare Models →",
  "cta_link": "#compare",
  "badges": [
    { "icon": "🏆", "label": "Top Rated" },
    { "icon": "🛡️", "label": "3-Year Warranty" },
    { "icon": "✅", "label": "4K Certified" }
  ],
  "reason": "Detected intent: COMPARE (confidence: 92%) from 2 signal(s): utm_campaign(utm_campaign=\"comparison\"), referrer(document.referrer=\"google.com/search\"). Template \"Comparison Hero\" is optimized for COMPARE intent.",
  "signals_used": ["utm_campaign", "referrer"],
  "engine_version": "1.0.0"
}
```

---

## 🧪 Try the Demo

### Run locally

```bash
# Clone the repository
git clone https://github.com/yatrinn/intentflow.git
cd intentflow

# Open the demo (no build step required!)
open demo/index.html
```

### Test different intents

| URL Parameter | Intent | Hero Variant |
|---|---|---|
| `?intent=buy_now` | BUY_NOW | Gaming hero + "Shop Now" CTA |
| `?intent=compare` | COMPARE | Comparison hero + "Compare Models" CTA |
| `?intent=use_case` | USE_CASE | Design studio hero + "Explore by Use Case" CTA |
| `?intent=budget` | BUDGET | Value hero + "View Deals" CTA |
| `?intentflow_debug=true` | — | Shows debug overlay |
| `?intentflow_preview=true` | — | Shows preview mode panel |

Or use the **persona toggle bar** at the top of the demo page to switch intents live.

---

## 📁 Project Structure

```
intentflow/
├── README.md                    # This file
├── LICENSE                      # MIT License
├── package.json                 # Project metadata
├── docs/
│   ├── one-page-report.md       # 1-page structured report
│   └── project-summary.txt      # 150-300 word pitch
├── sdk/                         # Core SDK (the product)
│   ├── intentflow.bundle.js     # ⚡ Single-file bundle (all-in-one)
│   ├── intentflow.js            # Main entry point (modular)
│   ├── engine/
│   │   ├── intent-detector.js   # Multi-signal intent detection
│   │   ├── decision-engine.js   # Explainable template selection
│   │   └── event-tracker.js     # Lightweight analytics
│   ├── registry/
│   │   ├── templates.json       # 3 hero template definitions
│   │   └── assets.json          # Asset library (images, badges, content)
│   └── ui/
│       ├── injector.js          # Safe DOM mutation
│       ├── debug-overlay.js     # "Why this variant" overlay
│       └── preview-mode.js      # Site-owner preview panel
├── demo/                        # Demo store (monitors e-commerce)
│   ├── index.html               # Polished storefront
│   ├── styles.css               # Premium dark-mode design
│   ├── demo.js                  # Persona toggle + event log
│   └── assets/                  # Hero images (6 variants)
└── tests/
    └── test-engine.html         # Browser-based test harness
```

---

## 💡 Intent Taxonomy

| Intent | Trigger Signals | Example URL |
|---|---|---|
| `BUY_NOW` | "buy", "purchase", "shop" in query; email referrer | `?q=buy+4k+monitor` |
| `COMPARE` | "compare", "vs", "best" in query; Google/Reddit referrer | `?utm_campaign=comparison` |
| `USE_CASE` | "gaming", "design", "coding" in query; YouTube referrer | `?q=monitor+for+gaming` |
| `BUDGET` | "cheap", "budget", "under" in query; deal sites referrer | `?q=cheap+144hz+monitor` |
| `DEFAULT` | No strong signals detected | (no params) |

---

## 🔑 Key Design Decisions

1. **Client-side only** — No backend, no API calls, no latency. Everything runs in the browser.
2. **Finite templates** — Safe, predictable personalization from a curated registry (not generative AI).
3. **Graceful fallback** — If anything fails, the original default content is preserved.
4. **Explainable** — Every decision includes a human-readable explanation and full signal breakdown.
5. **Zero dependencies** — Pure vanilla JavaScript. No frameworks, no build tools.

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🏆 Built for

**Hack-Nation Global AI Hackathon 2026**  
Challenge: *Plug-And-Play Dynamic Website — Automated, dynamic website based on third party user data*

Built by **Yannik Trinn** · [GitHub](https://github.com/yatrinn)
