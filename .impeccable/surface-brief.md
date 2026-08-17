# Surface brief: FreedomPort 智能入口 (smart-entry / index.html)

Scope: the entire single-page entry-dispatch surface. Visitor mode: Operate.

- Audience & job: FreedomPort users on China/international networks picking the fastest entry. Their task: get to the fastest entry in seconds, no login.
- Action/task: run a round-trip HTTP latency test against cn and global endpoints, show both results, recommend the lower median (China on exact tie), auto-`location.replace` after a 2s countdown, or let the user pick manually / cancel / retest.
- Proof & content: real per-request latency samples (fetch first, image fallback, marked 兼容测速), a recommendation line, both endpoints' latencies, a 2s countdown bar. Debug params `?manual=1`, `?debug=1`, `?no-test=1` (dev only).
- Constraints: no login/register/billing; no data leaves the browser beyond the speed-test requests; target URLs come only from trusted config (no open redirect); bundle stays <35KB gzipped JS; WCAG AA + reduced-motion; 320px–1920px responsive.
- Chosen direction & memorable moment: "The Measurement Panel" world (see DESIGN.md). Memorable moment: both cards' mono latency numerals ticking in live, then the recommended card lifts with a 2s countdown before the visitor is carried to the fastest entry.
- Unresolved: actual `/ping` and `/speed-test.gif` endpoint headers on both domains (ops manual task, see README); production domain choice (independent domain recommended).
