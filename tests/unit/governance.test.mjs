import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEnabledSources,
  getHistoricalProposals,
  getVisibleProposals,
  hasChainFilter,
  isOpenProposal,
  loadValidatorPreferences,
  saveValidatorPreferences
} from '../../src/lib/governance.js';

const baseProposal = {
  id: '1',
  title: 'Title',
  summary: 'Summary',
  chain: 'Cosmos Hub',
  ecosystem: 'Cosmos',
  url: 'https://example.com',
  source: 'example',
  status: 'active'
};

test('isOpenProposal allows active', () => {
  assert.equal(isOpenProposal({ ...baseProposal, status: 'active' }), true);
});

test('isOpenProposal allows pending', () => {
  assert.equal(isOpenProposal({ ...baseProposal, status: 'pending' }), true);
});

test('isOpenProposal excludes closed', () => {
  assert.equal(isOpenProposal({ ...baseProposal, status: 'closed' }), false);
});

test('hasChainFilter false for empty', () => {
  assert.equal(hasChainFilter([]), false);
});

test('hasChainFilter true for non-empty', () => {
  assert.equal(hasChainFilter(['Cosmos Hub']), true);
});

test('getEnabledSources returns all with no filter', () => {
  const sources = [{ chain: 'Cosmos Hub' }, { chain: 'Ethereum' }];
  assert.deepEqual(getEnabledSources(sources, []), sources);
});

test('getEnabledSources filters by chain', () => {
  const sources = [{ chain: 'Cosmos Hub' }, { chain: 'Ethereum' }];
  assert.deepEqual(getEnabledSources(sources, ['Ethereum']), [{ chain: 'Ethereum' }]);
});

test('getEnabledSources is case insensitive', () => {
  const sources = [{ chain: 'Cosmos Hub' }, { chain: 'Ethereum' }];
  assert.deepEqual(getEnabledSources(sources, ['ethereum']), [{ chain: 'Ethereum' }]);
});

test('getVisibleProposals excludes closed proposals by default', () => {
  const proposals = [
    { ...baseProposal, id: 'open', status: 'active' },
    { ...baseProposal, id: 'closed', status: 'closed' }
  ];

  const result = getVisibleProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: []
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['open']);
});

test('getVisibleProposals filters ecosystem', () => {
  const proposals = [
    { ...baseProposal, id: 'cosmos', ecosystem: 'Cosmos' },
    { ...baseProposal, id: 'eth', ecosystem: 'Ethereum', chain: 'Ethereum' }
  ];

  const result = getVisibleProposals(proposals, {
    ecosystemFilter: 'Ethereum',
    query: '',
    selectedChains: []
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['eth']);
});

test('getVisibleProposals filters selected chains', () => {
  const proposals = [
    { ...baseProposal, id: 'cosmos', chain: 'Cosmos Hub' },
    { ...baseProposal, id: 'eth', chain: 'Ethereum', ecosystem: 'Ethereum' }
  ];

  const result = getVisibleProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: ['Ethereum']
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['eth']);
});

test('getVisibleProposals filters query across fields', () => {
  const proposals = [
    { ...baseProposal, id: 'cosmos', title: 'Cosmos liquidity update' },
    { ...baseProposal, id: 'eth', chain: 'Ethereum', ecosystem: 'Ethereum', summary: 'ENS changes' }
  ];

  const result = getVisibleProposals(proposals, {
    ecosystemFilter: 'all',
    query: 'ens',
    selectedChains: []
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['eth']);
});

test('getVisibleProposals sorts by end date desc', () => {
  const proposals = [
    { ...baseProposal, id: 'older', endAt: '2020-01-01T00:00:00.000Z' },
    { ...baseProposal, id: 'newer', endAt: '2021-01-01T00:00:00.000Z' }
  ];

  const result = getVisibleProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: []
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['newer', 'older']);
});

test('loadValidatorPreferences returns defaults without storage', () => {
  assert.deepEqual(loadValidatorPreferences(undefined), { validatorName: '', selectedChains: [] });
});

test('loadValidatorPreferences parses storage values', () => {
  const map = new Map([
    ['validatorName', 'Validator One'],
    ['validatorChains', JSON.stringify(['Ethereum', 'Cosmos Hub'])]
  ]);
  const storage = {
    getItem(key) {
      return map.get(key) ?? null;
    }
  };

  assert.deepEqual(loadValidatorPreferences(storage), {
    validatorName: 'Validator One',
    selectedChains: ['Ethereum', 'Cosmos Hub']
  });
});

test('loadValidatorPreferences handles invalid json', () => {
  const storage = {
    getItem(key) {
      if (key === 'validatorName') return 'Validator One';
      return '{bad';
    }
  };

  assert.deepEqual(loadValidatorPreferences(storage), {
    validatorName: 'Validator One',
    selectedChains: []
  });
});

test('loadValidatorPreferences filters non-string values', () => {
  const storage = {
    getItem(key) {
      if (key === 'validatorName') return 'Validator One';
      return JSON.stringify(['Cosmos Hub', 123]);
    }
  };

  assert.deepEqual(loadValidatorPreferences(storage), {
    validatorName: 'Validator One',
    selectedChains: ['Cosmos Hub']
  });
});

test('saveValidatorPreferences stores both fields', () => {
  const map = new Map();
  const storage = {
    setItem(key, value) {
      map.set(key, value);
    }
  };

  saveValidatorPreferences(storage, 'Validator One', ['Ethereum']);

  assert.equal(map.get('validatorName'), 'Validator One');
  assert.equal(map.get('validatorChains'), JSON.stringify(['Ethereum']));
});

test('saveValidatorPreferences noops without storage', () => {
  assert.doesNotThrow(() => saveValidatorPreferences(undefined, 'A', ['B']));
});


test('getHistoricalProposals returns only closed proposals', () => {
  const proposals = [
    { ...baseProposal, id: 'open', status: 'active' },
    { ...baseProposal, id: 'closed', status: 'closed' }
  ];

  const result = getHistoricalProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: []
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['closed']);
});

test('getHistoricalProposals supports chain filtering', () => {
  const proposals = [
    { ...baseProposal, id: 'c1', status: 'closed', chain: 'Cosmos Hub' },
    { ...baseProposal, id: 'e1', status: 'closed', chain: 'Ethereum', ecosystem: 'Ethereum' }
  ];

  const result = getHistoricalProposals(proposals, {
    ecosystemFilter: 'all',
    query: '',
    selectedChains: ['Ethereum']
  });

  assert.deepEqual(result.map((proposal) => proposal.id), ['e1']);
});
