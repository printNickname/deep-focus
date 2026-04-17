// Background: closes/redirects already-open tabs when focus mode activates

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BLOCK_OPEN_TABS') {
    blockOpenTabs(msg.sites);
  }
});

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

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['fbState'], res => {
    if (res.fbState && res.fbState.active && res.fbState.blockedSites) {
      blockOpenTabs(res.fbState.blockedSites);
    }
  });
});
