// Buffered chat endpoint (text mode + the voice fallback path).
// Persona / model / length rules live in ./_nicole.js so chat-stream.mjs
// stays in sync with this file. Streaming voice replies use chat-stream.mjs.
const { MODEL, buildSystemPrompt } = require('./_nicole.js');

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

  const { messages, voiceMode } = body;
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
        model: MODEL,
        max_tokens: voiceMode ? 300 : 1000,
        system: buildSystemPrompt(voiceMode),
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
