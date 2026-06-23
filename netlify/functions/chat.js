exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Messages required' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `You are Nicole, the friendly AI assistant for Novex Growth — an AI automation agency that builds custom AI growth systems for service businesses. 

Services we offer:
- AI chatbots (website, multilingual, voice + text)
- AI voice receptionists (answer calls 24/7)
- WhatsApp & SMS automation (broadcasts, reactivation campaigns)
- CRM & booking integration
- Multilingual ordering systems
- Outbound growth campaigns (contact list building, email campaigns, WhatsApp list growth)
- Social media AI agent (Instagram & Facebook DM and comment responses)
- Custom automation builds
- Social media management (as an add-on)

We currently work with catering companies and event venues. All engagements are custom-quoted — no fixed pricing. Contact: info@novexgrowth.com. To book a strategy call, direct them to the Contact page at novexgrowth.com/contact.html.

Keep responses warm, concise (2-4 sentences max), and professional. You're having a conversation, not writing an essay. Always end with a question or a clear next step to keep the conversation moving.`,
        messages: messages.slice(-10) // Keep last 10 messages for context
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API error');
    }

    const reply = data.content?.[0]?.text || "I'd be happy to help! Please email info@novexgrowth.com and we'll get back to you shortly.";

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    console.error('Chat function error:', err);
    return {
      statusCode: 200, // Return 200 so the frontend shows the fallback gracefully
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply: "I'm having a small technical hiccup — please email info@novexgrowth.com or book a call directly from our Contact page and we'll get back to you right away!"
      })
    };
  }
};
