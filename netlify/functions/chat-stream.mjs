// Streaming chat endpoint — used only by voice mode.
// Streams Claude's reply back as plain-text token chunks so the browser can
// start turning the first sentence into speech while the rest is still being
// generated. The buffered chat.js is the fallback if this fails for any reason;
// text mode never uses this endpoint.
//
// Netlify Functions v2 (export default + returning a Response with a stream
// body). Persona/model rules are shared via ./_nicole.js.

import { MODEL, buildSystemPrompt } from './_nicole.js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid request', { status: 400 });
  }

  const { messages } = payload || {};
  if (!Array.isArray(messages)) {
    return new Response('Messages required', { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: buildSystemPrompt(true), // voice mode
        stream: true,
        messages: messages.slice(-10)
      })
    });
  } catch (err) {
    return new Response('Upstream request failed', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Upstream error ' + upstream.status, { status: 502 });
  }

  // Anthropic SSE -> plain UTF-8 text stream of just the reply text.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            let evt;
            try { evt = JSON.parse(data); } catch { continue; }
            if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta' && evt.delta.text) {
              controller.enqueue(encoder.encode(evt.delta.text));
            } else if (evt.type === 'error') {
              controller.enqueue(encoder.encode(''));
            }
          }
        }
      } catch (err) {
        // Close cleanly with whatever was already sent — client falls back if
        // it ends up with nothing.
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no'
    }
  });
};
