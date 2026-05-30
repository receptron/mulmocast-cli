# MulmoCast Presentation Deck — Authoring Guide (for LLMs)

You generate a **MulmoScript** JSON file. There are **two ways** to author a slide deck.
Pick one per deck (don't mix), then imitate the matching sample below.

## The two approaches

1. **`slide`** — structured layouts (`title`, `stats`, `table`, `timeline`, …). Static images.
   Pick this by **default**: compact, consistent, hard to break.

2. **`html_tailwind` + `animation: true`** — free-form HTML/CSS/JS, rendered to an animated video.
   Pick this **only when motion is wanted** (count-up numbers, sequential reveals, animated opener).

Each beat is `{ "text": "narration…", "image": { … } }`. The two approaches differ only in what goes
inside `image`. Study the samples — every field you need appears there.

---

## Sample A — `slide` (structured layouts)

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Aurora Analytics — Slide Deck Showcase",
  "slideParams": {
    "theme": {
      "colors": {
        "bg": "0F172A", "bgCard": "1E293B", "bgCardAlt": "334155",
        "text": "F8FAFC", "textMuted": "CBD5E1", "textDim": "64748B",
        "primary": "38BDF8", "accent": "A78BFA", "success": "34D399",
        "warning": "FBBF24", "danger": "F87171", "info": "22D3EE", "highlight": "F472B6"
      },
      "fonts": { "title": "Georgia", "body": "Helvetica", "mono": "Menlo" }
    }
  },
  "beats": [
    {
      "text": "Welcome to Aurora Analytics. Today we will walk through where we are and where we are going.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "title",
          "title": "Aurora Analytics",
          "subtitle": "Turning raw events into decisions, in real time",
          "author": "Mei Tanaka, Head of Product  |  Q2 2026",
          "note": "Every slide in this deck inherits the deck-level theme defined once in slideParams.theme."
        }
      }
    },
    {
      "text": "We believe data should speak the moment it arrives, not the morning after.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "bigQuote",
          "accentColor": "primary",
          "quote": "Data should speak the moment it arrives, not the morning after.",
          "author": "Aurora Founding Principle",
          "role": "Every beat inherits the deck-level theme from slideParams.theme."
        }
      }
    },
    {
      "text": "Our pipeline works in three stages: ingest, transform, and serve.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "columns",
          "accentColor": "primary",
          "stepLabel": "PIPELINE",
          "title": "How Aurora Works",
          "subtitle": "From raw events to live dashboards in three stages",
          "showArrows": true,
          "columns": [
            {
              "title": "Ingest",
              "num": 1,
              "accentColor": "primary",
              "content": [
                { "type": "text", "value": "Events stream in from SDKs, webhooks, and warehouses." },
                { "type": "bullets", "items": ["50+ source connectors", "Exactly-once delivery", "Schema autodetect"] }
              ]
            },
            {
              "title": "Transform",
              "num": 2,
              "accentColor": "accent",
              "content": [
                { "type": "text", "value": "Streaming SQL enriches and aggregates on the fly." },
                { "type": "bullets", "items": ["Windowed joins", "Sub-second latency", "Versioned models"] }
              ]
            },
            {
              "title": "Serve",
              "num": 3,
              "accentColor": "success",
              "content": [
                { "type": "text", "value": "Results push to dashboards, alerts, and reverse-ETL." },
                { "type": "bullets", "items": ["Live dashboards", "Slack & PagerDuty", "API + reverse-ETL"] }
              ]
            }
          ],
          "callout": {
            "label": "Tip",
            "text": "The same MulmoScript can render to video, PDF, and a self-contained HTML deck.",
            "color": "info",
            "leftBar": true
          }
        }
      }
    },
    {
      "text": "The numbers tell the story of the last quarter.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "stats",
          "accentColor": "primary",
          "title": "Quarter in Numbers",
          "subtitle": "FY2026 Q1 snapshot",
          "stats": [
            { "value": "+47%", "label": "Revenue YoY", "color": "success", "change": "+12pts" },
            { "value": "1.9M", "label": "Daily Active Orgs", "color": "primary" },
            { "value": "320ms", "label": "p99 Query Latency", "color": "info", "change": "-38%" },
            { "value": "99.98%", "label": "Uptime", "color": "accent" }
          ],
          "callout": { "text": "All metrics are sourced live from Aurora running on itself.", "align": "center" }
        }
      }
    },
    {
      "text": "Four capabilities set Aurora apart from batch tooling.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "grid",
          "accentColor": "accent",
          "title": "What You Get",
          "subtitle": "Core capabilities at a glance",
          "gridColumns": 4,
          "items": [
            { "title": "Real-time", "icon": "⚡", "accentColor": "primary", "description": "Sub-second freshness from source to screen" },
            { "title": "Governed", "icon": "🔒", "accentColor": "info", "description": "Row-level security and full audit trails" },
            { "title": "Open", "icon": "🔌", "accentColor": "accent", "description": "SQL-native, no proprietary lock-in" },
            { "title": "Scalable", "icon": "📈", "accentColor": "success", "description": "From one stream to a million per second" }
          ],
          "footer": "Every capability ships on day one — no add-on tiers."
        }
      }
    },
    {
      "text": "Compare the old batch world with the Aurora way.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "comparison",
          "accentColor": "primary",
          "stepLabel": "WHY NOW",
          "title": "Batch vs. Streaming",
          "subtitle": "Why teams are leaving nightly jobs behind",
          "left": {
            "title": "Nightly Batch",
            "accentColor": "danger",
            "content": [
              { "type": "bullets", "items": ["Data is hours stale", "Failures found next morning", "Rigid, brittle schedules"], "icon": "✗" },
              { "type": "metric", "value": "~8h", "label": "Decision lag", "color": "danger" }
            ],
            "footer": "Yesterday's answers, today"
          },
          "right": {
            "title": "Aurora Streaming",
            "accentColor": "success",
            "content": [
              { "type": "bullets", "items": ["Always-fresh data", "Alerts the moment it breaks", "Self-healing pipelines"], "icon": "✓" },
              { "type": "metric", "value": "<1s", "label": "Decision lag", "color": "success" }
            ],
            "footer": "Answers as events happen"
          },
          "callout": { "label": "Result", "text": "From 8 hours to under a second — a 28,000x improvement in freshness.", "color": "success", "leftBar": true }
        }
      }
    },
    {
      "text": "Here is the architecture and a taste of the developer experience.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "split",
          "accentColor": "primary",
          "left": {
            "title": "Developer Experience",
            "label": "DX",
            "accentColor": "primary",
            "ratio": 50,
            "content": [
              { "type": "text", "value": "Define a streaming view in plain SQL — Aurora handles the rest.", "bold": true },
              { "type": "divider", "color": "primary" },
              { "type": "bullets", "items": ["No Kafka to babysit", "Version-controlled models", "Local-to-prod parity"] },
              { "type": "callout", "text": "Ships with a typed SDK for TypeScript, Python, and Go.", "style": "info" }
            ]
          },
          "right": {
            "title": "Define a live view",
            "dark": true,
            "ratio": 50,
            "content": [
              { "type": "code", "code": "CREATE LIVE VIEW active_orgs AS\nSELECT\n  org_id,\n  count(*) AS events,\n  max(ts)  AS last_seen\nFROM stream.events\nWHERE ts > now() - INTERVAL '5 minutes'\nGROUP BY org_id;" }
            ]
          }
        }
      }
    },
    {
      "text": "We position Aurora on flexibility versus ease of use.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "matrix",
          "accentColor": "info",
          "title": "The Landscape",
          "subtitle": "Where each approach lands on flexibility and ease of use",
          "xAxis": { "low": "Low Flexibility", "high": "High Flexibility" },
          "yAxis": { "low": "Hard to Use", "high": "Easy to Use" },
          "cells": [
            { "label": "Hand-rolled Kafka", "accentColor": "warning", "items": ["Total control", "Heavy ops burden"] },
            { "label": "Aurora", "accentColor": "success", "items": ["Flexible SQL", "Fully managed", "Sweet spot"] },
            { "label": "Spreadsheets", "accentColor": "danger", "items": ["Anyone can use", "Breaks at scale"] },
            { "label": "Closed BI Suite", "accentColor": "info", "items": ["Polished UI", "Vendor lock-in"] }
          ]
        }
      }
    },
    {
      "text": "Our roadmap takes us from launch to an open ecosystem.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "timeline",
          "accentColor": "primary",
          "stepLabel": "ROADMAP",
          "title": "Where We Are Headed",
          "subtitle": "Major milestones across 2026",
          "items": [
            { "date": "Q1 2026", "title": "GA Launch", "description": "Public availability\n50 connectors", "color": "primary", "done": true },
            { "date": "Q2 2026", "title": "Live Views 2.0", "description": "Incremental joins\nMaterialized caching", "color": "accent", "done": true },
            { "date": "Q3 2026", "title": "Governance Suite", "description": "Row-level policies\nLineage graph", "color": "info" },
            { "date": "Q4 2026", "title": "Marketplace", "description": "Community connectors\nShared models", "color": "success" }
          ]
        }
      }
    },
    {
      "text": "Adoption flows from sign-up to active production teams.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "funnel",
          "accentColor": "primary",
          "title": "Adoption Funnel",
          "subtitle": "From first sign-up to production champions",
          "stages": [
            { "label": "Sign-ups", "value": "32K", "description": "Free tier activations", "color": "primary" },
            { "label": "Connected", "value": "9.1K", "description": "First data source wired in", "color": "accent" },
            { "label": "In Production", "value": "2.4K", "description": "Live view powering a real workflow", "color": "info" },
            { "label": "Paid Teams", "value": "610", "description": "Upgraded to a paid plan", "color": "warning" },
            { "label": "Champions", "value": "95", "description": "Multi-team rollout", "color": "success" }
          ],
          "callout": { "text": "1.9% sign-up to paid conversion, well above category benchmarks.", "align": "center" }
        }
      }
    },
    {
      "text": "This bridge shows how we turned last year's profit into this year's.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "waterfall",
          "title": "FY2026 ARR Bridge",
          "subtitle": "YoY +$6.2M (+41%)",
          "unit": "$M",
          "items": [
            { "label": "FY2025\nARR", "value": 15.0, "isTotal": true },
            { "label": "New\nLogos", "value": 5.4 },
            { "label": "Expansion", "value": 3.1 },
            { "label": "Churn", "value": -2.3 },
            { "label": "FX", "value": -0.0 },
            { "label": "FY2026\nARR", "value": 21.2, "isTotal": true }
          ],
          "callout": { "label": "Summary", "text": "New logos and expansion more than offset churn, lifting ARR past $21M." }
        }
      }
    },
    {
      "text": "Finally, here is how every plan compares feature by feature.",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "table",
          "accentColor": "primary",
          "title": "Plan Comparison",
          "subtitle": "Pick the tier that fits your stage",
          "headers": ["Feature", "Free", "Team", "Enterprise"],
          "rowHeaders": true,
          "rows": [
            ["Live views", "3", "Unlimited", "Unlimited"],
            ["Connectors", "5", "50", "50+ custom"],
            ["Row-level security", "—", { "text": "✓", "color": "success", "bold": true }, { "text": "✓", "color": "success", "bold": true }],
            ["SSO & audit logs", "—", "—", { "text": "✓", "color": "success", "bold": true }],
            ["Support", "Community", "8x5", { "text": "24x7", "color": "primary", "bold": true }]
          ],
          "callout": { "label": "Note", "text": "All tiers include sub-second freshness — performance is never gated.", "color": "info", "leftBar": true }
        }
      }
    }
  ]
}
```

---

## Sample B — `html_tailwind` + `animation: true` (animated)

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Aurora Analytics — Animated html_tailwind Showcase",
  "beats": [
    {
      "text": "Welcome to Aurora Analytics. Today we will walk through where we are and where we are going.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;overflow:hidden'>",
          "  <div id='kicker' style='opacity:0;letter-spacing:.3em;font-size:20px;color:var(--primary);margin-bottom:24px;text-transform:uppercase'>Investor Update &middot; Q2 2026</div>",
          "  <h1 id='title' style='opacity:0;font-family:var(--titleFont);font-size:88px;font-weight:800;margin:0'>Aurora Analytics</h1>",
          "  <div id='subtitle' style='font-size:34px;color:var(--muted);margin-top:24px;min-height:44px'></div>",
          "  <div id='author' style='opacity:0;font-size:22px;color:var(--dim);margin-top:48px'>Mei Tanaka &middot; Head of Product</div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.animate('#kicker', { opacity:[0,1], translateY:[20,0] }, { start:0, end:0.5, easing:'easeOut' });",
          "animation.animate('#title', { opacity:[0,1], translateY:[40,0] }, { start:0.3, end:1.1, easing:'easeOut' });",
          "animation.typewriter('#subtitle', 'Turning raw events into decisions, in real time', { start:1.1, end:3.2 });",
          "animation.animate('#author', { opacity:[0,1] }, { start:3.2, end:4.0, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "We believe data should speak the moment it arrives, not the morning after.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:120px;overflow:hidden'>",
          "  <div style='font-size:120px;line-height:0.5;color:var(--accent);font-family:var(--titleFont)'>&ldquo;</div>",
          "  <blockquote id='quote' style='font-family:var(--titleFont);font-size:52px;font-weight:600;line-height:1.3;margin:0;min-height:140px'></blockquote>",
          "  <div id='cite' style='opacity:0;font-size:24px;color:var(--muted);margin-top:40px'>&mdash; Aurora Founding Principle</div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.typewriter('#quote', 'Data should speak the moment it arrives, not the morning after.', { start:0.2, end:3.0 });",
          "animation.animate('#cite', { opacity:[0,1], translateX:[-20,0] }, { start:3.0, end:3.8, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "The numbers tell the story of the last quarter.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 style='font-family:var(--titleFont);font-size:48px;font-weight:700;margin:0'>Quarter in Numbers</h2>",
          "  <div style='font-size:24px;color:var(--muted);margin-top:8px'>FY2026 Q1 snapshot</div>",
          "  <div style='display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:56px'>",
          "    <div id='card0' style='opacity:0;background:var(--card);border-radius:16px;padding:36px 24px;text-align:center'><div id='stat0' style='font-size:60px;font-weight:800;color:var(--success)'>0</div><div style='color:var(--muted);font-size:20px;margin-top:8px'>Revenue YoY</div></div>",
          "    <div id='card1' style='opacity:0;background:var(--card);border-radius:16px;padding:36px 24px;text-align:center'><div id='stat1' style='font-size:60px;font-weight:800;color:var(--primary)'>0</div><div style='color:var(--muted);font-size:20px;margin-top:8px'>Daily Active Orgs</div></div>",
          "    <div id='card2' style='opacity:0;background:var(--card);border-radius:16px;padding:36px 24px;text-align:center'><div id='stat2' style='font-size:60px;font-weight:800;color:var(--info)'>0</div><div style='color:var(--muted);font-size:20px;margin-top:8px'>p99 Latency</div></div>",
          "    <div id='card3' style='opacity:0;background:var(--card);border-radius:16px;padding:36px 24px;text-align:center'><div id='stat3' style='font-size:60px;font-weight:800;color:var(--accent)'>0</div><div style='color:var(--muted);font-size:20px;margin-top:8px'>Uptime</div></div>",
          "  </div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.stagger('#card{i}', 4, { opacity:[0,1], translateY:[30,0] }, { start:0, stagger:0.15, duration:0.5, easing:'easeOut' });",
          "animation.counter('#stat0', [0,47], { start:0.3, end:1.8, prefix:'+', suffix:'%' });",
          "animation.counter('#stat1', [0,1.9], { start:0.45, end:1.95, suffix:'M', decimals:1 });",
          "animation.counter('#stat2', [0,320], { start:0.6, end:2.1, suffix:'ms' });",
          "animation.counter('#stat3', [0,99.98], { start:0.75, end:2.25, suffix:'%', decimals:2 });"
        ]
      }
    },
    {
      "text": "Our pipeline works in three stages: ingest, transform, and serve.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 style='font-family:var(--titleFont);font-size:48px;font-weight:700;margin:0'>How Aurora Works</h2>",
          "  <div style='font-size:24px;color:var(--muted);margin-top:8px'>From raw events to live dashboards in three stages</div>",
          "  <div style='display:flex;gap:24px;align-items:stretch;margin-top:56px'>",
          "    <div id='step0' style='opacity:0;flex:1;background:var(--card);border-top:4px solid var(--primary);border-radius:14px;padding:32px'><div style='font-size:22px;font-weight:800;color:var(--primary)'>1 &middot; Ingest</div><div style='color:var(--muted);font-size:22px;margin-top:14px'>50+ connectors stream events in with exactly-once delivery.</div></div>",
          "    <div id='step1' style='opacity:0;flex:1;background:var(--card);border-top:4px solid var(--accent);border-radius:14px;padding:32px'><div style='font-size:22px;font-weight:800;color:var(--accent)'>2 &middot; Transform</div><div style='color:var(--muted);font-size:22px;margin-top:14px'>Streaming SQL enriches and aggregates with sub-second latency.</div></div>",
          "    <div id='step2' style='opacity:0;flex:1;background:var(--card);border-top:4px solid var(--success);border-radius:14px;padding:32px'><div style='font-size:22px;font-weight:800;color:var(--success)'>3 &middot; Serve</div><div style='color:var(--muted);font-size:22px;margin-top:14px'>Results push to dashboards, alerts, and reverse-ETL.</div></div>",
          "  </div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.stagger('#step{i}', 3, { opacity:[0,1], translateY:[40,0], scale:[0.96,1] }, { start:0, stagger:0.4, duration:0.6, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "Compare the old batch world with the Aurora way.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 style='font-family:var(--titleFont);font-size:48px;font-weight:700;margin:0;text-align:center'>Batch vs. Streaming</h2>",
          "  <div style='display:flex;gap:32px;margin-top:48px'>",
          "    <div id='before' style='opacity:0;flex:1;background:var(--card);border-radius:16px;padding:40px;border-left:6px solid var(--danger)'><div style='font-size:26px;font-weight:800;color:var(--danger)'>Nightly Batch</div><div style='font-size:22px;color:var(--muted);margin-top:16px'>Data is hours stale. Failures surface the next morning.</div><div style='font-size:64px;font-weight:800;color:var(--danger);margin-top:24px'>~8h <span style='font-size:22px;color:var(--muted)'>lag</span></div></div>",
          "    <div id='after' style='opacity:0;flex:1;background:var(--card);border-radius:16px;padding:40px;border-left:6px solid var(--success)'><div style='font-size:26px;font-weight:800;color:var(--success)'>Aurora Streaming</div><div style='font-size:22px;color:var(--muted);margin-top:16px'>Always-fresh data. Alerts the moment something breaks.</div><div style='font-size:64px;font-weight:800;color:var(--success);margin-top:24px'>&lt;1s <span style='font-size:22px;color:var(--muted)'>lag</span></div></div>",
          "  </div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.animate('#before', { opacity:[0,1], translateX:[-80,0] }, { start:0, end:0.7, easing:'easeOut' });",
          "animation.animate('#after', { opacity:[0,1], translateX:[80,0] }, { start:0.6, end:1.3, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "Here is a taste of the developer experience: define a live view in plain SQL.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 id='codeTitle' style='opacity:0;font-family:var(--titleFont);font-size:44px;font-weight:700;margin:0'>Define a live view in SQL</h2>",
          "  <pre style='background:#0B1220;border:1px solid var(--cardAlt);border-radius:14px;padding:32px;margin-top:32px;font-size:26px;line-height:1.5;color:var(--info);font-family:Menlo,Consolas,monospace;min-height:280px'><code id='code'></code></pre>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.animate('#codeTitle', { opacity:[0,1], translateY:[20,0] }, { start:0, end:0.5, easing:'easeOut' });",
          "animation.codeReveal('#code', ['CREATE LIVE VIEW active_orgs AS', 'SELECT', '  org_id,', '  count(*) AS events,', '  max(ts)  AS last_seen', 'FROM stream.events', \"WHERE ts > now() - INTERVAL '5 minutes'\", 'GROUP BY org_id;'], { start:0.5, end:3.5 });"
        ]
      }
    },
    {
      "text": "Our roadmap takes us from launch to an open ecosystem.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 style='font-family:var(--titleFont);font-size:48px;font-weight:700;margin:0'>Where We Are Headed</h2>",
          "  <div style='display:flex;gap:20px;margin-top:56px'>",
          "    <div id='mile0' style='opacity:0;flex:1;text-align:center'><div style='width:24px;height:24px;border-radius:50%;background:var(--primary);margin:0 auto 16px'></div><div style='font-size:20px;color:var(--dim)'>Q1 2026</div><div style='font-size:26px;font-weight:700;margin-top:6px'>GA Launch</div></div>",
          "    <div id='mile1' style='opacity:0;flex:1;text-align:center'><div style='width:24px;height:24px;border-radius:50%;background:var(--accent);margin:0 auto 16px'></div><div style='font-size:20px;color:var(--dim)'>Q2 2026</div><div style='font-size:26px;font-weight:700;margin-top:6px'>Live Views 2.0</div></div>",
          "    <div id='mile2' style='opacity:0;flex:1;text-align:center'><div style='width:24px;height:24px;border-radius:50%;background:var(--info);margin:0 auto 16px'></div><div style='font-size:20px;color:var(--dim)'>Q3 2026</div><div style='font-size:26px;font-weight:700;margin-top:6px'>Governance Suite</div></div>",
          "    <div id='mile3' style='opacity:0;flex:1;text-align:center'><div style='width:24px;height:24px;border-radius:50%;background:var(--success);margin:0 auto 16px'></div><div style='font-size:20px;color:var(--dim)'>Q4 2026</div><div style='font-size:26px;font-weight:700;margin-top:6px'>Marketplace</div></div>",
          "  </div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.stagger('#mile{i}', 4, { opacity:[0,1], translateY:[30,0] }, { start:0, stagger:0.35, duration:0.5, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "Adoption flows from sign-up to active production teams.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;padding:80px;overflow:hidden'>",
          "  <h2 style='font-family:var(--titleFont);font-size:48px;font-weight:700;margin:0'>Adoption Funnel</h2>",
          "  <div style='margin-top:48px;display:flex;flex-direction:column;gap:14px'>",
          "    <div style='display:flex;align-items:center;gap:20px'><div style='width:200px;color:var(--muted);font-size:22px'>Sign-ups</div><div id='bar0' style='width:0%;height:46px;background:var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-weight:700;color:#0B1220'>32K</div></div>",
          "    <div style='display:flex;align-items:center;gap:20px'><div style='width:200px;color:var(--muted);font-size:22px'>Connected</div><div id='bar1' style='width:0%;height:46px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-weight:700;color:#0B1220'>9.1K</div></div>",
          "    <div style='display:flex;align-items:center;gap:20px'><div style='width:200px;color:var(--muted);font-size:22px'>In Production</div><div id='bar2' style='width:0%;height:46px;background:var(--info);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-weight:700;color:#0B1220'>2.4K</div></div>",
          "    <div style='display:flex;align-items:center;gap:20px'><div style='width:200px;color:var(--muted);font-size:22px'>Paid Teams</div><div id='bar3' style='width:0%;height:46px;background:var(--warning);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-weight:700;color:#0B1220'>610</div></div>",
          "    <div style='display:flex;align-items:center;gap:20px'><div style='width:200px;color:var(--muted);font-size:22px'>Champions</div><div id='bar4' style='width:0%;height:46px;background:var(--success);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-weight:700;color:#0B1220'>95</div></div>",
          "  </div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.animate('#bar0', { width:[0,92,'%'] }, { start:0.0, end:0.8, easing:'easeOut' });",
          "animation.animate('#bar1', { width:[0,70,'%'] }, { start:0.2, end:1.0, easing:'easeOut' });",
          "animation.animate('#bar2', { width:[0,48,'%'] }, { start:0.4, end:1.2, easing:'easeOut' });",
          "animation.animate('#bar3', { width:[0,28,'%'] }, { start:0.6, end:1.4, easing:'easeOut' });",
          "animation.animate('#bar4', { width:[0,14,'%'] }, { start:0.8, end:1.6, easing:'easeOut' });"
        ]
      }
    },
    {
      "text": "Aurora makes your data speak the moment it arrives. Let's build it together.",
      "image": {
        "type": "html_tailwind",
        "animation": true,
        "html": [
          "<style>:root{--bg:#0F172A;--card:#1E293B;--cardAlt:#334155;--text:#F8FAFC;--muted:#CBD5E1;--dim:#64748B;--primary:#38BDF8;--accent:#A78BFA;--success:#34D399;--warning:#FBBF24;--danger:#F87171;--info:#22D3EE;--highlight:#F472B6;--titleFont:Georgia,serif;--bodyFont:Helvetica,Arial,sans-serif}</style>",
          "<div style='position:absolute;inset:0;background:var(--bg);color:var(--text);font-family:var(--bodyFont);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;overflow:hidden'>",
          "  <h1 id='closeTitle' style='opacity:0;font-family:var(--titleFont);font-size:72px;font-weight:800;margin:0'>Data that speaks, instantly.</h1>",
          "  <div id='cta' style='opacity:0;margin-top:48px;background:var(--primary);color:#0B1220;font-size:28px;font-weight:800;padding:20px 48px;border-radius:999px'>Start free at aurora.dev</div>",
          "  <div style='margin-top:32px;display:flex;align-items:center;gap:12px;color:var(--success);font-size:22px'><span id='pulse' style='width:14px;height:14px;border-radius:50%;background:var(--success);display:inline-block'></span>Live demo running now</div>",
          "</div>"
        ],
        "script": [
          "const animation = new MulmoAnimation();",
          "animation.animate('#closeTitle', { opacity:[0,1], scale:[0.9,1] }, { start:0, end:0.8, easing:'easeOut' });",
          "animation.animate('#cta', { opacity:[0,1], translateY:[20,0] }, { start:0.8, end:1.4, easing:'easeOut' });",
          "animation.blink('#pulse', { interval:0.6 });"
        ]
      }
    }
  ]
}
```
