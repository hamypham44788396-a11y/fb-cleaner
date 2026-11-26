'use strict';

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || !sender.url?.startsWith('https://www.facebook.com/')) return;
  const key = 'pending:' + sender.tab.id;
  if (message.type === 'queue-scan') {
    chrome.storage.session.set({ [key]: message.scan }).then(() => respond(true), () => respond(false));
    return true;
  }
  if (message.type === 'take-scan') {
    (async () => {
      const result = await chrome.storage.session.get(key);
      await chrome.storage.session.remove(key);
      return result[key] || null;
    })().then(respond, () => respond(null));
    return true;
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  void chrome.storage.session.remove('pending:' + tabId);
});
