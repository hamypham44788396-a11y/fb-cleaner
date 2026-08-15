/* ============================================================================
   FB Cleaner — content script
   Bulk-deletes your own Facebook content: posts, photos, videos, comments and
   reactions, then empties the trash. Your friends list is never touched.
   State lives in chrome.storage so the run resumes after every page reload.
   ========================================================================== */
(() => {
'use strict';

if (window.__FBC_LOADED__) return;
window.__FBC_LOADED__ = true;

/* ------------------------------- i18n ------------------------------------ */
const L = {
  en: {
    dir: 'ltr',
    chooseMode: 'Choose mode',
    autoName: '🧹 Clean everything (automatic)',
    autoHint: 'Posts & photos → comments → reactions → empty trash. Runs step to step on its own.',
    dryLabel: 'Dry run (nothing is deleted)',
    speeds: ['Slow & safe', 'Medium', 'Fast'],
    startDry: 'Start (dry run)',
    startLive: 'Delete for real',
    running: 'Running…',
    stop: 'Stop',
    resetTitle: 'Back to step 1',
    minimize: 'Minimize',
    hide: 'Hide',
    show: 'Show FB Cleaner',
    deletedTotal: 'Deleted so far',
    footer: 'Your friends are never touched.<br>Deletion is permanent — be careful.',
    ready: 'Ready. Leave dry run on for the first pass.',
    otherTab: 'A run was left open in another tab. Paused here — press start to continue in this tab.',
    resuming: 'Resuming where it left off…',
    stopped: 'Stopped on request.',
    resetDone: 'Back to step 1 — press start.',
    step: (i, n, name) => `Step ${i}/${n} — ${name}`,
    stepDone: name => `Finished: ${name} ✅`,
    chainDone: n => `All steps complete. ${n} items total 🎉`,
    opening: name => `Opening: ${name}`,
    batchDone: (name, n, total) => `${name}: deleted ${n} (total ${total})`,
    reloading: 'Reloading for the next batch…',
    dryBatch: (name, n, btn) => `[dry] ${name}: ${n} items in this batch — button “${btn}”`,
    dryUnlike: what => `[dry] would remove reaction: ${what}`,
    dryUnlikePage: what => `[dry] would unlike: ${what}`,
    dryGroup: '[dry] would open a group menu',
    started: name => `Started: ${name}`,
    errToolbar: 'Toolbar not found — make sure the page is in manage mode',
    errAction: name => `Action button not found in “${name}”`,
    errConfirm: 'Confirm button not found in the dialog',
    errNav: name => `Can’t open “${name}” — open it yourself and use manual mode.`,
    errUid: 'Account id not found — make sure you’re logged in.',
    noUnlike: 'No Unlike after two tries — skipped',
    noUnlikePage: 'No unlike option — skipped',
    tasks: {
      posts:     ['Posts, photos and videos', 'Opens “Your posts, photos and videos” and moves everything to trash.'],
      comments:  ['Comments', 'Opens the Comments section of your activity log.'],
      reactions: ['Reactions (one by one)', 'Facebook offers no bulk selection for reactions — these go one at a time, so it’s slow.'],
      trash:     ['Empty trash', '🔴 Permanent deletion — no 30-day wait.'],
      current:   ['Current section (manual)', 'Open any activity-log section in manage mode, then press start.'],
      pages:     ['Unlike all Pages', 'Open: your profile → More → Likes, then start.'],
      groups:    ['Leave all Groups', 'Opens your groups page automatically.'],
    },
  },
  ar: {
    dir: 'rtl',
    chooseMode: 'اختار الوضع',
    autoName: '🧹 امسح كل المحتوى (تلقائي بالترتيب)',
    autoHint: 'بوستات وصور ← تعليقات ← تفاعلات ← تفريغ السلة. بيمشي لوحده لآخر خطوة.',
    dryLabel: 'وضع التجربة (من غير مسح)',
    speeds: ['بطيء وآمن', 'متوسط', 'سريع'],
    startDry: 'ابدأ (تجربة)',
    startLive: 'ابدأ المسح الفعلي',
    running: 'شغّال…',
    stop: 'قف',
    resetTitle: 'ارجع لأول الطابور',
    minimize: 'تصغير',
    hide: 'إخفاء',
    show: 'إظهار FB Cleaner',
    deletedTotal: 'اتمسح إجمالاً',
    footer: 'الأصدقاء مش بيتأثروا نهائياً.<br>الحذف نهائي — خد بالك.',
    ready: 'جاهز. سيب «وضع التجربة» شغال أول مرة.',
    otherTab: 'فيه تشغيل سايب في تبويب تاني. متوقف هنا — دوس ابدأ لو عايزه يكمّل في التبويب ده.',
    resuming: 'بيكمّل من حيث ما وقف…',
    stopped: 'اتوقف بالطلب.',
    resetDone: 'اترجّع لأول الطابور — دوس ابدأ.',
    step: (i, n, name) => `الخطوة ${i}/${n} — ${name}`,
    stepDone: name => `خلص: ${name} ✅`,
    chainDone: n => `تمّت السلسلة كلها. الإجمالي ${n} عنصر 🎉`,
    opening: name => `بيفتح: ${name}`,
    batchDone: (name, n, total) => `${name}: اتمسحت دفعة ${n} (الإجمالي ${total})`,
    reloading: 'refresh للدفعة الجاية…',
    dryBatch: (name, n, btn) => `[تجربة] ${name}: ${n} عنصر في الدفعة — الزرار «${btn}»`,
    dryUnlike: what => `[تجربة] كنت هشيل تفاعل: ${what}`,
    dryUnlikePage: what => `[تجربة] كنت هلغي إعجاب: ${what}`,
    dryGroup: '[تجربة] كنت هفتح قايمة جروب',
    started: name => `بدأ: ${name}`,
    errToolbar: 'مش لاقي شريط الأدوات — اتأكد إن الصفحة في وضع الإدارة',
    errAction: name => `مش لاقي زرار التنفيذ في «${name}»`,
    errConfirm: 'مش لاقي زرار التأكيد في النافذة',
    errNav: name => `مش قادر أفتح «${name}» — افتح القسم بإيدك واختار الوضع اليدوي.`,
    errUid: 'مش لاقي رقم حسابك — اتأكد إنك مسجّل دخول.',
    noUnlike: 'مش لاقي Unlike بعد محاولتين — تخطّيت',
    noUnlikePage: 'مش لاقي «إلغاء الإعجاب» — تخطّيت',
    tasks: {
      posts:     ['البوستات والصور والفيديوهات', 'بيفتح Your posts, photos and videos ويرمي كل حاجة في السلة.'],
      comments:  ['التعليقات', 'بيفتح قسم التعليقات في سجل النشاط.'],
      reactions: ['التفاعلات (واحد واحد)', 'فيسبوك مابيدّيش تحديد جماعي للتفاعلات — بتتشال عنصر عنصر فبتاخد وقت.'],
      trash:     ['تفريغ سلة المهملات', '🔴 حذف نهائي فوري — من غير استنى ٣٠ يوم.'],
      current:   ['القسم المفتوح حالياً (يدوي)', 'افتح أي قسم من سجل النشاط بوضع الإدارة، وبعدين دوس ابدأ.'],
      pages:     ['إلغاء الإعجاب بكل الصفحات', 'افتح: بروفايلك ← More ← Likes، وبعدين ابدأ.'],
      groups:    ['مغادرة كل الجروبات', 'هيفتح صفحة جروباتك لوحده.'],
    },
  },
};

const guessLang = () => /^ar\b/i.test(navigator.language || '') ? 'ar' : 'en';
const T  = () => L[S.lang] || L.en;
const t  = (k, ...a) => { const v = T()[k]; return typeof v === 'function' ? v(...a) : v; };
const tn = key => T().tasks[key]?.[0] ?? key;   // اسم المهمة  / task name
const th = key => T().tasks[key]?.[1] ?? '';    // شرح المهمة  / task hint

/* ------------------------------- الحالة / state --------------------------- */
const DEFAULTS = {
  running: false,
  mode: 'auto',
  dry: true,
  speed: 1,          // 1 = slow & safe (default: deletion is permanent)
  count: 0,
  step: 0,           // position in the chain when mode = auto
  navTries: 0,       // guard against a navigation loop
  session: null,     // which browser tab owns this run
  lastTick: 0,       // epoch ms of the last step, for the staleness guard
  lang: guessLang(),
};
let S = { ...DEFAULTS };
let abort = false;

const save = () => chrome.storage.local.set({ fbc: S });

/* A run belongs to ONE tab. sessionStorage is per-tab and survives reloads,
   which is exactly the lifetime we want: the same tab resumes after a reload,
   but a different tab opened later does NOT silently pick the run back up.
   Without this, opening Facebook days later would resume deleting on its own. */
const SESSION_KEY = 'fbcSession';
const newSession = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
const readSession = () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } };
const claimSession = id => { try { sessionStorage.setItem(SESSION_KEY, id); } catch {} };
const STALE_MS = 30 * 60 * 1000;
const ownsRun = () => S.session && readSession() === S.session &&
                      Date.now() - (S.lastTick || 0) < STALE_MS;
