# Panel: never show "0" on failure + connection health

Scope: client-side only, files under src/routes/panel.tsx and src/features/panel/. No DB, no new endpoints, no new libraries. Each step: show diff, wait for "ok".

## Step 1 — Three distinct query states
- New `src/features/panel/useQueryState.ts`: maps a TanStack query to `loading | empty | data | error | stale-error` (error with cached data).
- Apply to stats, customer list, customer detail:
  - loading → existing skeleton
  - empty → «لا توجد إدخالات»
  - error, no cache → card «تعذّر الاتصال» + «إعادة المحاولة» (calls `refetch`)
  - error, with cache → keep data + amber banner «آخر تحديث فشل — البيانات قد تكون قديمة»
- Replace remaining `?? 0` counters with «—» when undefined. Found still using `?? 0`:
  - panel.tsx L330 `total`, L490–491 (header props), L513–514 (sidebar), L669–673 (5 stat cards), L683 (mobile summary line).

## Step 2 — Health chip (top bar)
- Uses `useIsFetching`, `useIsMutating`, and query cache subscription. No polling.
- Hidden when healthy; amber «الاتصال بطيء…» if any panel request runs > 3s; red «تعذّر الاتصال» + retry (refetch errored panel queries) when any is in error.

## Step 3 — Error boundary + auto-alert
- `PanelErrorBoundary` wrapping the panel page: message + «إعادة التحميل» button, no blank screen.
- Counter of consecutive panel query failures (via query cache events); at 3 → 440Hz/300ms tone (respects existing mute-when-hidden rule) + browser notification (only if permission already granted / requested once). Reset on any success.

## Step 4 — Diagnostic modal «تشخيص الاتصال»
- Entry in mobile overflow menu + desktop top bar. Runs 4 timed checks, each PASS/FAIL + ms, with «إعادة الفحص».
  1. Entry count — see open question below
  2. panelStats()
  3. panelListCustomers (1 row)
  4. Realtime channel subscribe (subscribe, wait for SUBSCRIBED, unsubscribe; 5s timeout)

## Open points (need your answer)
1. Check 1 «COUNT(*) client_submissions»: the browser cannot read that table directly (it is locked, by design), and you said no new endpoints. Proposal: check 1 = time `panelStats()` result's total entries field, labelled «عدد الإدخالات». Check 2 then measures full stats call separately. OK?
2. 440Hz is already the «logout_confirmed» sound. Keep 440Hz for the failure alert anyway, or use a distinct tone (e.g. 330Hz)?

## Verify (after Step 4)
TS clean; offline → error card, no "0", retry works; slow network → amber chip after 3s; modal 4× PASS when healthy; forced error → boundary; diff limited to panel files.
