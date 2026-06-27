exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.TAVUS_API_KEY;
  const personaId = process.env.TAVUS_PERSONA_ID;

  if (!apiKey || !personaId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Tavus credentials not configured' })
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
        conversation_name: 'Novex Growth Website Conversation',
        custom_greeting: "Hi! I'm the Novex Growth AI. I can tell you about our AI digital humans, growth systems, and how we help service businesses like yours. What would you like to know?",
        max_call_duration: 600 // 10 minutes max
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Tavus API error');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        conversation_url: data.conversation_url,
        conversation_id: data.conversation_id
      })
    };

  } catch (err) {
    console.error('Tavus error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
