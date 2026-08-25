// Webhook target for the Anam "capture_lead" tool — invoked live by Nicole's
// video persona when a customer wants a callback. Mirrors the same
// Netlify Forms submission the text/voice chat widget already uses
// (js/main.js's submitNicoleLead), just triggered server-side instead of
// from the browser, since Anam's own servers call this directly.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: true, message: 'Invalid request body' }) };
  }

  const { name, contact, request: requestSummary } = body || {};

  if (!name || !contact) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: true, message: "Missing name or contact — ask the customer for their name and a phone number or email before calling this tool again." })
    };
  }

  try {
    const formBody = new URLSearchParams({
      'form-name': 'nicole-lead',
      name: String(name),
      contact: String(contact),
      request: String(requestSummary || 'Requested a callback via the live video conversation'),
      page: '/ (AI Digital Human — live video)'
    }).toString();

    const res = await fetch('https://novexgrowth.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody
    });

    if (!res.ok) {
      throw new Error('Form submission failed: ' + res.status);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: "Got it — I've passed your info along to the team, they'll be in touch soon." })
    };
  } catch (err) {
    console.error('anam-lead error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: true, message: 'Something went wrong saving this — tell the customer to email info@novexgrowth.com directly as a backup.' })
    };
  }
};
