document.addEventListener('DOMContentLoaded', () => {

  // ---- Nav dot-grid dropdown ----
  const navMenu = document.getElementById('navMenu');
  const navDropdown = document.getElementById('navDropdown');
  if (navMenu && navDropdown) {
    navMenu.addEventListener('click', e => { e.stopPropagation(); navDropdown.classList.toggle('open'); });
    document.addEventListener('click', () => navDropdown?.classList.remove('open'));
  }

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q')?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.faq-a').style.maxHeight = item.querySelector('.faq-a').scrollHeight + 'px';
      }
    });
  });

  // ---- Carousel ----
  const track = document.getElementById('carouselTrack');
  const slides = track ? track.querySelectorAll('.carousel-slide') : [];
  const dots = document.querySelectorAll('.carousel-dot');
  let current = 0, autoTimer;

  function goTo(n) {
    current = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }
  function resetAuto() { clearInterval(autoTimer); autoTimer = setInterval(() => goTo(current + 1), 4500); }

  if (track && slides.length) {
    document.querySelector('.carousel-prev')?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    document.querySelector('.carousel-next')?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); resetAuto(); }));
    let sx = 0;
    track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { goTo(current + (dx < 0 ? 1 : -1)); resetAuto(); } });
    goTo(0); resetAuto();
  }

  // ---- Chat demo (scripted autoplay) ----
  const demos = {
    catering: {
      botName: "Bella's Catering Co.",
      steps: [
        { from: 'user', text: 'Hi, do you cater events for 80 people?' },
        { from: 'bot',  text: 'Yes we do! What type of event is it, and what date are you thinking?' },
        { from: 'user', text: 'Wedding, September 14th' },
        { from: 'bot',  text: 'A wedding for 80 guests on Sept 14th — lovely! Any dietary restrictions we should plan around?' },
        { from: 'user', text: 'A few vegetarian guests' },
        { from: 'bot',  text: "Perfect, we'll include a full vegetarian spread. Want me to text you our event menu and a quote right now?" },
        { from: 'user', text: 'Yes please!' },
        { from: 'bot',  text: "Sent! You'll also get a reminder 48 hours before. Is there anything else I can help with?" }
      ]
    },
    venue: {
      botName: 'Maple Hall Venue',
      steps: [
        { from: 'user', text: 'Is the venue available for 100 guests in October?' },
        { from: 'bot',  text: 'Let me check availability. What kind of event are you planning?' },
        { from: 'user', text: 'A wedding reception' },
        { from: 'bot',  text: "We have Oct 18th and Oct 25th open for a 100-guest wedding reception. Would you like to book a tour first?" },
        { from: 'user', text: "Yes, let's book a tour" },
        { from: 'bot',  text: "I've got a few tour slots this week. I'll text you a link to pick a time that works." },
        { from: 'user', text: 'Perfect, thank you' },
        { from: 'bot',  text: "You're all set! We'll follow up with full pricing and our event packages shortly." }
      ]
    }
  };

  let currentDemo = 'catering', demoTimeout;

  function switchDemo(name) {
    currentDemo = name;
    clearTimeout(demoTimeout);
    document.querySelectorAll('.demo-tab').forEach(t => t.classList.toggle('active', t.dataset.demo === name));
    const nameEl = document.getElementById('demo-bot-name');
    if (nameEl) nameEl.textContent = demos[name].botName;
    const log = document.getElementById('demo-log');
    if (log) { log.innerHTML = ''; playDemo(name, 0); }
  }

  function playDemo(name, idx) {
    if (name !== currentDemo) return;
    const steps = demos[name].steps;
    if (idx >= steps.length) {
      demoTimeout = setTimeout(() => {
        const log = document.getElementById('demo-log');
        if (log) log.innerHTML = '';
        playDemo(name, 0);
      }, 2800);
      return;
    }
    const step = steps[idx];
    const log = document.getElementById('demo-log');
    if (!log) return;
    const b = document.createElement('div');
    b.className = `bubble ${step.from}`;
    b.textContent = step.text;
    log.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('visible')));
    log.scrollTop = log.scrollHeight;
    demoTimeout = setTimeout(() => playDemo(name, idx + 1), step.from === 'bot' ? 1700 : 1200);
  }

  document.querySelectorAll('.demo-tab').forEach(tab => tab.addEventListener('click', () => switchDemo(tab.dataset.demo)));
  if (document.getElementById('demo-log')) switchDemo('catering');

  // ---- Live AI Chat Widget (Nicole) ----
  const chatToggle = document.getElementById('chatToggle');
  const chatPanel = document.getElementById('chatPanel');
  const chatClose = document.getElementById('chatClose');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const chatMessages = document.getElementById('chatMessages');
  const panelAvatarVideo = document.getElementById('panelAvatarVideo');
  let nicoleHasEngaged = false;
  function pauseNicoleWave() {
    // Once the visitor actually starts talking or typing, Nicole stops
    // looping the greeting wave — she's listening/responding now, not
    // still saying hello.
    if (nicoleHasEngaged || !panelAvatarVideo) return;
    nicoleHasEngaged = true;
    panelAvatarVideo.pause();
  }
  const modeTextTab = document.getElementById('modeTextTab');
  const modeVoiceTab = document.getElementById('modeVoiceTab');
  const chatInputRow = document.getElementById('chatInputRow');
  const chatVoicePanel = document.getElementById('chatVoicePanel');
  let chatHistory = [], chatGreeted = false, voiceModeActive = false;

  function openChat() {
    chatPanel?.classList.add('open');
    chatToggle?.classList.add('hidden');
    if (!chatGreeted) {
      chatGreeted = true;
      setTimeout(() => addChatBubble('bot', "Hi! I'm Nicole from Novex Growth 👋 I can answer questions about our AI systems, services, or help you book a strategy call. What can I help you with?"), 350);
    }
  }

  function closeChat() {
    chatPanel?.classList.remove('open');
    chatToggle?.classList.remove('hidden');
  }

  chatToggle?.addEventListener('click', () => chatPanel?.classList.contains('open') ? closeChat() : openChat());
  chatClose?.addEventListener('click', closeChat);

  modeTextTab?.addEventListener('click', () => {
    modeTextTab.classList.add('active');
    modeVoiceTab.classList.remove('active');
    chatMessages?.classList.remove('hidden-mode');
    chatInputRow?.classList.remove('hidden-mode');
    chatVoicePanel?.classList.remove('active');
    voiceModeActive = false;
    stopListening();
    nicoleStopSpeaking();
  });
  modeVoiceTab?.addEventListener('click', () => {
    modeVoiceTab.classList.add('active');
    modeTextTab.classList.remove('active');
    chatMessages?.classList.add('hidden-mode');
    chatInputRow?.classList.add('hidden-mode');
    chatVoicePanel?.classList.add('active');
    voiceModeActive = true;
  });

  function addChatBubble(role, text) {
    if (!chatMessages) return;
    const b = document.createElement('div');
    b.className = `chat-bubble ${role}`;
    b.textContent = text;
    chatMessages.appendChild(b);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addTyping() {
    if (!chatMessages) return null;
    const b = document.createElement('div');
    b.className = 'chat-bubble bot typing';
    b.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(b);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return b;
  }

  async function sendMessage() {
    const text = chatInput?.value?.trim();
    if (!text) return;
    pauseNicoleWave();
    chatInput.value = '';
    addChatBubble('user', text);
    chatHistory.push({ role: 'user', content: text });
    const typing = addTyping();
    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await res.json();
      const reply = data.reply || "I'd be happy to help — please email us at info@novexgrowth.com and we'll get back to you shortly.";
      typing?.remove();
      addChatBubble('bot', reply);
      chatHistory.push({ role: 'assistant', content: reply });
      if (voiceModeActive) nicoleSpeak(reply);
    } catch {
      typing?.remove();
      const fallbackMsg = "I'm having a small hiccup — please email info@novexgrowth.com or book a call from our Contact page!";
      addChatBubble('bot', fallbackMsg);
      if (voiceModeActive) nicoleSpeak(fallbackMsg);
    }
  }

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  // ---- Voice: speech recognition (STT) + Nicole's voice (TTS) ----
  const micBtn = document.getElementById('micBtn');
  const micLangSelect = document.getElementById('micLangSelect');
  const voiceStatusText = document.getElementById('voiceStatusText');
  const voiceMuteBtn = document.getElementById('voiceMuteBtn');
  let voiceMuted = false, isListening = false, micStream = null, silenceTimer = null;

  // Fills the gap between "she stopped listening" and "her reply starts
  // playing" — without this, that pause (API calls in flight) looks like
  // the mic just silently failed.
  function showNicoleThinking() {
    if (voiceStatusText) voiceStatusText.innerHTML = 'Nicole is thinking<span class="thinking-dots"><span></span><span></span><span></span></span>';
    micBtn?.classList.add('thinking');
  }
  function clearNicoleThinking() {
    micBtn?.classList.remove('thinking');
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRec && !/Firefox/i.test(navigator.userAgent)) {
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (chatInput) chatInput.value = final || interim;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (final) {
        silenceTimer = setTimeout(() => { stopListening(); showNicoleThinking(); sendMessage(); }, 1500);
      } else if (interim) {
        silenceTimer = setTimeout(() => {
          if (chatInput?.value.trim()) { stopListening(); showNicoleThinking(); sendMessage(); }
        }, 2500);
      }
    };
    recognition.onerror = () => stopListening();
    recognition.onend = () => {
      const hasText = chatInput && chatInput.value.trim().length > 0;
      if (isListening && !hasText) { try { recognition.start(); } catch { stopListening(); } }
      else stopListening();
    };
  }

  function startListening() {
    if (!recognition) {
      if (voiceStatusText) voiceStatusText.textContent = /Firefox/i.test(navigator.userAgent)
        ? "Voice input isn't supported in Firefox — try Chrome, Safari, or Edge."
        : "Voice input isn't supported in this browser.";
      return;
    }
    nicoleStopSpeaking();
    pauseNicoleWave();
    recognition.lang = micLangSelect ? micLangSelect.value : 'en-US';
    function doStart() {
      try {
        recognition.start();
        isListening = true;
        micBtn?.classList.add('listening');
        if (voiceStatusText) voiceStatusText.textContent = 'Listening… speak now';
      } catch (e) { console.warn('mic:', e); }
    }
    if (micStream) { doStart(); return; }
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { micStream = s; doStart(); })
        .catch(() => { if (voiceStatusText) voiceStatusText.textContent = 'Microphone access denied — check your browser settings.'; });
    } else { doStart(); }
  }

  function stopListening() {
    isListening = false;
    try { recognition?.stop(); } catch {}
    micBtn?.classList.remove('listening');
    if (voiceStatusText) voiceStatusText.textContent = 'Tap the mic and start talking';
  }

  micBtn?.addEventListener('click', () => isListening ? stopListening() : startListening());

  let currentAudio = null;
  function nicoleStopSpeaking() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (voiceStatusText && voiceModeActive) voiceStatusText.textContent = 'Tap the mic and start talking';
  }

  function browserSpeak(text) {
    if (!window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = micLangSelect ? micLangSelect.value : 'en-US';
    utt.rate = 0.95;
    // Prefer a female system voice for this language, since Nicole is a female
    // persona — same reasoning as the ElevenLabs voice choice, applied to the
    // no-key fallback path so the two stay consistent.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const lc = utt.lang.split('-')[0];
      const pick = voices.find(v => v.lang.toLowerCase().startsWith(lc) && /female|woman|samantha|karen|moira|zira/i.test(v.name))
        || voices.find(v => v.lang.toLowerCase().startsWith(lc));
      if (pick) utt.voice = pick;
    }
    utt.onstart = () => { clearNicoleThinking(); if (voiceStatusText) voiceStatusText.textContent = 'Nicole is speaking…'; };
    utt.onend = () => { if (voiceStatusText) voiceStatusText.textContent = 'Tap the mic and start talking'; };
    window.speechSynthesis.speak(utt);
  }

  async function nicoleSpeak(text) {
    if (voiceMuted || !text) return;
    nicoleStopSpeaking();
    try {
      const res = await fetch('/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.onplay = () => { clearNicoleThinking(); if (voiceStatusText) voiceStatusText.textContent = 'Nicole is speaking…'; };
        currentAudio.onended = () => { URL.revokeObjectURL(url); if (voiceStatusText) voiceStatusText.textContent = 'Tap the mic and start talking'; };
        currentAudio.onerror = () => browserSpeak(text);
        currentAudio.play().catch(() => browserSpeak(text));
      } else {
        browserSpeak(text); // server signaled fallback (no ElevenLabs key configured yet)
      }
    } catch {
      browserSpeak(text);
    }
  }

  voiceMuteBtn?.addEventListener('click', () => {
    voiceMuted = !voiceMuted;
    if (voiceMuted) nicoleStopSpeaking();
    voiceMuteBtn.innerHTML = voiceMuted ? '<i class="ti ti-volume-3"></i>' : '<i class="ti ti-volume"></i>';
    voiceMuteBtn.title = voiceMuted ? "Unmute Nicole's voice" : "Mute Nicole's voice";
  });

  // ---- Contact form ----
  document.querySelector('.contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = "Sent! We'll be in touch soon."; btn.disabled = true; }
    setTimeout(() => { e.target.reset(); if (btn) { btn.textContent = 'Send message'; btn.disabled = false; } }, 3500);
  });


});