const load = () => new Promise(r =>
  chrome.storage.local.get('fbc', d => r(Object.assign({}, DEFAULTS, d.fbc || {}))));

/* ------------------------------ helpers ---------------------------------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd   = (a, b) => a + Math.random() * (b - a);
const K     = () => [1.9, 1.3, 0.85][S.speed - 1] ?? 1.9;
const pause = (a, b) => sleep(rnd(a, b) * K());

const vis = el => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};
const txt = el => (el?.innerText || el?.getAttribute?.('aria-label') || '')
  .replace(/\s+/g, ' ').trim();
const uid = () => (document.cookie.match(/c_user=(\d+)/) || [])[1] || null;

const buttons = (root = document) =>
  [...root.querySelectorAll('[role="button"],button,[role="menuitem"]')].filter(vis);

const dialog = () => [...document.querySelectorAll('[role="dialog"]')].filter(vis).pop() || null;
const menu   = () => [...document.querySelectorAll('[role="menu"],[role="dialog"]')].filter(vis).pop() || null;

async function waitFor(fn, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(200); }
  return null;
}

const overlayOpen = () =>
  [...document.querySelectorAll('[role="menu"],[role="dialog"]')].filter(vis).length > 0;

/* Escape alone is not enough — tested live, the menu stayed open. Try the
   explicit close button, then an outside click, then Escape as a last resort. */
