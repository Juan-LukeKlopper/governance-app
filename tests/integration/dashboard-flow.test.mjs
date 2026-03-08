import test from 'node:test';
import assert from 'node:assert/strict';

import { getEnabledSources, getVisibleProposals } from '../../src/lib/governance.js';

test('dashboard flow narrows sources and open proposals for validator chain scope', () => {
  const sources = [
    { key: 'cosmos', chain: 'Cosmos Hub' },
    { key: 'eth', chain: 'Ethereum' },
    { key: 'tezos', chain: 'Tezos' }
  ];

  const enabled = getEnabledSources(sources, ['Ethereum', 'Tezos']);
  assert.deepEqual(enabled.map((source) => source.key), ['eth', 'tezos']);

  const proposals = [
    { id: '1', title: 'Eth active', summary: 'A', chain: 'Ethereum', ecosystem: 'Ethereum', url: '#', source: 's', status: 'active' },
    { id: '2', title: 'Tezos pending', summary: 'B', chain: 'Tezos', ecosystem: 'Tezos', url: '#', source: 's', status: 'pending' },
    { id: '3', title: 'Tezos passed', summary: 'C', chain: 'Tezos', ecosystem: 'Tezos', url: '#', source: 's', status: 'closed' },
    { id: '4', title: 'Cosmos active', summary: 'D', chain: 'Cosmos Hub', ecosystem: 'Cosmos', url: '#', source: 's', status: 'active' }
  ];

  const visible = getVisibleProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: ['Ethereum', 'Tezos']
  });

  assert.deepEqual(visible.map((proposal) => proposal.id), ['1', '2']);
});

test('dashboard flow supports ecosystem plus text filtering', () => {
  const proposals = [
    { id: '1', title: 'Upgrade vote', summary: 'Cosmos inflation policy', chain: 'Cosmos Hub', ecosystem: 'Cosmos', url: '#', source: 's', status: 'active' },
    { id: '2', title: 'Treasury vote', summary: 'Ethereum grants', chain: 'Ethereum', ecosystem: 'Ethereum', url: '#', source: 's', status: 'active' }
  ];

  const visible = getVisibleProposals(proposals, {
    ecosystemFilter: 'Cosmos',
    query: 'inflation',
    selectedChains: []
  });

  assert.deepEqual(visible.map((proposal) => proposal.id), ['1']);
});
