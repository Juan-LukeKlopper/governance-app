import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sourcesFile = readFileSync('src/lib/sources.ts', 'utf8');

test('sources include major cosmos governance chains requested by validators', () => {
  for (const chain of ['Stargaze', 'Secret Network', 'Akash', 'Osmosis', 'Solana', 'Polygon', 'XRP Ledger', 'TRON', 'Polkadot', 'Internet Computer', 'Monero', 'Filecoin']) {
    assert.equal(sourcesFile.includes(`'${chain}'`), true, `${chain} source should be present`);
  }
});

test('sources include a broad cosmos adapter set', () => {
  const cosmosMentions = (sourcesFile.match(/cosmosSource\(/g) || []).length;
  assert.equal(cosmosMentions >= 10, true);
});