async function closeOverlay() {
  if (!overlayOpen()) return;
  const x = buttons().find(b => /^(close|إغلاق)$/i.test(txt(b)));
  if (x) { x.click(); await sleep(400); }
  if (!overlayOpen()) return;
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click'])
    document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 5, clientY: 5 }));
  await sleep(400);
  if (!overlayOpen()) return;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
  await sleep(300);
}

/* --------------------------- button labels (EN/AR) ------------------------ */
/* Order matters: look for Trash first. Archive is never a valid target. */
const ACT_TRASH  = [
  /^(trash|move to trash|سلة المهملات|نقل إلى سلة المهملات|نقل للمهملات)$/i,
  /^(delete|حذف|remove|إزالة)$/i,
];
const ACT_DELETE = [
  /^(delete|delete permanently|حذف|حذف نهائي|remove|إزالة)$/i,
];
/* Used only to RECOGNISE the toolbar, never to decide what to click.
   ⚠️ "remove" must stay here: on the Comments section the action button is
   named Remove, not Trash. Without it the climb overshoots into a container
   that also holds the sidebar — and then clicks the sidebar's Trash link. */
const BAR = /^(archive|trash|delete|restore|remove|أرشفة|حذف|استعادة|إزالة|سلة المهملات)$/i;

const CONFIRM = [
  /^(move to trash|نقل إلى سلة المهملات|نقل للمهملات)$/i,
  /^(delete permanently|حذف نهائي)$/i,
  /^(trash|delete|remove|حذف|إزالة)$/i,
  /^(confirm|ok|yes|تأكيد|موافق|نعم)$/i,
];
const CANCEL = /^(cancel|close|back|not now|no|إلغاء|الغاء|إغلاق|رجوع|لا)$/i;

