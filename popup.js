const MESSAGES = {
  idle: [
    "Set a duration. Disappear. Return with something built.",
    "Every session is a small bet on your future self.",
    "The best time to start was yesterday. Now is fine.",
    "No notifications. No tabs. Just one thing.",
  ],
  running: [
    "In session. The internet will survive without you.",
    "Stay. This is where the real work happens.",
    "Resistance peaks at minute three. You're past it.",
    "The window is open. Fill it.",
  ],
  done: [
    "Session complete. That's what discipline looks like.",
    "You finished. Compound interest starts now.",
    "Done. Rest, then do it again.",
    "Good. Now you know you can.",
  ],
  taglines: [
    "Attention is the only currency that matters.",
    "The work is the point. Begin.",
    "Distraction is a choice. So is focus.",
    "Deep work is rare. That's why it's valuable.",
  ]
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let state = {
  active: false,
  blockedSites: [],
  duration: 25,
  timeLeft: 25 * 60,
  timerRunning: false,
};
let tickTimeout = null;

function fmt(sec) {
  return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0');
}

function save() {
  chrome.storage.local.set({ fbState: {
    active: state.active,
    blockedSites: state.blockedSites,
    duration: state.duration,
    timeLeft: state.timeLeft,
    timerRunning: state.timerRunning,
  }});
}

function notifyBg() {
  chrome.runtime.sendMessage({ type: "BLOCK_OPEN_TABS", sites: state.blockedSites }, () => {
    void chrome.runtime.lastError; // suppress "receiving end does not exist" in MV3
  });
}

function updateUI() {
  const tnum = document.getElementById('tnum');
  tnum.textContent = fmt(state.timeLeft);
  tnum.classList.toggle('running', state.timerRunning);

  const tog = document.getElementById('tog');
  tog.classList.toggle('on', state.active);
  document.getElementById('tlbl').textContent = state.active ? 'active' : 'idle';

  const sdot = document.getElementById('sdot');
  sdot.classList.toggle('on', state.active);

  const smsg = document.getElementById('smsg');
  if (state.active && state.timerRunning) {
    smsg.textContent = `${fmt(state.timeLeft)} remaining. Stay in it.`;
    smsg.className = 'status-msg on';
  } else if (state.active) {
    smsg.textContent = `Blocking ${state.blockedSites.length} site${state.blockedSites.length === 1 ? '' : 's'}. Toggle to disable.`;
    smsg.className = 'status-msg on';
  } else {
    smsg.textContent = "Idle. Nothing is blocked. Nothing is protected.";
    smsg.className = 'status-msg';
  }
}

function renderSites() {
  const list = document.getElementById('slist');
  const cnt = document.getElementById('scnt');
  cnt.textContent = state.blockedSites.length + (state.blockedSites.length === 1 ? ' site' : ' sites');

  if (state.blockedSites.length === 0) {
    list.innerHTML = '<div class="empty-msg">No sites added.<br>Use presets or add manually.</div>';
    return;
  }
  list.innerHTML = '';
  state.blockedSites.forEach((site, i) => {
    const el = document.createElement('div');
    el.className = 'site-item';
    el.innerHTML = `<span>${site}</span><button class="site-x" data-i="${i}">×</button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.site-x').forEach(btn => {
    btn.onclick = () => {
      state.blockedSites.splice(+btn.dataset.i, 1);
      renderSites(); save();
    };
  });
}

function addSite() {
  const inp = document.getElementById('sinp');
  let v = inp.value.trim().toLowerCase()
    .replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
  if (!v) return;
  if (!state.blockedSites.includes(v)) {
    state.blockedSites.push(v);
    renderSites(); save();
  }
  inp.value = '';
}

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.active = true;
  document.getElementById('startbtn').textContent = 'Pause';
  document.getElementById('startbtn').className = 'btn';
  document.getElementById('resetbtn').style.display = '';
  document.getElementById('tmsg').textContent = pick(MESSAGES.running);
  save(); notifyBg(); updateUI();

  function tick() {
    if (!state.timerRunning) return;
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.timerRunning = false;
      state.active = false;
      document.getElementById('startbtn').textContent = 'Begin again';
      document.getElementById('startbtn').className = 'btn primary';
      document.getElementById('tmsg').textContent = pick(MESSAGES.done);
      save(); notifyBg(); updateUI(); return;
    }
    updateUI(); save();
    tickTimeout = setTimeout(tick, 1000);
  }
  tickTimeout = setTimeout(tick, 1000);
}

function pauseTimer() {
  state.timerRunning = false;
  clearTimeout(tickTimeout);
  document.getElementById('startbtn').textContent = 'Resume';
  document.getElementById('startbtn').className = 'btn primary';
  document.getElementById('tmsg').textContent = "Paused. The work is still waiting.";
  save(); updateUI();
}

function resetTimer() {
  state.timerRunning = false;
  state.active = false;
  clearTimeout(tickTimeout);
  state.timeLeft = state.duration * 60;
  document.getElementById('startbtn').textContent = 'Begin';
  document.getElementById('startbtn').className = 'btn primary';
  document.getElementById('resetbtn').style.display = 'none';
  document.getElementById('tmsg').textContent = pick(MESSAGES.idle);
  save(); notifyBg(); updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('htagline').textContent = pick(MESSAGES.taglines);

  chrome.storage.local.get(['fbState'], res => {
    if (res.fbState) Object.assign(state, res.fbState);
    updateUI();
    renderSites();

    if (state.timerRunning) {
      document.getElementById('startbtn').textContent = 'Pause';
      document.getElementById('startbtn').className = 'btn';
      document.getElementById('resetbtn').style.display = '';
      document.getElementById('tmsg').textContent = pick(MESSAGES.running);
      function tick() {
        if (!state.timerRunning) return;
        state.timeLeft--;
        if (state.timeLeft <= 0) {
          state.timeLeft = 0; state.timerRunning = false; state.active = false;
          document.getElementById('startbtn').textContent = 'Begin again';
          document.getElementById('startbtn').className = 'btn primary';
          document.getElementById('tmsg').textContent = pick(MESSAGES.done);
          save(); notifyBg(); updateUI(); return;
        }
        updateUI(); save();
        tickTimeout = setTimeout(tick, 1000);
      }
      tickTimeout = setTimeout(tick, 1000);
    } else {
      document.getElementById('tmsg').textContent = pick(MESSAGES.idle);
    }
  });

  document.getElementById('tog').onclick = () => {
    if (state.timerRunning) { pauseTimer(); return; }
    state.active = !state.active;
    save(); notifyBg(); updateUI();
  };

  document.getElementById('startbtn').onclick = () => {
    if (state.timerRunning) { pauseTimer(); }
    else {
      if (state.timeLeft === 0) state.timeLeft = state.duration * 60;
      startTimer();
    }
  };
  document.getElementById('resetbtn').onclick = resetTimer;
  document.getElementById('addbtn').onclick = addSite;
  document.getElementById('sinp').onkeydown = e => { if (e.key === 'Enter') addSite(); };

  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.onclick = () => {
      if (state.timerRunning) return;
      state.duration = +btn.dataset.min;
      state.timeLeft = state.duration * 60;
      document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      updateUI(); save();
    };
    if (+btn.dataset.min === state.duration) {
      document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    }
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      const sites = btn.dataset.sites.split(',');
      let added = 0;
      sites.forEach(s => { if (!state.blockedSites.includes(s)) { state.blockedSites.push(s); added++; } });
      if (added > 0) { renderSites(); save(); }
      btn.classList.add('added');
      setTimeout(() => btn.classList.remove('added'), 1500);
    };
  });
});
