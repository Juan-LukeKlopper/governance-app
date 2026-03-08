# Governance Aggregator Light Client

A Svelte + Tailwind + TypeScript web app that aggregates governance proposals from public endpoints without a local database.

## What this build does

- Pulls proposals directly from open APIs in-browser (no backend indexer).
- Automatically excludes passed/closed proposals from the main feed.
- Lets validators set a validator name and chain scope; the dashboard only loads/shows those chains.
- Includes a historical proposals section (closed votes) for retrospective governance review.
- Includes live adapters for:
  - Cosmos Hub, Osmosis, Stargaze, Secret Network, Akash, Juno, Injective, Stride, Celestia, Sei, Kava (Cosmos LCD)
  - Ethereum, BNB Chain, Cardano, Algorand, Solana, Polygon (Snapshot spaces)
  - XRP Ledger, TRON, Polkadot, Internet Computer, Monero, Filecoin (tracked, with explicit no-proposal notes when no feed is available)
  - Tezos (TzKT)
  - Bitcoin (BIPs index)
- Shows exactly which top-chain targets are still uncovered so adapter work can be prioritized transparently.
- SEO and crawlability basics included (`robots.txt`, `sitemap.xml`, metadata).

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:8080`.

## Build

```bash
npm run build
npm run start
```

## Validation commands

```bash
npm run check
npm run lint
npm run format:check
npm run test
```

## Test layers

- Unit tests: `tests/unit`
- Integration tests: `tests/integration`
- Playwright specs: `tests/playwright`

## Notes

- CoinGecko is used as the chain reference source; when governance endpoints are unavailable, the app still lists the chain and clearly marks no active proposal feed.

- Data freshness depends on each public source endpoint.
- Some sources may occasionally fail due to endpoint-side CORS/rate limits.
- Chain support is adapter-driven in `src/lib/sources.ts`; uncovered top chains are surfaced in the UI so gaps are explicit.
- `lint:eslint`, `format`, and `test:e2e` require external packages (`eslint`, `prettier`, `@playwright/test`) when available in CI/dev environments.