const RE_LIKED  = /^(liked|following|معجب|تم الإعجاب|أعجبني|تتم المتابعة)/i;
const RE_UNLIKE = /(unlike|unfollow|إلغاء الإعجاب|الغاء الاعجاب|إلغاء المتابعة)/i;
const RE_MORE   = /^(more|options|actions|المزيد|خيارات|إجراءات)/i;
const RE_LEAVE  = /(leave group|مغادرة المجموعة|^leave$|^مغادرة$)/i;

/* Returns the first button matching the first pattern that hits — order is priority */
function pick(root, patterns) {
  const bs = buttons(root);
  for (const re of patterns) {
    const b = bs.find(x => re.test(txt(x)) && !CANCEL.test(txt(x)));
    if (b) return b;
  }
  return null;
}

/* Anchor on the checkbox and climb to the nearest ancestor holding an action
   button. This is what stops us clicking the sidebar link that carries the
   same label as the toolbar button.
   The depth cap of 8 is deliberate: climb higher and you reach the page
   container that also holds the sidebar, so we fail loudly instead. */
function toolbar() {
  const cb = document.querySelector('input[type="checkbox"]');
  if (!cb) return null;
  let n = cb;
  for (let i = 0; i < 8; i++) {
    n = n.parentElement;
    if (!n) return null;
    if (buttons(n).some(b => BAR.test(txt(b)))) return n;
  }
  return null;
}

async function loadMore(rounds = 7) {
  let last = 0;
  for (let i = 0; i < rounds && !abort; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await pause(1500, 2100);
    const h = document.body.scrollHeight;
    if (h === last) break;
    last = h;
  }
  window.scrollTo(0, 0);
  await pause(900, 1300);
}

/* ---------------------------- batch selection ----------------------------- */
const nChecked = () => document.querySelectorAll('input[type="checkbox"]:checked').length;

async function clickBox(input) {
  input.click();
  await sleep(80);
  if (!input.checked) {
    const alt = input.closest('label,[role="checkbox"]');
    if (alt) alt.click();
  }
}

/* Returns how many ITEMS are selected, excluding the "All" checkbox itself */
async function selectBatch() {
  const boxes = [...document.querySelectorAll('input[type="checkbox"]')];
  if (boxes.length < 2) return 0;

  const before = nChecked();
  if (!boxes[0].checked) await clickBox(boxes[0]);
  await pause(1100, 1600);

  if (nChecked() > before + 1) return nChecked() - 1;   // "All" worked

  // "All" didn't propagate — select items individually
  const n0 = nChecked();
  for (const b of boxes.slice(1, 51)) {
    if (abort) break;
    if (!b.checked) { await clickBox(b); await sleep(rnd(60, 140)); }
  }
  await pause(700, 1100);
  return Math.max(0, nChecked() - (boxes[0].checked ? 1 : 0)) || (nChecked() - n0);
}

/* --------------------- one batch from the activity log -------------------- */
async function bulkBatch(task) {
  await loadMore();
  if (document.querySelectorAll('input[type="checkbox"]').length < 2)
    return { empty: true };

  const n = await selectBatch();
  if (n < 1) return { empty: true };

  // The action buttons only appear once something is selected
  const tb = toolbar();
  if (!tb) return { err: t('errToolbar') };
  const btn = pick(tb, task.act);
  if (!btn) return { err: t('errAction', tn(task.key)) };

  if (S.dry) return { dry: true, n, btn: txt(btn) };

  btn.click();
  await pause(2200, 3000);

  const dlg = await waitFor(dialog, 5000);
  if (dlg) {
    const go = pick(dlg, CONFIRM);
    if (!go) { await closeOverlay(); return { err: t('errConfirm'), n }; }
    go.click();
    await pause(2600, 3400);
  }
  return { ok: true, n };
}

