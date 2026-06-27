exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.TAVUS_API_KEY;
  const personaId = process.env.TAVUS_PERSONA_ID;

  if (!apiKey || !personaId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Missing credentials. API key: ${apiKey ? 'set' : 'MISSING'}, Persona ID: ${personaId ? 'set' : 'MISSING'}` })
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
        custom_greeting: "Hi! I'm the Novex Growth AI. Ask me anything about our services or how an AI digital human could work for your business.",
        max_call_duration: 600
      })
    });

    const data = await response.json();
    console.log('Tavus response status:', response.status);
    console.log('Tavus response:', JSON.stringify(data));

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Tavus API error ${response.status}: ${JSON.stringify(data)}` })
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
