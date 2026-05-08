let state = {
  active: false,
  blockedSites: [],
  duration: 25,
  timeLeft: 25 * 60,
  timerRunning: false,
  endTime: null,
};
let displayInterval = null;

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

// Current remaining seconds (reads from endTime if running, else stored timeLeft)
function getTimeLeft() {
  if (state.timerRunning && state.endTime) {
    return Math.max(0, (state.endTime - Date.now()) / 1000);
  }
  return state.timeLeft;
}

function save(extra) {
  chrome.storage.local.set({ fbState: { ...state, ...extra } });
}

function notifyBg(type, extra) {
  chrome.runtime.sendMessage({ type, ...extra }, () => { void chrome.runtime.lastError; });
}

function updateUI() {
  document.getElementById('tnum').textContent = fmt(getTimeLeft());
  document.getElementById('tnum').classList.toggle('running', state.timerRunning);
  document.getElementById('tog').classList.toggle('on', state.active);
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
  const locked = state.timerRunning;
  list.innerHTML = '';
  state.blockedSites.forEach((site, i) => {
    const el = document.createElement('div');
    el.className = 'site-item';
    el.innerHTML = `<span>${site}</span><button class="site-x" data-i="${i}" ${locked ? 'disabled' : ''}>×</button>`;
    list.appendChild(el);
  });
  if (!locked) {
    list.querySelectorAll('.site-x').forEach(btn => {
      btn.onclick = () => {
        state.blockedSites.splice(+btn.dataset.i, 1);
        renderSites(); save();
      };
    });
  }
}

function addSite() {
  const inp = document.getElementById('sinp');
  let v = inp.value.trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!v) return;
  if (!state.blockedSites.includes(v)) { state.blockedSites.push(v); renderSites(); save(); }
  inp.value = '';
}

// ── Timer control ─────────────────────────────────────────────────────────────
function startTimer() {
  if (state.timerRunning) return;
  const tl = state.timeLeft > 0 ? state.timeLeft : state.duration * 60;
  const endTime = Date.now() + tl * 1000;

  state.timerRunning = true;
  state.active = true;
  state.endTime = endTime;
  state.timeLeft = tl;

  document.getElementById('startbtn').textContent = 'Pause';
  document.getElementById('startbtn').className = 'btn';
  document.getElementById('resetbtn').style.display = '';

  save();
  notifyBg('BLOCK_OPEN_TABS', { sites: state.blockedSites });
  notifyBg('TIMER_START', { timeLeft: tl });

  startDisplayTick();
  updateUI();
  renderSites();
}

function pauseTimer() {
  state.timeLeft = Math.round(getTimeLeft());
  state.timerRunning = false;
  state.endTime = null;

  clearInterval(displayInterval);
  notifyBg('TIMER_CLEAR', {});

  document.getElementById('startbtn').textContent = 'Resume';
  document.getElementById('startbtn').className = 'btn primary';

  save();
  updateUI();
  renderSites();
}

function resetTimer() {
  clearInterval(displayInterval);
  notifyBg('TIMER_CLEAR', {});

  state.timerRunning = false;
  state.active = false;
  state.endTime = null;
  state.timeLeft = state.duration * 60;

  document.getElementById('startbtn').textContent = 'Begin';
  document.getElementById('startbtn').className = 'btn primary';
  document.getElementById('resetbtn').style.display = 'none';

  save();
  notifyBg('BLOCK_OPEN_TABS', { sites: [] });
  updateUI();
  renderSites();
}

function startDisplayTick() {
  clearInterval(displayInterval);
  displayInterval = setInterval(() => {
    const remaining = getTimeLeft();
    document.getElementById('tnum').textContent = fmt(remaining);
    if (remaining <= 0) {
      clearInterval(displayInterval);
      // Background alarm handles the actual state change; sync from storage
      chrome.storage.local.get(['fbState'], res => {
        if (res.fbState) Object.assign(state, res.fbState);
        document.getElementById('startbtn').textContent = 'Begin again';
        document.getElementById('startbtn').className = 'btn primary';
        document.getElementById('resetbtn').style.display = 'none';
        updateUI();
        renderSites();
      });
    }
  }, 500);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['fbState'], res => {
    if (res.fbState) Object.assign(state, res.fbState);

    // Recalculate timeLeft from endTime in case popup was closed
    if (state.timerRunning && state.endTime) {
      const remaining = (state.endTime - Date.now()) / 1000;
      if (remaining <= 0) {
        // Already expired
        state.timerRunning = false;
        state.active = false;
        state.timeLeft = 0;
        state.endTime = null;
        save();
      }
    }

    updateUI();
    renderSites();

    if (state.timerRunning) {
      document.getElementById('startbtn').textContent = 'Pause';
      document.getElementById('startbtn').className = 'btn';
      document.getElementById('resetbtn').style.display = '';
      startDisplayTick();
    } else if (state.timeLeft <= 0) {
      document.getElementById('startbtn').textContent = 'Begin again';
      document.getElementById('startbtn').className = 'btn primary';
    } else if (state.active) {
      // Paused but active
      document.getElementById('startbtn').textContent = 'Resume';
      document.getElementById('startbtn').className = 'btn primary';
      document.getElementById('resetbtn').style.display = '';
    } else {
      // Idle — wait for user to click Begin
    }
  });

  document.getElementById('tog').onclick = () => {
    if (toggleLocked) return;
    if (state.timerRunning) { pauseTimer(); return; }
    if (state.active) {
      startOffCooldown(() => {
        state.active = false;
        save();
        notifyBg('BLOCK_OPEN_TABS', { sites: [] });
        updateUI();
      });
    } else {
      state.active = true;
      save();
      notifyBg('BLOCK_OPEN_TABS', { sites: state.blockedSites });
      updateUI();
    }
  };

  document.getElementById('startbtn').onclick = () => {
    if (state.timerRunning) { pauseTimer(); }
    else {
      if (state.timeLeft <= 0) state.timeLeft = state.duration * 60;
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
      setTimeout(() => btn.classList.remove('added'), 400);
    };
  });
});