/* --- Reactions: one at a time. Verified live that "..." opens a menu holding
   Unlike, and that the parent section renders zero checkboxes — so there is no
   bulk selection for reactions at all. --------------------------------------*/
async function reactionsLoop() {
  const UN = [/^(unlike|remove reaction|remove like|إلغاء الإعجاب|إزالة التفاعل)$/i];
  let idle = 0;
  while (!abort && idle < 3) {
    const b = buttons().find(x =>
      /^more options for/i.test(txt(x)) &&
      /* Facebook writes the same event two ways: "liked a comment" and
         "likes a link". Matching only "liked" misses a quarter of the rows.
         Note \blikes?\b does NOT match "liked" — the boundary fails on the d. */
      /(\blike[sd]?\b|\breact(s|ed)?\b|أعجب)/i.test(txt(x)) &&
      !x.dataset.fbcDone);
    if (!b) { window.scrollTo(0, document.body.scrollHeight); await pause(1800, 2400); idle++; continue; }
    idle = 0;
    b.dataset.fbcDone = '1';
    b.scrollIntoView({ block: 'center' });
    await pause(400, 700);

    if (S.dry) { log(t('dryUnlike', txt(b).slice(18, 68)), 'warn'); await pause(400, 700); continue; }

    let done = false;
    for (let attempt = 0; attempt < 2 && !done; attempt++) {
      if (attempt) { await closeOverlay(); await pause(700, 1100); }  // stale menu still open?
      b.click();
      await pause(800, 1200);
      const m = await waitFor(menu, 5000);
      const un = m && pick(m, UN);
      if (un) { un.click(); bump(); await pause(1200, 2000); done = true; }
    }
    if (!done) { await closeOverlay(); log(t('noUnlike'), 'warn'); }
  }
}

/* ------------------- unlike Pages / leave Groups -------------------------- */
async function pagesLoop() {
  let idle = 0;
  while (!abort && idle < 3) {
    const b = buttons().find(x => RE_LIKED.test(txt(x)) && !x.dataset.fbcDone);
    if (!b) { window.scrollTo(0, document.body.scrollHeight); await pause(1800, 2400); idle++; continue; }
    idle = 0;
    b.dataset.fbcDone = '1';
    b.scrollIntoView({ block: 'center' });
    await pause(400, 700);

    if (S.dry) { log(t('dryUnlikePage', txt(b).slice(0, 40)), 'warn'); await pause(500, 900); continue; }

    b.click();
    await pause(700, 1100);
    const m = await waitFor(menu, 4000);
    const un = m && pick(m, [RE_UNLIKE]);
    if (un) { un.click(); bump(); } else { await closeOverlay(); log(t('noUnlikePage'), 'warn'); }
    await pause(1200, 2200);
  }
}

async function groupsLoop() {
  let idle = 0;
  while (!abort && idle < 3) {
    const b = buttons().find(x => RE_MORE.test(txt(x)) && !x.dataset.fbcDone);
    if (!b) { window.scrollTo(0, document.body.scrollHeight); await pause(1800, 2400); idle++; continue; }
    idle = 0;
    b.dataset.fbcDone = '1';
    b.scrollIntoView({ block: 'center' });
    await pause(400, 700);

    if (S.dry) { log(t('dryGroup'), 'warn'); await pause(500, 900); continue; }

    b.click();
    await pause(700, 1100);
    const m = await waitFor(menu, 4000);
    const lv = m && pick(m, [RE_LEAVE]);
    if (!lv) { await closeOverlay(); await pause(600, 900); continue; }
    lv.click();
    await pause(900, 1400);
    const dlg = await waitFor(dialog, 4000);
    const cf = dlg && pick(dlg, [RE_LEAVE, /^(confirm|leave|تأكيد|مغادرة)$/i]);
    if (cf) { cf.click(); bump(); } else { await closeOverlay(); }
    await pause(1400, 2400);
  }
}

