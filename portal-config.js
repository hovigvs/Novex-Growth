/* ============================================================================
   NOVEX GROWTH — Client Portal config
   Fill these in once you've created your Supabase project:
   Project → Project Settings → API → "Project URL" and the "anon public" key.
   Safe to publish/commit — the anon key is meant to be public; access control
   is enforced by the Row Level Security policies in portal-schema.sql, not by
   keeping this key secret. Never put the "service_role" key here.

   Until SUPABASE_URL below is filled in, portal.html runs in DEMO MODE:
   every module shows as active under a fake "Demo Account" so you can show
   the software to a prospect today, with no login required. Once Supabase
   is connected, it automatically switches to real per-client logins and
   only shows the modules that client actually owns.
   ========================================================================== */
window.NOVEX_PORTAL_CONFIG = {
  SUPABASE_URL: "PASTE_YOUR_PROJECT_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_YOUR_ANON_PUBLIC_KEY_HERE"
};

/* Display info + demo source for every automation module, keyed by the same
   ids used in catalog.js / the showcase files / client_modules.module_id.
   Add a line here whenever you add a new automation, so the portal knows
   how to show it in the sidebar and what to load when it's opened.

   demo.type:
     "iframe" — embeds demo.src (a live novexgrowth.com page, or a local
                file sitting next to portal.html) directly in the content pane
     "card"   — demo.html is custom markup (for things that can't be iframed,
                e.g. a phone number to call, or a link needing camera access)
     "none"   — no visual demo built yet; shows a simple placeholder

   howItWorks: short array of plain-English steps shown in the collapsible
   "How does this work?" panel above the demo — keep each line to one idea. */
