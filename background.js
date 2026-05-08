// ── Tab blocking ──────────────────────────────────────────────────────────────
function blockOpenTabs(sites) {
  if (!sites || sites.length === 0) return;
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (!tab.url) return;
      try {
        const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
        const isBlocked = sites.some(site => {
          const clean = site.replace(/^www\./, '');
          return hostname === clean || hostname.endsWith('.' + clean);
        });
        if (isBlocked) {
          const blockedUrl = chrome.runtime.getURL('blocked.html') +
            '?site=' + encodeURIComponent(hostname);
          chrome.tabs.update(tab.id, { url: blockedUrl });
        }
      } catch(e) {}
    });
  });
}

// ── Timer expiry (alarm fires even when popup is closed) ──────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'kairos-timer') return;
  chrome.storage.local.get(['fbState'], res => {
    const s = res.fbState || {};
    if (!s.timerRunning) return;
    chrome.storage.local.set({
      fbState: {
        ...s,
        timerRunning: false,
        active: false,
        timeLeft: 0,
        endTime: null,
      }
    }, () => {
      blockOpenTabs([]); // unblock all
    });
  });
});

// ── Messages from popup ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BLOCK_OPEN_TABS') {
    blockOpenTabs(msg.sites);
  }
  if (msg.type === 'TIMER_START') {
    // Set alarm for when timer should expire
    chrome.alarms.clear('kairos-timer', () => {
      chrome.alarms.create('kairos-timer', {
        when: Date.now() + msg.timeLeft * 1000
      });
    });
  }
  if (msg.type === 'TIMER_CLEAR') {
    chrome.alarms.clear('kairos-timer');
  }
});

// ── On browser startup: restore blocking state ────────────────────────────────
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['fbState'], res => {
    const s = res.fbState;
    if (!s) return;

    if (s.timerRunning && s.endTime) {
      const remaining = s.endTime - Date.now();
      if (remaining <= 0) {
        // Timer already expired while browser was closed
        chrome.storage.local.set({
          fbState: { ...s, timerRunning: false, active: false, timeLeft: 0, endTime: null }
        });
      } else {
        // Re-arm the alarm
        chrome.alarms.create('kairos-timer', { when: s.endTime });
        if (s.active && s.blockedSites) blockOpenTabs(s.blockedSites);
      }
    } else if (s.active && s.blockedSites) {
      blockOpenTabs(s.blockedSites);
    }
  });
});