/* ================================ tasks =================================== */
/* These keys are verified against a live account — do not change them blind.
   ⚠️ LIKESANDREACTIONS and LIKESCLUSTER both return an error page. */
const CAT = {
  posts:     'MANAGEPOSTSPHOTOSANDVIDEOS',
  comments:  'COMMENTSCLUSTER',
  reactions: 'YOURACTIVITYCOMMENTSANDREACTIONSSCHEMA',
  trash:     'TRASH',
};

const TASKS = {
  posts:     { cat: CAT.posts,     act: ACT_TRASH },
  comments:  { cat: CAT.comments,  act: ACT_TRASH },
  reactions: { cat: CAT.reactions, manage: false, loop: reactionsLoop },
  trash:     { cat: CAT.trash,     act: ACT_DELETE },
  current:   { cat: null,          act: ACT_TRASH },
  pages:     { loop: pagesLoop },
  groups:    { loop: groupsLoop, url: () => 'https://www.facebook.com/groups/joins/' },
};
for (const k of Object.keys(TASKS)) TASKS[k].key = k;

/* The automatic chain covers account CONTENT only.
   Pages and Groups are deliberately left out — leaving a group isn't like
   deleting a post; getting back in may need someone else's approval. */
const CHAIN = ['posts', 'comments', 'reactions', 'trash'];

const taskOf = () => S.mode === 'auto' ? TASKS[CHAIN[S.step]] : TASKS[S.mode];

/* --------------------------- "am I on the right page?" -------------------- */
function targetURL(task) {
  if (task.url) return task.url();
  if (!task.cat) return null;
  const id = uid();
  if (!id) return null;
  const mm = task.manage === false ? 'false' : 'true';
  return `https://www.facebook.com/${id}/allactivity` +
         `?activity_history=false&category_key=${task.cat}` +
         `&manage_mode=${mm}&should_load_landing_page=false`;
}

/* Compare pathname + category_key, NOT the last path segment: every activity
   log section ends in /allactivity, so a suffix check confuses all of them. */
function onTarget(task) {
  const u = targetURL(task);
  if (!u) return true;                       // manual task: any page is fine
  const a = new URL(u), b = new URL(location.href);
  const p = s => s.replace(/\/+$/, '');
  if (p(a.pathname) !== p(b.pathname)) return false;
  const c = a.searchParams.get('category_key');
  if (c && b.searchParams.get('category_key') !== c) return false;
  return true;
}

/* ================================ runner ================================== */
async function tick() {
  if (abort) return;
  S.lastTick = Date.now();
  const task = taskOf();
  if (!task) { log(t('chainDone', S.count), 'ok'); stop(); return; }

  if (task.loop) {
    if (!onTarget(task)) { navigate(task); return; }
    S.navTries = 0; await save();
    log(t('started', tn(task.key)), 'ok');
    await task.loop();
    if (!abort) await advance(task);
    return;
  }

  if (!onTarget(task)) { navigate(task); return; }
  S.navTries = 0;

  const r = await bulkBatch(task);
  if (abort) return;

  if (r.err)   { log(r.err, 'err'); stop(); return; }
  if (r.empty) { await advance(task); return; }
  if (r.dry)   { log(t('dryBatch', tn(task.key), r.n, r.btn), 'warn'); await advance(task); return; }

  S.count += r.n;
  log(t('batchDone', tn(task.key), r.n, S.count), 'ok');
  await save(); paint();

  log(t('reloading'));
  await pause(3000, 4500);
  if (!abort) location.reload();
}

function navigate(task) {
  if (S.navTries >= 3) { log(t('errNav', tn(task.key)), 'err'); stop(); return; }
  const u = targetURL(task);
  if (!u) { log(t('errUid'), 'err'); stop(); return; }
  S.navTries++;
  save().then(() => { log(t('opening', tn(task.key))); location.href = u; });
}

