exports.handler = async (event) => {
  const apiKey = process.env.TAVUS_API_KEY;
  const personaId = process.env.TAVUS_PERSONA_ID;

  // GET request - diagnostic mode
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        api_key_set: !!apiKey,
        api_key_prefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET',
        persona_id: personaId || 'NOT SET'
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!apiKey || !personaId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Missing: API key ${apiKey ? 'OK' : 'MISSING'}, Persona ${personaId ? 'OK' : 'MISSING'}` })
    };
  }

  try {
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        persona_id: personaId,
        conversation_name: 'Novex Growth Website',
        custom_greeting: "Hi! I'm the Novex Growth AI. Ask me anything about our services.",
        max_call_duration: 600
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (!response.ok || data.error) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Tavus ${response.status}: ${JSON.stringify(data)}` })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        conversation_url: data.conversation_url,
        conversation_id: data.conversation_id
      })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Exception: ${err.message}` })
    };
  }
};
