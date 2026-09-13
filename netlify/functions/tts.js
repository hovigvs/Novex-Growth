// Text-to-speech proxy for Nicole's voice mode.
// Keeps the ElevenLabs key server-side, same pattern as chat.js keeps ANTHROPIC_API_KEY server-side.
//
// One voice, every language: a single voice ID keeps Nicole's identity
// (including gender) consistent across languages, so she doesn't need — and
// shouldn't use — a different voice ID per language. That was the old catering-demo
// pattern and it risked mixing male and female voices across languages.
// Voice: Emma — confirmed female, multilingual, chosen from ElevenLabs' voice library.
//
// Model: eleven_multilingual_v2 — chosen for voice naturalness over latency.
// eleven_turbo_v2_5 was tried for a while (cuts ~1.5-3s per reply) but reads
// noticeably more robotic; traded back to multilingual_v2 since a natural-
// sounding voice matters more here than shaving those seconds. If speed
// becomes the priority again, turbo is the trade-back; eleven_flash_v2_5 is
// faster still but sacrifices even more naturalness.
// output_format: left at ElevenLabs' default bitrate (full quality) rather
// than the reduced mp3_44100_64 — same reasoning, naturalness over payload size.
const NICOLE_VOICE_ID = 'BVsq7dMRQW9XpXw9o5Rq';

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
          use_speaker_boost: true,
          speed: 1.1 // slight bump — default (1.0) read a touch slow
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