async function advance(task) {
  log(t('stepDone', tn(task.key)), 'ok');
  if (S.mode !== 'auto') { stop(); return; }
  S.step++;
  S.navTries = 0;
  await save(); paint();
  if (S.step >= CHAIN.length) { log(t('chainDone', S.count), 'ok'); stop(); return; }
  await pause(1500, 2500);
  if (!abort) tick();
}

async function start() {
  abort = false;
  S.running = true;
  S.session = newSession();
  claimSession(S.session);
  S.lastTick = Date.now();
  if (S.mode === 'auto' && S.step >= CHAIN.length) S.step = 0;
  S.navTries = 0;
  await save(); paint();
  tick();
}

function stop() {
  abort = true;
  S.running = false;
  save(); paint();
}

const bump = () => { S.count++; paint(); save(); };

/* ================================ panel =================================== */
let $panel, $log, $count, $start, $stop, $mode, $dry, $speed, $sval, $hint, $step,
    $lang, $modeLbl, $dryLbl, $statLbl, $foot, $reset, $min, $x, $bubble;

function log(msg, cls = '') {
  if (!$log) return;
  const d = document.createElement('div');
  if (cls) d.className = 'fbc-' + cls;
  d.textContent = msg;
  $log.appendChild(d);
  $log.scrollTop = $log.scrollHeight;
  while ($log.children.length > 60) $log.removeChild($log.firstChild);
}

function paintOptions() {
  const cur = S.mode;
  $mode.innerHTML = [`<option value="auto">${t('autoName')}</option>`]
    .concat(Object.keys(TASKS).map(k => `<option value="${k}">${tn(k)}</option>`))
    .join('');
  $mode.value = cur;
}

function paint() {
  if (!$start) return;
  const task = taskOf();
  $panel.style.direction = t('dir');
  $modeLbl.textContent = t('chooseMode');
  $dryLbl.textContent  = t('dryLabel');
  $statLbl.textContent = t('deletedTotal');
  $foot.innerHTML      = t('footer');
  $lang.textContent    = S.lang === 'ar' ? 'EN' : 'ع';
  $stop.textContent    = t('stop');
  $reset.title = t('resetTitle');
  $min.title   = t('minimize');
  $x.title     = t('hide');
  $bubble.title = t('show');

  $count.textContent = S.count;
  $start.textContent = S.running ? t('running') : (S.dry ? t('startDry') : t('startLive'));
  $start.disabled = S.running;
  $start.classList.toggle('fbc-live', !S.dry);
  $stop.disabled = !S.running;
  $dry.checked = S.dry;
  $speed.value = S.speed;
  $sval.textContent = t('speeds')[S.speed - 1];
  $hint.textContent = S.mode === 'auto' ? t('autoHint') : th(S.mode);
  $step.textContent = S.mode === 'auto'
    ? t('step', Math.min(S.step + 1, CHAIN.length), CHAIN.length, task ? tn(task.key) : '—')
    : '';
  $step.style.display = S.mode === 'auto' ? '' : 'none';
}

