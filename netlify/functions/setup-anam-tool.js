// One-time setup utility — creates the "capture_lead" webhook tool in Anam
// and attaches it to Nicole's persona (via a partial PUT, so nothing else
// on the persona — voice, avatar, prompt — is touched). Safe to call more
// than once for diagnostics (GET), but POST will create a duplicate tool
// if run twice — only run it once.
exports.handler = async (event) => {
  const apiKey = process.env.ANAM_API_KEY;
  const personaId = process.env.ANAM_PERSONA_ID;

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key_set: !!apiKey, persona_id: personaId || 'NOT SET' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!apiKey || !personaId) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: `Missing: API key ${apiKey ? 'OK' : 'MISSING'}, Persona ${personaId ? 'OK' : 'MISSING'}` })
    };
  }

  try {
    // Step 1: create the tool
    const toolRes = await fetch('https://api.anam.ai/v1/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        type: 'server',
        subtype: 'webhook',
        name: 'capture_lead',
        description: "Call this when a customer wants someone from the Novex Growth team to call or text them back, or wants to leave their contact info for a follow-up. Ask for their name and a phone number or email first if you don't have both. Never claim you will personally call, text, or email them yourself — only that you'll pass it along to the team.",
        config: {
          url: 'https://novexgrowth.com/.netlify/functions/anam-lead',
          method: 'POST',
          awaitResponse: true
        },
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: "The customer's name" },
            contact: { type: 'string', description: 'Phone number or email to reach them' },
            request: { type: 'string', description: 'One-line summary of what they need' }
          },
          required: ['name', 'contact']
        }
      })
    });

    const toolText = await toolRes.text();
    let toolData;
    try { toolData = JSON.parse(toolText); } catch (e) { toolData = { raw: toolText }; }

    if (!toolRes.ok) {
      return { statusCode: 200, body: JSON.stringify({ step: 'create_tool', error: `Anam ${toolRes.status}: ${JSON.stringify(toolData)}` }) };
    }

    const toolId = toolData.id || toolData.toolId || toolData._id || (toolData.tool && toolData.tool.id);
    if (!toolId) {
      return { statusCode: 200, body: JSON.stringify({ step: 'create_tool', error: 'Tool created but no ID found in response — inspect raw', raw: toolData }) };
    }

    // Step 2: attach tool to persona (partial update — only toolIds changes)
    const attachRes = await fetch(`https://api.anam.ai/v1/personas/${personaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ toolIds: [toolId] })
    });

    const attachText = await attachRes.text();
    let attachData;
    try { attachData = JSON.parse(attachText); } catch (e) { attachData = { raw: attachText }; }

    if (!attachRes.ok) {
      return { statusCode: 200, body: JSON.stringify({ step: 'attach_tool', toolId, error: `Anam ${attachRes.status}: ${JSON.stringify(attachData)}` }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, toolId, message: 'capture_lead tool created and attached to Nicole persona.' })
    };

  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ error: `Exception: ${err.message}` }) };
  }
};
