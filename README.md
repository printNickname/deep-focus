# Kairos

A Chrome extension that blocks distracting sites during focus sessions.

Named after the Greek concept of *kairos* — the right moment, the opportune window. Not clock time. The kind of time that actually matters.

---

## The problem

I kept opening Twitter in the middle of deep work without thinking about it. New tab, type "tw", hit enter, scroll for 20 minutes. Not a decision. Pure muscle memory.

Every site blocker I tried had the same flaw: one click to disable. When the urge is strong enough, you click without thinking. The blocker becomes useless exactly when you need it most.

---

## What Kairos does differently

**10-second cooldown to turn off.** When you try to disable focus mode, a countdown starts. You can still turn it off — but now it's a conscious choice, not a reflex.

**Attempt counter on the blocked page.** Every time you try to visit a blocked site, you see how many times you've already tried today. And a 7-day bar chart. The number is quietly humiliating. In a good way.

**No friction to turn on.** Enabling focus is instant. Disabling it costs 10 seconds.

---

## Features

- Focus timer (15 / 25 / 45 / 90 min sessions)
- Block any site by URL
- Quick presets: Twitter, YouTube, LinkedIn
- 7-day attempt history chart on the blocked page
- Entirely local — no account, no server, no data sent anywhere

---

## Install

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the folder

---

## Stack

Vanilla JS. Chrome Extension Manifest V3. No dependencies. ~500 lines total.

---

## License

MIT
