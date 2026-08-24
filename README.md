# PriceRadar

PriceRadar is a static Lithuanian supermarket promotion comparison app. Scheduled TypeScript collectors normalize public Rimi and Maxima sources, group equivalent products conservatively, and publish a React/Vite site to GitHub Pages. Repository JSON is the data store and Git history is the audit trail; there is no database or runtime server.

## Architecture

`official store sources → collectors → data/current/{store}.json → grouping → deals.json → meaningful-change commit → GitHub Pages`

Raw store results remain separate from frontend-ready `deals.json`. `data/history` receives a dated snapshot only when promotional content changes. The build copies current JSON into the Pages artifact.

## Local setup

Node 22 is required.

```bash
npm ci
npm run dev
```

Commands include `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run collect`, `npm run audit:normalization`, and the individual `collect:rimi`, `collect:maxima`, and `collect:barbora` scripts. Add `-- --json` to the audit command to write the ignored `debug/normalization/report.json` artifact. Set `VITE_BASE_PATH=/` for root hosting; Pages uses `/priceradar/`.

## Collection safety

Requests use a descriptive user agent, 20-second timeout, exponential-backoff retries, and sequential low-rate collection. Zero results are rejected. Stores with at least 100 previous offers must retain 50%; smaller feeds must retain 25%. Partial failures preserve the last committed store file. Stable offer content is compared without timestamps, so timestamp-only runs create no commit.

## Verified live sources

- **Rimi:** active weekly leaflet viewers discovered from `rimi.lt/asortimentas/rimi-savaitinis-leidinys` are the authoritative promotion source. The collector parses every embedded leaflet page, filters publications by validity date, then enriches conservatively matched offers with e-shop IDs, images, product links, prices, and online availability. Unmatched leaflet offers and e-shop-only promotions remain in the union, with explicit coverage and rejection metrics.
- **Maxima physical stores:** the complete structured promotion catalogue behind `maxima.lt/pasiulymai`, with stable offer UUIDs and official `/webservices/marketing-offers/general/{id}` detail URLs. Only cards with a usable price and explicit promotion evidence are accepted. The weekly AČIŪ iPaper is parsed as a supplementary source; matching catalogue records win and only additional leaflet products are appended. **Barbora remains a separate Maxima-family online channel** and is never used to replace physical-store prices.

## Product matching

Aliases live in `scripts/normalization/aliases.ts`. Each canonical product can declare an English name, category, Lithuanian aliases, required keyword stems, and exclusions. Exact aliases win; keyword rules are conservative. Unmatched offers remain separate. Only compatible kg/l/piece prices are compared.

## English translation

Translation and product matching are deliberately separate. Canonical matches provide the authoritative English name and may group offers. Other names pass through the deterministic phrase and grocery vocabulary in `scripts/translation`; a successful translation changes display text only and never authorizes grouping. Low-confidence names retain the original Lithuanian text. Generated offers preserve `sourceName`, `displayName`, `displayNameSource`, and the optional canonical ID.

Weekly maintenance is: collect offers, run `npm run audit:normalization -- --json`, review untranslated names, unknown tokens, cross-store metrics, suspicious groups, and audit-only similarity suggestions, then add reusable phrases or vocabulary. One-off exact translations can be maintained centrally as translation-only aliases. Identical automatic English names never authorize grouping; add a canonical alias only when Lithuanian source text, preparation, brand sensitivity, and units provide deterministic evidence. No translation service, browser-time translation, or secret is required.

## Adding a supermarket

Extend the `Store` type, create an isolated collector returning `StoreData`, register it in `scripts/collect.ts`, add initial current JSON, and add focused sanitized fixtures. Store-specific publication parsing belongs under `scripts/collectors`.

## GitHub Pages

Select **GitHub Actions** as the Pages source in repository settings. If repository casing or name differs, update `VITE_BASE_PATH` in `deploy-pages.yml`. Hash routing keeps product-detail refreshes safe on project Pages.

## Limitations

Retailer markup and undocumented public viewer endpoints can change. Rimi availability and Maxima loyalty prices can differ by store. Maxima is live but not weekly-leaflet complete. Historical snapshots may contain stores that are no longer active; those files remain immutable audit records.

## Deal intelligence

`npm run build:data` and the normal collection workflow generate both enriched `deals.json` and the frontend-ready `best-deals.json`. The static frontend displays the evidence but keeps the numeric score internal. `npm run audit:deals` prints coverage, history depth, the top 20, and suspicious inputs.

The deterministic score is bounded from 0 to 100:

- validated advertised discount contributes up to 45 points (`discount × 1.125`);
- package or normalized unit saving contributes up to 20 points (`ln(1 + saving) × 6`), preventing tiny 50% savings and very expensive products from dominating;
- observed-history evidence contributes up to 30 points (30 for the lowest observed price, 22 within 5% of the observed low, or up to 15 when below the observed median);
- explicit discount and high-confidence source evidence contribute up to 5 data-quality points.

Advertised discount and historical value remain separate signals. A historical claim requires at least three compatible observations for the same stable store/platform/channel and source or canonical identity. Kg, litre, piece, and unnormalised package observations are never mixed. “Lowest observed” means lowest within PriceRadar’s immutable collected snapshots, not the lowest price elsewhere or forever. With fewer than three observations the offer is marked as limited history and receives no historical score or badge.

Loyalty promotions are eligible for ranking without a penalty and retain an explicit “Loyalty card” reason. The overall and per-store rankings include current physical Rimi and Maxima promotions only; Barbora remains a distinct optional online channel. The top ten conservatively allows at most three offers per English category for useful variety, without merging or deleting products.
