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
  let chatHistory = [], chatGreeted = false;

  function openChat() {
    chatPanel?.classList.add('open');
    if (!chatGreeted) {
      chatGreeted = true;
      setTimeout(() => addChatBubble('bot', "Hi! I'm Nicole from Novex Growth 👋 I can answer questions about our AI systems, services, or help you book a strategy call. What can I help you with?"), 350);
    }
  }

  chatToggle?.addEventListener('click', () => chatPanel?.classList.contains('open') ? chatPanel.classList.remove('open') : openChat());
  chatClose?.addEventListener('click', () => chatPanel?.classList.remove('open'));

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
    } catch {
      typing?.remove();
      addChatBubble('bot', "I'm having a small hiccup — please email info@novexgrowth.com or book a call from our Contact page!");
    }
  }

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  // ---- Contact form ----
  document.querySelector('.contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = "Sent! We'll be in touch soon."; btn.disabled = true; }
    setTimeout(() => { e.target.reset(); if (btn) { btn.textContent = 'Send message'; btn.disabled = false; } }, 3500);
  });


});