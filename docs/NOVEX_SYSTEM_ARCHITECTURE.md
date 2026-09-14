# Novex Growth — System Architecture

## The one rule

**Every new feature integrates with Novex Core. Nothing gets built as a separate, isolated system.**

Concretely: before writing a new module/demo, ask "does this touch a business, a
customer, a lead, a conversation, or an asset?" If yes, it reads and writes
through the Core data model below — even while that model is still just a
shape in localStorage/demo-mode, not a real database yet. It does **not**
invent its own private copy of "leads" or "customers" with a different shape.

This is written down because the current codebase already violates it in
several places (see [Current State](#current-state-honest-audit) below) —
those are debt to pay down, not a pattern to copy for the next module.

## Target architecture

```
NOVEX GROWTH SYSTEM
│
├── Core
│   ├── Authentication
│   ├── Businesses
│   ├── Users
│   ├── Customers
│   ├── Leads
│   ├── Conversations
│   ├── Assets
│   ├── Campaigns
│   ├── Automations
│   └── AI Agents
│
├── Growth
│   ├── Lead Generation
│   ├── Lead Recovery
│   ├── Follow-up
│   └── Analytics
│
├── Marketing
│   ├── Social Media
│   ├── Flyer Generator
│   ├── Content Engine
│   ├── SEO
│   └── Google Business
│
├── Communication
│   ├── AI Receptionist
│   ├── WhatsApp
│   ├── SMS
│   ├── Email
│   └── Voice
│
├── Sales
│   ├── Quotes
│   ├── Proposals
│   ├── Booking
│   └── Payments
│
└── Industry Modules
    ├── Catering
    ├── Venues
    ├── Restaurants
    └── Future verticals
```

## Core entities (the shared vocabulary)

Every module that touches these concepts uses this shape — not its own
one-off fields. Sketch, not final schema:

| Entity | Key fields | Owned by |
|---|---|---|
| **Business** | id, name, vertical (catering/venue/restaurant), plan, owned modules | Core |
| **User** | id, business_id, role, email | Core (Auth) |
| **Customer** | id, business_id, name, contact, tags, lifetime value | Core |
| **Lead** | id, business_id, source, status (hot/warm/cold/past), linked customer | Core → feeds Growth |
| **Conversation** | id, business_id, channel (voice/chat/whatsapp/sms/email), participant, transcript, linked lead/customer | Core → feeds Communication |
| **Asset** | id, business_id, type (photo/menu item/video), file ref, tags | Core → feeds Marketing, Industry Modules |
| **Campaign** | id, business_id, type, target segment, status | Core → feeds Growth, Marketing |
| **Automation** | id, business_id, trigger, action, module owner | Core |
| **AI Agent** | id, business_id, persona, voice/model config, channel(s) | Core → feeds Communication |

A vertical module (e.g. Catering) doesn't own its own "customer" concept —
it reads/writes the Core `Customer`/`Lead`/`Conversation` records and adds
vertical-specific fields on top (e.g. `dietary_prefs`, `event_date`) rather
than a parallel table.

## Current state (honest audit)

Nothing below is wired to a real Core yet — `portal.html`'s `isDemoMode` flag
(no `SUPABASE_URL` configured) means every module currently runs on its own
mock/local data. Mapping what exists today onto the target tree, so we know
what's real vs. what's still an isolated island:

| Existing file | Target bucket | Core-integrated? |
|---|---|---|
| `portal.html` + `portal-config.js` | Core (app shell / module registry) | Shell only — no backend yet |
| `reactivation_demo.html` | Growth → Lead Recovery | ❌ own `LEADS` array, not Core `Lead` |
| `missed_call_recovery_demo.html` | Growth → Lead Recovery / Communication | ❌ standalone mock data |
| `qualification_demo.html` | Growth → Lead Generation | ❌ standalone mock data |
| `beo_generator_demo.html` | Sales → Quotes/Proposals | ❌ standalone mock data |
| `flyer_generator_demo.html`, `flyer_print_prototype.html` | Marketing → Flyer Generator | ❌ standalone sample data (currently unlinked from portal — not accepted yet) |
| `website_v2.html` (Layla chat) | Communication → AI Receptionist / Industry Modules → Catering | ❌ own `localStorage` keys (`layla_ck`/`layla_ek`/etc.), separate from everything else |
| `kitchen_dashboard.html`, `rewards_app.html`, `venue_planner.html`, `VenueOS_Demo.html` | Industry Modules | ❌ standalone |
| `whatsapp_demo.html` | Communication → WhatsApp | ❌ standalone |
| `netlify/functions/chat.js`, `chat-stream.mjs`, `tts.js`, `_nicole.js` | Communication → AI Receptionist / Voice (server-side proxy layer) | ✅ Closest thing to shared infra today — these already centralize the Anthropic/ElevenLabs API keys server-side instead of each module having its own |

**Takeaway:** the Netlify Functions proxy pattern (`tts.js`, `chat.js`) is the
one part of the system that already behaves like shared Core infrastructure
— every voice/chat feature calls through it instead of embedding its own API
key. That's the model to extend: a shared data layer that every module calls
into, instead of each demo inventing its own state.

## What this means for the next feature

1. Check this doc's Core entity table first. If the feature needs
   customer/lead/conversation/asset data, define it as that Core shape
   (even if the "backend" is just a shared `localStorage` schema for now
   under demo mode) — don't invent parallel fields.
2. New client-facing modules register in `portal-config.js`'s
   `NOVEX_MODULE_INFO`, same as today — that part of the pattern is fine and
   stays.
3. Anything hitting a paid API (LLM, TTS, image/video gen) goes through a
   Netlify Function, never client-side, following the existing
   `tts.js`/`chat.js` pattern.
4. When real per-client accounts happen (Supabase, deferred — see
   `isDemoMode` in `portal.html`), the Core tables above are what get
   created first, before any per-module tables — every module should be
   migratable onto them without a rewrite, because it was already shaped
   that way.
