# Hidden pages: wording backup, 14 Nov 2026

Saved before /guitar-prices, /travel_voucher and /terms-and-conditions-voucher
became editable in the admin.

- `wording-from-code-997925b.json`: every word, price, link and picture
  path, exported from `src/content/guitar-prices.ts` and
  `src/content/voucher-program.ts` at commit 997925b (main on 2026-11-14).
- `live-*.html`: the three pages as charityworks.net served them on the
  same day.

On 2026-11-14 a script checked that every string in the JSON appears on the
matching live page. None were missing (guitar-prices 95, travel_voucher 50,
terms-and-conditions-voucher 23), so the code and the live site matched.

## How to restore

- **One edit:** Admin → Page text → the page → History → Restore. The first
  version in the history is this wording.
- **Back to this wording entirely:** delete the page's row from the `pages`
  table (slug `guitar-prices`, `travel-voucher` or `voucher-terms`) and
  redeploy, or wait for the next save to any of them. With no row, each page
  shows the wording in the code files, which is this wording.
