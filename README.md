# FB Cleaner

> Bulk-delete your own Facebook content — posts, photos, videos, comments, reactions — and keep your friends.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green)
![No network](https://img.shields.io/badge/network%20requests-zero-brightgreen)
![No build step](https://img.shields.io/badge/build%20step-none-lightgrey)

A Chrome extension that walks your Facebook activity log and empties it, one batch at a
time. It runs entirely in your browser, sends nothing anywhere, and **resumes automatically
after every page reload** — which is the part console scripts get wrong.

**Your friends list is never touched.**

The interface is **bilingual — English and Arabic**. It follows your browser language and
you can flip it any time with the `ع` / `EN` button in the panel header.

Every action it takes is **written to a persistent log you can export as CSV** — so you can
answer "what did it actually delete, and when?" long after the run is over.

---

## Why another one?

The two most popular open-source tools for this are both archived:

| Project | Stars | Last commit | Status |
|---|---|---|---|
| [weskerfoot/DeleteFB](https://github.com/weskerfoot/DeleteFB) | 2.6k | Dec 2021 | 🗄️ archived |
| [marcelja/facebook-delete](https://github.com/marcelja/facebook-delete) | 1.3k | Jan 2025 | 🗄️ archived |

They didn't die from lack of interest. They died because **Facebook's DOM keeps moving**,
and a selector that worked last year now clicks the wrong button. The
[Field notes](#field-notes-what-actually-breaks-facebook-bulk-delete-scripts) section below
documents exactly what that looks like today — it's the most useful part of this repo, and
it applies whether or not you use this extension.

The other common approach — paste a script into DevTools — dies the moment Facebook
reloads the page, which it does constantly. This runs as a content script and keeps its
place in `chrome.storage`, so it picks up where it left off.

---

## What it does

Pick **“Clean everything”** and it runs four steps in order, on its own:

| # | Step | Activity-log section | Button it clicks |
|---|---|---|---|
| 1 | Posts, photos, videos | `MANAGEPOSTSPHOTOSANDVIDEOS` | `Trash` |
| 2 | Comments | `COMMENTSCLUSTER` | `Remove` |
| 3 | Reactions | `YOURACTIVITYCOMMENTSANDREACTIONSSCHEMA` | `Unlike`, one by one |
| 4 | Empty trash | `TRASH` | `Delete` |

Steps 1, 2 and 4 are bulk: select all → act → reload → repeat until the section is empty.
Step 3 is per-item because **Facebook offers no bulk selection for reactions** — the parent
section renders zero checkboxes.

Separate opt-in modes, deliberately kept out of the automatic chain: **unlike all Pages**,
**leave all Groups**, and **current section (manual)** for anything else. Leaving a group
isn't like deleting a post — getting back in may need someone else's approval.

---

## Install

No build step. No dependencies.

1. Download this repo (`Code → Download ZIP`, or `git clone`) into a folder you'll keep.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `fb-cleaner` folder.

Open Facebook — a small panel appears on the right. It drags, minimizes, and collapses to
a bubble.

---

## Use it

**Dry run is on by default. Leave it on for the first pass.**

It walks all four sections and reports what it *would* delete and which button it *would*
click, without touching anything. Log lines in dry mode start with `[تجربة]` ("would have").
The counter stays at `0` — that's how you know nothing was deleted.

When the numbers look right, uncheck the box. The button turns red and says
"delete for real". Press it.

- **↺** resets to step 1 and zeroes the counter. **Stop only pauses** — it deliberately
  remembers its place so it can survive reloads, which means Stop→Start *resumes* rather
  than restarts.
- **A run belongs to the tab that started it.** The same tab resumes after a reload; a
  different tab won't silently pick the run back up, and neither will anything after 30
  minutes of inactivity. You'll see a "paused here" notice and have to press start again.
  Without that guard, opening Facebook days later would quietly continue deleting.
- **Everything it does is recorded.** Timestamp, section, dry-or-live, action and a
  snippet of the item — exportable as CSV from the panel. The on-screen log is capped and
  wiped on every reload; this one isn't. For a tool that deletes permanently, being able to
  reconstruct a run afterwards matters more than it sounds like it does.
- Leave the speed on **slow**. The randomized delays are there on purpose; Facebook
  restricts accounts that generate fast robotic activity.
- Steps 1–2 move things to **Trash**, recoverable for 30 days. **Step 4 is the
  irreversible one.** Download your data first:
  `Settings → Your information → Download your information`.

---

## Field notes: what actually breaks Facebook bulk-delete scripts

Verified against a live account in August 2026. If you're writing your own tool, these
four will bite you.

### 1. Two different buttons are both named "Trash"

The activity log has a `Trash` button in the bulk toolbar **and** a `Trash` link in the
left sidebar. The sidebar one comes **first** in DOM order, so any document-wide
`find button with text "Trash"` grabs the wrong one and navigates away instead of deleting.

```js
// Measured on the Comments section:
document-wide search  →  "Trash"  at x=8     ← sidebar nav. Wrong.
toolbar-scoped search →  "Remove" at x=1695  ← correct.
```

The fix is to anchor on the checkbox and walk **up** to the nearest ancestor that contains
an action button, with a hard depth cap — climb too far and you reach a container that
holds the sidebar too, which puts you right back on the wrong button.

### 2. The action button is renamed per section

`Trash` on posts. `Remove` on comments. `Delete` in the trash view. A tool hardcoded to
one of them silently fails on the others — and if your ancestor-walk keys off the same
word list, missing a name also breaks the toolbar detection that protects you from #1.

### 3. Guessable `category_key` values mostly don't exist

`LIKESANDREACTIONS` and `LIKESCLUSTER` both return *"This page isn't available right now."*
The real key for reactions is `YOURACTIVITYCOMMENTSANDREACTIONSSCHEMA`, and it does **not**
support `manage_mode=true` — it renders zero checkboxes, so bulk deletion of reactions is
not something Facebook exposes at all. Verify keys before shipping them.

### 4. Facebook writes the same event two ways

Rows appear as both `liked a comment` and `likes a link`. A filter matching only `liked`
missed 12 of 50 rows in testing. Watch the regex, too: `\blikes?\b` does **not** match
`liked` — the word boundary fails on the trailing `d`. `\blike[sd]?\b` is what you want.

**And a bonus:** `Escape` does not reliably close Facebook menus. Dispatching a synthetic
`keydown` leaves them open. Closing needs an explicit close button, then an outside click,
then Escape as a last resort.

---

## What it does NOT do

- **Friends** — untouched, by design.
- **Messages** — Messenger isn't part of the activity log.
- **Old profile and cover photos** — these often survive in their albums. Check
  `Profile → Photos → Albums` afterwards.
- **Content you're tagged in** — not yours to delete; you can only untag.
- **Group posts** — some go with step 1, some don't. Check `Activity log → Groups`.

---

## Privacy

Zero network requests. No analytics, no telemetry, no remote config. The only permissions
requested are `storage` and host access to `facebook.com`. It's readable JavaScript in
[`content.js`](content.js) — read it before you run it.

The action log lives in `chrome.storage.local` on your machine and nothing ever uploads it.
It does contain snippets of your own content (post and comment text, group names), which is
the whole point of an audit trail — and why there's a **Clear** button right next to Export.

---

## Disclaimer

Automating Facebook is against Facebook's Terms of Service, even when the data you're
deleting is your own. Slow mode and randomized delays reduce friction; they do not
eliminate risk. **Deletion is permanent.** Export your data first. Use at your own risk —
MIT license, no warranty of any kind.

---

## العربية

إضافة كروم بتفضّي حسابك على فيسبوك من **البوستات والصور والفيديوهات والتعليقات والتفاعلات**،
وبعدين بتفرّغ سلة المهملات. **الأصدقاء مش بيتلمسوا نهائيًا.**

الفرق عن سكربتات الكونسول إنها بتفضل شغالة بعد الـrefresh: بتحفظ مكانها في `chrome.storage`
وبتكمّل لوحدها.

**التركيب:** نزّل الريبو ← `chrome://extensions` ← فعّل **Developer mode** ← **Load unpacked**
← اختار فولدر `fb-cleaner`.

**التشغيل:** سيب **وضع التجربة** شغال أول مرة — هيقوللك هيمسح كام عنصر واسم الزرار اللي
هيدوس عليه من غير ما يمسح، والعدّاد هيفضل صفر. لما الأرقام تبقى منطقية شيل العلامة.

**قبل ما تبدأ:** نزّل نسخة من بياناتك من `Settings ← Your information ← Download your information`.
الخطوات 1 و2 بترمي في السلة (قابل للاسترجاع ٣٠ يوم)، لكن **الخطوة 4 مالهاش رجوع**.

زرار **↺** بيرجّعه لأول الطابور. **«قف» بيوقف بس ومابيصفّرش المكان** — لأن ذاكرة المكان دي
هي نفسها اللي بتخليه يكمّل بعد الـrefresh.

سيب السرعة على **بطيء وآمن**؛ التأخير العشوائي مقصود، وفيسبوك بيقيّد الحسابات اللي بتعمل
نشاط آلي سريع. والأتمتة دي مخالفة لشروط فيسبوك حتى وإنت بتمسح بياناتك إنت — استعملها على
مسؤوليتك.