window.NOVEX_MODULE_INFO = {
  "front-desk": { name: "AI Front Desk & CRM", tagline: "Every inquiry answered, 24/7", vertical: "both", icon:"☎️",
    demo:{ type:"card", html:'<div class="card"><h2>Talk to Nicole live</h2><p>Call right now and experience the AI receptionist — answers 24/7, multiple languages, never misses a call.</p><a class="phone" href="tel:+14374762332">📞 (437) 476-2332</a></div>' },
    howItWorks:[
      "Answers every call, text, and web chat instantly — day, night, and weekends.",
      "Understands what the customer actually needs: event type, date, headcount, budget signals.",
      "Handles simple questions and bookings on its own; hands off anything complex to your team with full context already logged.",
      "Every conversation is saved straight into your CRM — no manual data entry."
    ] },
  "digital-human": { name: "AI Digital Human", tagline: "A face on your website", vertical: "both", icon:"🧑‍💼",
    demo:{ type:"card", html:'<div class="card"><h2>Face-to-face with our AI</h2><p>A live, two-way video conversation — best experienced on the real site since it needs camera/microphone access.</p><a class="btn" href="https://www.novexgrowth.com/demos" target="_blank" rel="noopener">Open on novexgrowth.com →</a></div>' },
    howItWorks:[
      "A live, two-way video AI presence embedded right on your website.",
      "Visitors have an actual face-to-face conversation instead of typing into a chat box.",
      "Answers questions about your menu, pricing, and availability in real time.",
      "Feels more premium and personal than a text chatbot — especially on a first visit."
    ] },
  "reactivation": { name: "Reactivation & Revenue Recovery", tagline: "Win back dormant leads and past clients", vertical: "both", icon:"🔁",
    demo:{ type:"iframe", src:"reactivation_demo.html" },
    howItWorks:[
      "Sorts every past inquiry and past client into 4 buckets: Hot (unanswered), Warm (quote gone cold), Dormant (never booked), Past clients (no recent contact).",
      "Drafts an outreach message specific to each lead's real history — not a generic template.",
      "Sends it (with your approval), and AI continues the conversation naturally if they reply.",
      "After a completed event, automatically asks for a review and a referral at the right moment.",
      "Tracks results so you see exactly how many leads were re-engaged and how much revenue was recovered."
    ] },
  "reviews-seo": { name: "Reviews, Referrals & Local SEO", tagline: "More 5-star reviews, automatically", vertical: "both", icon:"⭐",
    demo:{ type:"none" },
    howItWorks:[
      "Automatically requests a review at the right moment after a completed event.",
      "Routes happy customers to Google/Yelp, and catches unhappy ones privately first so problems get fixed before they become a public review.",
      "Keeps your Google Business Profile and local listings accurate and up to date.",
      "More recent, relevant reviews directly help you rank higher in local search."
    ] },
  "social": { name: "Social Media Management", tagline: "Content, handled end-to-end", vertical: "both", icon:"📱",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/content_automation_demo.html" },
    howItWorks:[
      "Turns your event photos and menus into ready-to-post social content.",
      "Writes captions, hashtags, and a posting schedule automatically.",
      "Keeps your feed active without you ever having to sit down and write a post.",
      "You approve before anything goes live — this handles the busywork, not the final call."
    ] },
  "event-order": { name: "AI Event Order Automation", tagline: "Inquiry to BEO in seconds", vertical: "catering", icon:"📝",
    demo:{ type:"none" },
    howItWorks:[
      "Takes the details from a customer conversation — menu picks, headcount, dietary needs, budget.",
      "Drafts a full event order: menu, per-head pricing from your real price list, dietary flags, logistics notes.",
      "A staff member reviews and approves in under a minute instead of building it from scratch.",
      "Once approved, a deposit payment link goes out to the customer automatically."
    ] },
  "flyer": { name: "AI Weekly Flyer Automation", tagline: "Photos in, print-ready flyer out", vertical: "catering", icon:"🖼️",
    demo:{ type:"none" },
    howItWorks:[
      "You upload this week's dish photos and pricing — no design skills needed.",
      "It automatically lays out a branded, print-ready weekly flyer or menu.",
      "Keeps your visual style consistent week to week without hiring a designer.",
      "Exports ready to print or post directly to social/WhatsApp."
    ] },
  "ordering": { name: "Multilingual Ordering & WhatsApp", tagline: "Order by chat, text or voice", vertical: "catering", icon:"💬",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/whatsapp_demo.html" },
    howItWorks:[
      "Customers order directly through WhatsApp, SMS, or voice — in their own language.",
      "The AI understands the order, confirms items and quantities, and calculates the total.",
      "Confirmed orders are sent straight into your kitchen queue automatically.",
      "No app download required — customers just message the number they already have."
    ] },
  "kitchen": { name: "Kitchen / Order Dashboard", tagline: "Every order, one screen", vertical: "catering", icon:"🍽️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/kitchen_dashboard.html" },
    howItWorks:[
      "Every order — from WhatsApp, website, or phone — lands on one live screen.",
      "Kitchen staff see exactly what to prep, how many, and by when, updated in real time.",
      "Tracks daily revenue, order counts, and subscriber activity at a glance.",
      "Removes the need to check multiple inboxes or apps to know what's coming in."
    ] },
  "loyalty": { name: "Loyalty Rewards App", tagline: "Turn one order into ten", vertical: "catering", icon:"🎁",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/rewards_app.html" },
    howItWorks:[
      "Customers automatically earn points on every order — no sign-up hassle.",
      "They're notified when they're close to unlocking a reward, nudging the next order.",
      "Runs entirely in the background — no manual tracking or punch cards.",
      "Turns one-time customers into repeat ones without extra ad spend."
    ] },
  "venue-os": { name: "Venue OS", tagline: "Bookings on autopilot", vertical: "venue", icon:"🏛️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/VenueOS_Demo.html" },
    howItWorks:[
      "Lead Revival Bot responds to every new inquiry in under 60 seconds, any time of day.",
      "Tour Booker Bot qualifies interest and books tours straight into your calendar — no back-and-forth.",
      "Dietary Bot collects guest dietary info ahead of time and delivers a clean report to your kitchen.",
      "All three work together so nothing falls through the cracks between first contact and event day."
    ] },
  "layout-planner": { name: "Event Layout Planner", tagline: "Clients design the room themselves", vertical: "venue", icon:"🗺️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/venue_planner.html" },
    howItWorks:[
      "Couples or planners drag and drop tables and furniture directly onto your real floor plan.",
      "Guest capacity and seating updates live as they design the room.",
      "They submit the finished layout straight to you — no emailing sketches back and forth.",
      "Cuts out hours of manual back-and-forth on room logistics."
    ] },
  "custom": { name: "Custom Automation Build", tagline: "Something specific to your workflow", vertical: "both", icon:"⚙️",
    demo:{ type:"none" },
    howItWorks:[
      "Not a packaged product — this is us building something specific to a gap in your exact process.",
      "We map your current workflow first, then automate the actual bottleneck, not a generic template.",
      "Uses the same AI and automation toolkit as every other module here.",
      "Book a call to scope what this would look like for your business."
    ] }
};
