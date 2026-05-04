let state = {
  active: false,
  blockedSites: [],
  duration: 25,
  timeLeft: 25 * 60,
  timerRunning: false,
};
let tickTimeout = null;

// ── Toggle cooldown (fires only when turning OFF) ─────────────────────────────
let toggleLocked = false;
let cooldownInterval = null;

function startOffCooldown(onComplete) {
  const lbl = document.getElementById('tlbl');
  const tog = document.getElementById('tog');
  toggleLocked = true;
  tog.classList.add('locked');
  let remaining = 10;
  lbl.textContent = remaining + 's';

  cooldownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      toggleLocked = false;
      tog.classList.remove('locked');
      onComplete();
    } else {
      lbl.textContent = remaining + 's';
    }
  }, 1000);
}

// ── Core ─────────────────────────────────────────────────────────────────────
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
    void chrome.runtime.lastError;
  });
}

function updateUI() {
  const tnum = document.getElementById('tnum');
  tnum.textContent = fmt(state.timeLeft);
  tnum.classList.toggle('running', state.timerRunning);

  const tog = document.getElementById('tog');
  tog.classList.toggle('on', state.active);

  if (!toggleLocked) {
    document.getElementById('tlbl').textContent = state.active ? 'active' : 'idle';
  }
}

function renderSites() {
  const list = document.getElementById('slist');
  const cnt  = document.getElementById('scnt');
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
    btn.onclick = () => { state.blockedSites.splice(+btn.dataset.i, 1); renderSites(); save(); };
  });
}

// ── Site management ───────────────────────────────────────────────────────────
function addSite() {
  const inp = document.getElementById('sinp');
  let v = inp.value.trim().toLowerCase()
    .replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
  if (!v) return;
  if (!state.blockedSites.includes(v)) { state.blockedSites.push(v); renderSites(); save(); }
  inp.value = '';
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.active = true;
  document.getElementById('startbtn').textContent = 'Pause';
  document.getElementById('startbtn').className = 'btn';
  document.getElementById('resetbtn').style.display = '';
  save(); notifyBg(); updateUI();

  function tick() {
    if (!state.timerRunning) return;
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0; state.timerRunning = false; state.active = false;
      document.getElementById('startbtn').textContent = 'Begin again';
      document.getElementById('startbtn').className = 'btn primary';
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
  save(); updateUI();
}

function resetTimer() {
  state.timerRunning = false; state.active = false;
  clearTimeout(tickTimeout);
  state.timeLeft = state.duration * 60;
  document.getElementById('startbtn').textContent = 'Begin';
  document.getElementById('startbtn').className = 'btn primary';
  document.getElementById('resetbtn').style.display = 'none';
  save(); notifyBg(); updateUI();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['fbState'], res => {
    if (res.fbState) Object.assign(state, res.fbState);
    updateUI();
    renderSites();

    if (state.timerRunning) {
      document.getElementById('startbtn').textContent = 'Pause';
      document.getElementById('startbtn').className = 'btn';
      document.getElementById('resetbtn').style.display = '';
      function tick() {
        if (!state.timerRunning) return;
        state.timeLeft--;
        if (state.timeLeft <= 0) {
          state.timeLeft = 0; state.timerRunning = false; state.active = false;
          document.getElementById('startbtn').textContent = 'Begin again';
          document.getElementById('startbtn').className = 'btn primary';
          save(); notifyBg(); updateUI(); return;
        }
        updateUI(); save();
        tickTimeout = setTimeout(tick, 1000);
      }
      tickTimeout = setTimeout(tick, 1000);
    }
  });

  document.getElementById('tog').onclick = () => {
    if (toggleLocked) return;
    if (state.timerRunning) { pauseTimer(); return; }
    if (state.active) {
      startOffCooldown(() => {
        state.active = false;
        save(); notifyBg(); updateUI();
      });
    } else {
      state.active = true;
      save(); notifyBg(); updateUI();
    }
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
