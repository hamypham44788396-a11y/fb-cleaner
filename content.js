'use strict';

(() => {
  const category = { profile: 'POSTS', group: 'GROUPPOSTS' };
  const names = { profile: 'Trang cá nhân', group: 'Nhóm' };
  const path = location.pathname.replace(/\/$/, '');
  if (!/^\/[^/]+\/allactivity$/.test(path)) return;
  const storageKey = 'activity-monthly:' + path.toLowerCase();
  const panel = document.createElement('aside');
  panel.id = 'fb-monthly';
  panel.innerHTML = `
    <details open>
      <summary>Thống kê bài đăng</summary>
      <form>
        <label>Từ ngày <input name="from" type="date" required></label>
        <label>Đến ngày <input name="to" type="date" required></label>
        <div class="actions">
          <button type="submit" value="profile">Quét trang cá nhân</button>
          <button type="submit" value="group">Quét nhóm</button>
          <button type="button" id="fma-stop" disabled>Dừng</button>
        </div>
      </form>
      <p role="status" aria-live="polite"></p>
      <p id="fma-coverage"></p>
      <div class="results">
        <table>
          <thead><tr><th>Tháng</th><th>Cá nhân</th><th>Nhóm</th><th>Tổng</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <button type="button" id="fma-export" disabled>Xuất CSV</button>
    </details>`;
  document.body.append(panel);
  const form = panel.querySelector('form');
  const { from, to } = form.elements;
  const status = panel.querySelector('[role=status]');
  const coverage = panel.querySelector('#fma-coverage');
  const exportButton = panel.querySelector('#fma-export');
  const stopButton = panel.querySelector('#fma-stop');
  const today = new Date();
  to.value = ActivityReport.localDay(today);
  from.value = to.value.slice(0, 8) + '01';
  from.min = to.min = '2004-01-01';
  from.max = to.max = to.value;
  let report = {};
  let running = false;
  let stopped = false;
  let rows = [];

  function render() {
    const match = report.from === from.value && report.to === to.value;
    const profile = match && report.profile;
    const group = match && report.group;
    coverage.textContent = Object.keys(names).map(kind => {
      const result = kind === 'profile' ? profile : group;
      if (!result) return names[kind] + ' chưa quét';
      return names[kind] + ' đã quét' + (result.skipped ? ' (' + result.skipped + ' mục thiếu ngày)' : '');
    }).join(' · ');
    rows = profile || group
      ? ActivityReport.summarize(report.from, report.to, profile?.counts || {}, group?.counts || {})
      : [];
    const body = panel.querySelector('tbody');
    body.replaceChildren(...rows.map(row => {
      const tr = document.createElement('tr');
      row.forEach((value, index) => {
        const td = tr.insertCell();
        const available = index === 0 || (index === 1 && profile) || (index === 2 && group)
          || (index === 3 && profile && group);
        td.textContent = available ? value : '—';
      });
      return tr;
    }));
    exportButton.disabled = running || !profile || !group;
  }

  const optionLabel = /^(?:more(?: options| actions)?|options|actions|tùy chọn|tuỳ chọn|thêm(?: tùy chọn)?|xem thêm tùy chọn|hành động)(?=[:\s]|$)/iu;
  const otherActivity = /\b(?:commented|reacted|liked|was tagged|was mentioned|joined|pending)\b|đã (?:bình luận|bày tỏ cảm xúc|thích|tham gia)|được (?:gắn thẻ|nhắc đến)|đang chờ duyệt/iu;
  const otherDestination = /\b(?:someone else|on .+?['’]s (?:timeline|profile))\b|(?:trên|lên) (?:dòng thời gian|trang cá nhân) của (?!bạn\b)/iu;
  const groupDestination = /(?:posted|shared|wrote).{0,80}\bin (?:the group|a group)\b|(?:đăng|chia sẻ).{0,80}(?:trong|vào|lên) nhóm/iu;
  const emptyLog = /no activity to show|no activity|no posts|nothing to show|không có hoạt động|không có bài viết|chưa có bài viết/iu;
  const groupLink = /\/groups\/[^/]+(?:\/(?:posts|permalink)\/|\/?(?:[?#]|$))/i;

  function readEntries(kind) {
    const main = document.querySelector('main,[role="main"]');
    if (!main) return { entries: [], empty: false };
    const entries = new Set();
    const controls = [...main.querySelectorAll('[aria-haspopup="menu"],button[aria-label],[role="button"][aria-label]')]
      .filter(button => optionLabel.test(button.getAttribute('aria-label') || ''));
    const controlSet = new Set(controls);
    for (const button of controls) {
      let item = button.closest('article,[role="article"],li,[role="listitem"],[role="row"]');
      if (!item || !main.contains(item)) {
        for (item = button.parentElement; item && item !== main; item = item.parentElement) {
          if ([...item.querySelectorAll('[aria-haspopup="menu"],button[aria-label],[role="button"][aria-label]')]
            .some(control => control !== button && controlSet.has(control))) {
            item = null;
            break;
          }
          if (item.innerText?.trim() && !optionLabel.test(item.innerText.trim())) break;
        }
      }
      if (item && item !== main && item.getClientRects().length) entries.add(item);
    }
    for (const article of main.querySelectorAll('article,[role="article"]')) {
      if (article.getClientRects().length && ![...entries].some(item => article.contains(item) || item.contains(article))) {
        entries.add(article);
      }
    }

    const headers = new Map();
    for (const element of main.querySelectorAll('h1,h2,h3,h4,[role="heading"],span,div')) {
      if (element.childElementCount) continue;
      const label = element.textContent.trim();
      const day = label.length <= 48 && ActivityReport.parseDay(label);
      if (day && element.getClientRects().length) headers.set(element, day);
    }
    const ordered = [...headers.keys(), ...entries].sort((a, b) =>
      a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    const result = [];
    let headingDay = null;
    for (const element of ordered) {
      if (headers.has(element)) {
        if (!element.closest('a,button') && ![...entries].some(entry => entry.contains(element))) {
          headingDay = headers.get(element);
        }
        continue;
      }
      const text = element.innerText.trim();
      const action = text.split('\n')[0];
      if (!text || otherActivity.test(action)) continue;
      const links = [...element.querySelectorAll('a[href]')].map(link => link.href);
      if (kind === 'profile' && (otherDestination.test(action)
        || groupDestination.test(action) || links.some(link => groupLink.test(link)))) continue;
      const time = element.querySelector('time[datetime],abbr[data-utime]');
      const unix = time?.getAttribute('data-utime');
      const day = (unix && /^\d{10}$/.test(unix) && ActivityReport.localDay(new Date(Number(unix) * 1000)))
        || (time && ActivityReport.parseDay(time.getAttribute('datetime') || ''))
        || [...headers].find(([node]) => element.contains(node))?.[1]
        || headingDay;
      const permalink = links.find(link => {
        const url = new URL(link);
        return /(?:\/posts\/|\/permalink\/)/i.test(url.pathname)
          || url.searchParams.has('story_fbid');
      });
      const id = permalink && (new URL(permalink).searchParams.get('story_fbid')
        || new URL(permalink).pathname.match(/\/(?:posts|permalink)\/([^/]+)/i)?.[1]);
      result.push({ day, key: id ? 'post:' + id : null, text });
    }
    return { entries: result, empty: emptyLog.test(main.innerText) };
  }

  function scrollTarget() {
    const main = document.querySelector('main,[role="main"]');
    const candidates = main ? [main, ...main.querySelectorAll('div')] : [];
    for (let parent = main?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      candidates.push(parent);
    }
    return candidates.find(node => node.scrollHeight > node.clientHeight + 20
      && node.clientHeight > 200 && /^(?:auto|scroll)$/.test(getComputedStyle(node).overflowY))
      || document.scrollingElement;
  }

  async function scan(kind) {
    if (running) return;
    const start = from.value;
    const end = to.value;
    running = true;
    stopped = false;
    [...form.elements].forEach(control => { control.disabled = control !== stopButton; });
    status.textContent = 'Đang đọc ' + names[kind].toLowerCase() + '…';
    render();
    try {
      const records = new Map();
      let idle = 0;
      let observed = false;
      let finished = false;
      scrollTarget().scrollTop = 0;
      await new Promise(resolve => setTimeout(resolve, 900));
      for (let step = 0; step < 600 && !stopped; step += 1) {
        if (new URL(location.href).searchParams.get('category_key') !== category[kind]) {
          throw new Error('Trang Facebook đã đổi mục trong lúc quét.');
        }
        const size = records.size;
        const occurrences = new Map();
        const { entries, empty } = readEntries(kind);
        observed ||= empty || entries.length > 0;
        for (const entry of entries) {
          const base = JSON.stringify([entry.day, entry.text]);
          const occurrence = (occurrences.get(base) || 0) + 1;
          occurrences.set(base, occurrence);
          records.set(entry.key || base + ':' + occurrence, entry.day);
        }
        const target = scrollTarget();
        const bottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 4;
        idle = bottom && size === records.size ? idle + 1 : 0;
        if (idle >= 6) {
          finished = true;
          break;
        }
        target.scrollTop += Math.max(100, Math.floor(target.clientHeight * 0.8));
        status.textContent = 'Đang quét ' + names[kind].toLowerCase() + ' · ' + records.size + ' mục đã đọc';
        await new Promise(resolve => setTimeout(resolve, 650));
      }
      if (stopped) throw new Error('Đã dừng lần quét.');
      if (!finished) throw new Error('Chưa đọc hết nhật ký trong giới hạn quét.');
      if (!observed || (records.size && ![...records.values()].some(Boolean))) {
        throw new Error('Không nhận diện được mục bài đăng hoặc ngày đăng. Hãy thử tải lại trang.');
      }
      const counts = {};
      let skipped = 0;
      for (const day of records.values()) {
        if (!day) skipped += 1;
        else if (day >= start && day <= end) {
          const month = day.slice(0, 7);
          counts[month] = (counts[month] || 0) + 1;
        }
      }
      const next = report.from === start && report.to === end ? { ...report } : { from: start, to: end };
      next[kind] = { counts, skipped };
      await chrome.storage.local.set({ [storageKey]: next });
      report = next;
      status.textContent = 'Đã quét ' + names[kind].toLowerCase() + '.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      running = false;
      [...form.elements].forEach(control => { control.disabled = false; });
      stopButton.disabled = true;
      render();
    }
  }

  form.addEventListener('input', render);
  stopButton.addEventListener('click', () => { stopped = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (running) return;
    if (from.value > to.value) {
      status.textContent = 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
      return;
    }
    const kind = event.submitter?.value;
    if (!category[kind]) return;
    if (new URL(location.href).searchParams.get('category_key') === category[kind]) {
      void scan(kind);
    } else {
      const url = new URL(location.origin + path);
      url.search = new URLSearchParams({
        activity_history: 'false', category_key: category[kind],
        manage_mode: 'false', should_load_landing_page: 'false'
      });
      status.textContent = 'Đang mở mục ' + names[kind].toLowerCase() + '…';
      try {
        const queued = await chrome.runtime.sendMessage({
          type: 'queue-scan', scan: { kind, from: from.value, to: to.value }
        });
        if (!queued) throw new Error('Không lưu được yêu cầu quét.');
        location.assign(url);
      } catch (error) {
        status.textContent = error.message;
      }
    }
  });

  exportButton.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([ActivityReport.csv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'facebook-' + from.value + '_' + to.value + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  void (async () => {
    try {
      const saved = await chrome.storage.local.get(storageKey);
      report = saved[storageKey] || {};
      if (report.from && report.to) {
        from.value = report.from;
        to.value = report.to;
      }
      const pending = await chrome.runtime.sendMessage({ type: 'take-scan' });
      if (pending && category[pending.kind]) {
        from.value = pending.from;
        to.value = pending.to;
        if (form.checkValidity() && from.value <= to.value
          && new URL(location.href).searchParams.get('category_key') === category[pending.kind]) {
          await scan(pending.kind);
        }
      }
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  })();
})();
