# PriceRadar

PriceRadar is a static Lithuanian supermarket promotion comparison app.

It collects publicly available promotions from supported supermarkets, normalizes product data, conservatively matches equivalent products, tracks historical prices, and highlights strong deals.

Currently supported:

* Rimi
* Maxima
* Barbora as a separate online Maxima-family channel

The app is built with **TypeScript, React, and Vite** and deployed through **GitHub Pages**. There is no database or runtime backend. JSON files store the current data, while Git history provides the audit trail.

## How it works

```text
Retailer sources
→ collectors
→ data/current/
→ normalization & grouping
→ deals.json / best-deals.json
→ GitHub Pages
```

Historical snapshots are only created when promotional data meaningfully changes.

## Development

Requires **Node.js 22**.

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run collect
npm run audit:normalization
npm run audit:deals
```

Individual collectors:

```bash
npm run collect:rimi
npm run collect:maxima
npm run collect:barbora
```

## Product matching

Product matching is intentionally conservative.

Translation does **not** automatically mean two products are considered equivalent. Products are grouped only when aliases, keywords, units, brand information, and other source evidence provide sufficient confidence.

Kg, litre, piece, and incompatible package prices are never compared directly.

## Deal ranking

Best Deals uses a deterministic 0–100 internal score based on:

* advertised discount;
* actual/unit savings;
* historical price evidence;
* source-data quality.

The numeric score is not shown to users.

Historical badges require at least **3 compatible PriceRadar observations**. “Lowest observed” only means the lowest price recorded in PriceRadar's own collected history.

## GitHub Pages

Configure:

**Settings → Pages → Source → GitHub Actions**

Project hosting currently uses:

```text
/priceradar/
```

Use `VITE_BASE_PATH=/` for root hosting.

## Disclaimer

PriceRadar is an independent project and is **not affiliated with, endorsed by, or sponsored by Rimi, Maxima, Barbora, or their parent companies**.

Retailer names, trademarks, logos, product names, and images belong to their respective owners and are used only to identify publicly advertised products and promotions.

PriceRadar uses publicly accessible retailer information for informational and comparison purposes. Prices, availability, promotion dates, loyalty requirements, product details, and store-specific conditions may change or contain errors.

**Always verify the final price and promotion conditions directly with the retailer before purchasing.**

PriceRadar does not guarantee that:

* every promotion is included;
* collected information is complete or error-free;
* a promotion is available at every location;
* a displayed price is still active.

“Lowest observed” and similar historical statements refer only to data collected by PriceRadar and must not be interpreted as an all-time or market-wide lowest price.

Historical retailer data is retained for auditing and comparison purposes. The presence of retailer content in the repository does not imply ownership, partnership, or endorsement.

Retailers may change or restrict their public websites or data sources at any time, which may temporarily affect collection accuracy or availability.
