exports.handler = async (event) => {
  const apiKey = process.env.ANAM_API_KEY;
  const personaId = process.env.ANAM_PERSONA_ID;

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
    // Stateful session token — references the Nicole persona already built
    // and configured in the Anam Lab dashboard, by ID. Persona settings
    // (voice, knowledge, personality) are managed there, not here.
    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personaConfig: { personaId: personaId }
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    if (!response.ok || data.error) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Anam ${response.status}: ${JSON.stringify(data)}` })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ sessionToken: data.sessionToken })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Exception: ${err.message}` })
    };
  }
};
