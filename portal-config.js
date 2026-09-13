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
     "none"   — no visual demo built yet; shows a simple placeholder         */
window.NOVEX_MODULE_INFO = {
  "front-desk":      { name: "AI Front Desk & CRM", tagline: "Every inquiry answered, 24/7", vertical: "both", icon:"☎️",
    demo:{ type:"card", html:'<div class="card"><h2>Talk to Nicole live</h2><p>Call right now and experience the AI receptionist — answers 24/7, multiple languages, never misses a call.</p><a class="phone" href="tel:+14374762332">📞 (437) 476-2332</a></div>' } },
  "digital-human":   { name: "AI Digital Human", tagline: "A face on your website", vertical: "both", icon:"🧑‍💼",
    demo:{ type:"card", html:'<div class="card"><h2>Face-to-face with our AI</h2><p>A live, two-way video conversation — best experienced on the real site since it needs camera/microphone access.</p><a class="btn" href="https://www.novexgrowth.com/demos" target="_blank" rel="noopener">Open on novexgrowth.com →</a></div>' } },
  "reactivation":    { name: "Reactivation & Revenue Recovery", tagline: "Win back dormant leads and past clients", vertical: "both", icon:"🔁",
    demo:{ type:"iframe", src:"reactivation_demo.html" } },
  "reviews-seo":     { name: "Reviews, Referrals & Local SEO", tagline: "More 5-star reviews, automatically", vertical: "both", icon:"⭐",
    demo:{ type:"none" } },
  "social":          { name: "Social Media Management", tagline: "Content, handled end-to-end", vertical: "both", icon:"📱",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/content_automation_demo.html" } },
  "event-order":     { name: "AI Event Order Automation", tagline: "Inquiry to BEO in seconds", vertical: "catering", icon:"📝",
    demo:{ type:"none" } },
  "flyer":           { name: "AI Weekly Flyer Automation", tagline: "Photos in, print-ready flyer out", vertical: "catering", icon:"🖼️",
    demo:{ type:"none" } },
  "ordering":        { name: "Multilingual Ordering & WhatsApp", tagline: "Order by chat, text or voice", vertical: "catering", icon:"💬",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/whatsapp_demo.html" } },
  "kitchen":         { name: "Kitchen / Order Dashboard", tagline: "Every order, one screen", vertical: "catering", icon:"🍽️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/kitchen_dashboard.html" } },
  "loyalty":         { name: "Loyalty Rewards App", tagline: "Turn one order into ten", vertical: "catering", icon:"🎁",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/rewards_app.html" } },
  "venue-os":        { name: "Venue OS", tagline: "Bookings on autopilot", vertical: "venue", icon:"🏛️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/VenueOS_Demo.html" } },
  "layout-planner":  { name: "Event Layout Planner", tagline: "Clients design the room themselves", vertical: "venue", icon:"🗺️",
    demo:{ type:"iframe", src:"https://www.novexgrowth.com/venue_planner.html" } },
  "custom":          { name: "Custom Automation Build", tagline: "Something specific to your workflow", vertical: "both", icon:"⚙️",
    demo:{ type:"none" } }
};
