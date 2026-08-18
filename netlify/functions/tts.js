// Text-to-speech proxy for Nicole's voice mode.
// Keeps the ElevenLabs key server-side, same pattern as chat.js keeps ANTHROPIC_API_KEY server-side.
//
// One voice, every language: eleven_multilingual_v2 keeps a single voice's identity
// (including gender) consistent across ~29 languages, so Nicole doesn't need — and
// shouldn't use — a different voice ID per language. That was the old catering-demo
// pattern and it risked mixing male and female voices across languages. Confirm this
// ID is a female voice in your ElevenLabs library before going live — Rachel
// (21m00Tcm4TlvDq8ikWAM) is ElevenLabs' well-known default female voice, used here
// as the placeholder; swap in your own confirmed choice if you prefer a different one.
const NICOLE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // No key configured yet — tell the frontend to fall back to browser speech synthesis.
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fallback: true, reason: 'ELEVENLABS_API_KEY not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { text } = body;
  if (!text) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required' }) };
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${NICOLE_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: /[؀-ۿ]/.test(text) ? 0.6 : 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('ElevenLabs error ' + response.status);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'audio/mpeg' },
      body: base64Audio,
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('TTS function error:', err);
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fallback: true, reason: err.message }) };
  }
};