function ui() {
  const p = document.createElement('div');
  $panel = p;
  p.id = 'fbc-panel';
  p.innerHTML = `
    <div id="fbc-head">
      <span>🧹 FB Cleaner</span>
      <div class="fbc-sp">
        <button id="fbc-lang"></button>
        <button id="fbc-min">–</button>
        <button id="fbc-x">×</button>
      </div>
    </div>
    <div class="fbc-body">
      <p class="fbc-lbl" id="fbc-modelbl"></p>
      <select id="fbc-mode"></select>
      <div class="fbc-step" id="fbc-step"></div>
      <div class="fbc-hint" id="fbc-hint"></div>

      <div class="fbc-row">
        <label><input type="checkbox" id="fbc-dry"> <span id="fbc-drylbl"></span></label>
      </div>
      <div class="fbc-row">
        <input type="range" id="fbc-speed" min="1" max="3" step="1">
        <span class="fbc-val" id="fbc-sval"></span>
      </div>

      <div class="fbc-btns">
        <button id="fbc-start"></button>
        <button id="fbc-stop"></button>
        <button id="fbc-reset">↺</button>
      </div>

      <div class="fbc-stat"><span id="fbc-statlbl"></span><b id="fbc-count">0</b></div>
      <div id="fbc-log"></div>
      <p class="fbc-foot" id="fbc-foot"></p>
    </div>`;
  document.documentElement.appendChild(p);

  $bubble = document.createElement('div');
  $bubble.id = 'fbc-bubble';
  $bubble.textContent = '🧹';
  $bubble.style.display = 'none';
  document.documentElement.appendChild($bubble);

  $log     = p.querySelector('#fbc-log');
  $count   = p.querySelector('#fbc-count');
  $start   = p.querySelector('#fbc-start');
  $stop    = p.querySelector('#fbc-stop');
  $reset   = p.querySelector('#fbc-reset');
  $mode    = p.querySelector('#fbc-mode');
  $dry     = p.querySelector('#fbc-dry');
  $speed   = p.querySelector('#fbc-speed');
  $sval    = p.querySelector('#fbc-sval');
  $hint    = p.querySelector('#fbc-hint');
  $step    = p.querySelector('#fbc-step');
  $lang    = p.querySelector('#fbc-lang');
  $modeLbl = p.querySelector('#fbc-modelbl');
  $dryLbl  = p.querySelector('#fbc-drylbl');
  $statLbl = p.querySelector('#fbc-statlbl');
  $foot    = p.querySelector('#fbc-foot');
  $min     = p.querySelector('#fbc-min');
  $x       = p.querySelector('#fbc-x');

  paintOptions();

  $lang.onclick  = () => { S.lang = S.lang === 'ar' ? 'en' : 'ar'; save(); paintOptions(); paint(); };
  $mode.onchange = () => { S.mode = $mode.value; S.step = 0; S.count = 0; S.navTries = 0; save(); paint(); };
  $dry.onchange  = () => { S.dry = $dry.checked; save(); paint(); };
  $speed.oninput = () => { S.speed = +$speed.value; save(); paint(); };
  $start.onclick = () => start();
  $stop.onclick  = () => { stop(); log(t('stopped'), 'warn'); };
  /* Stop only pauses — it deliberately keeps its place so a reload can resume.
     This is the explicit "start over" the user needs. */
  $reset.onclick = () => {
    stop();
    S.step = 0; S.count = 0; S.navTries = 0;
    save(); paint();
    log(t('resetDone'), 'ok');
  };
  $min.onclick    = () => p.classList.toggle('fbc-min');
  $x.onclick      = () => { p.style.display = 'none'; $bubble.style.display = ''; };
  $bubble.onclick = () => { p.style.display = ''; $bubble.style.display = 'none'; };

  const head = p.querySelector('#fbc-head');
  let dx = 0, dy = 0, drag = false;
  head.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    drag = true;
    const r = p.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    p.style.right = 'auto';
    e.preventDefault();
  });
  addEventListener('mousemove', e => {
    if (!drag) return;
    p.style.left = (e.clientX - dx) + 'px';
    p.style.top  = (e.clientY - dy) + 'px';
  });
  addEventListener('mouseup', () => { drag = false; });
}

/* ------------------------------- boot ------------------------------------ */
(async () => {
  S = await load();
  ui();
  paint();

  if (S.running && ownsRun()) {
    log(t('resuming'), 'ok');
    await sleep(6000);              // let Facebook render the page
    if (S.running) { abort = false; tick(); }
  } else if (S.running) {
    S.running = false;              // اتساب في تبويب تاني أو بقى قديم
    await save(); paint();
    log(t('otherTab'), 'warn');
  } else {
    log(t('ready'));
  }
})();

})();
