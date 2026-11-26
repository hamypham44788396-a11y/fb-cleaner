'use strict';

const ActivityReport = (() => {
  const months = 'january february march april may june july august september october november december'.split(' ');
  const pad = number => String(number).padStart(2, '0');
  const localDay = date => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');

  function checkedDay(year, month, day) {
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const expected = [year, pad(month), pad(day)].join('-');
    return localDay(date) === expected ? expected : null;
  }

  function parseDay(value, now = new Date()) {
    const label = value.trim().toLowerCase().replace(/^(?:thứ [^,]+|chủ nhật|monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+/u, '');
    const local = /^(\d{4})-(\d{2})-(\d{2})(?:$|t)/.exec(label);
    if (local) {
      if (/(?:z|[+-]\d{2}:?\d{2})$/.test(label) && Number.isFinite(Date.parse(value))) {
        return localDay(new Date(value));
      }
      return checkedDay(local[1], local[2], local[3]);
    }
    const relative = /^(today|yesterday|hôm nay|hôm qua)$/.exec(label);
    if (relative) {
      const date = new Date(now);
      if (['yesterday', 'hôm qua'].includes(relative[1])) date.setDate(date.getDate() - 1);
      return localDay(date);
    }
    const vi = /^(?:ngày\s+)?(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s*,?\s*(?:năm\s+)?(\d{4}))?$/u.exec(label);
    if (vi) return checkedDay(vi[3] || now.getFullYear(), vi[2], vi[1]);
    const en = /^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(label)
      || /^(\d{1,2})\s+([a-z]+)(?:,?\s+(\d{4}))?$/.exec(label);
    if (!en) return null;
    const monthName = /^[a-z]/.test(en[1]) ? en[1] : en[2];
    const day = monthName === en[1] ? en[2] : en[1];
    const month = months.findIndex(name => name === monthName || name.slice(0, 3) === monthName);
    return month < 0 ? null : checkedDay(en[3] || now.getFullYear(), month + 1, day);
  }

  function summarize(from, to, profile, group) {
    const rows = [];
    let [year, month] = from.split('-').map(Number);
    const last = to.slice(0, 7);
    while (true) {
      const key = year + '-' + pad(month);
      if (key > last) return rows;
      const personal = profile[key] || 0;
      const groups = group[key] || 0;
      rows.push([key, personal, groups, personal + groups]);
      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }
  }

  const csv = rows => '\uFEFF' + [
    'Tháng,Bài trên trang cá nhân,Bài trong nhóm,Tổng',
    ...rows.map(row => row.join(','))
  ].join('\r\n') + '\r\n';

  return { localDay, parseDay, summarize, csv };
})();
