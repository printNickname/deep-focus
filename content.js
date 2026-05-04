(function() {
  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function checkAndBlock() {
    chrome.storage.local.get(['fbState'], function(res) {
      if (!res.fbState || !res.fbState.active) return;
      const sites = res.fbState.blockedSites || [];
      if (sites.length === 0) return;

      const hostname = window.location.hostname.replace(/^www\./, '');
      const isBlocked = sites.some(function(site) {
        const clean = site.replace(/^www\./, '');
        return hostname === clean || hostname.endsWith('.' + clean);
      });

      if (isBlocked) {
        document.documentElement.style.visibility = 'hidden';

        // Increment attempt counter then redirect
        const today = todayKey();
        chrome.storage.local.get(['kairosAttempts'], function(r) {
          const attempts = r.kairosAttempts || {};
          attempts[today] = (attempts[today] || 0) + 1;
          chrome.storage.local.set({ kairosAttempts: attempts }, function() {
            window.location.replace(
              chrome.runtime.getURL('blocked.html') +
              '?site=' + encodeURIComponent(hostname)
            );
          });
        });
      }
    });
  }

  checkAndBlock();

  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.fbState) checkAndBlock();
  });
})();
