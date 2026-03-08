import type { ChainSource, GovernanceProposal, GovernanceStatus } from './types';

const snapshotGraphQl = 'https://hub.snapshot.org/graphql';

function inferSnapshotStatus(start: number, end: number): GovernanceStatus {
  const now = Math.floor(Date.now() / 1000);
  if (now < start) {
    return 'pending';
  }
  if (now <= end) {
    return 'active';
  }
  return 'closed';
}

async function fetchSnapshotSpaceProposals(space: string, chain: string, ecosystem: string): Promise<GovernanceProposal[]> {
  const query = `query Proposals($space: String!) {
    proposals(
      first: 12,
      where: { space_in: [$space] },
      orderBy: "created",
      orderDirection: desc
    ) {
      id
      title
      body
      start
      end
      discussion
      state
    }
  }`;

  const response = await fetch(snapshotGraphQl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { space }
    })
  });

  if (!response.ok) {
    throw new Error(`Snapshot request failed (${response.status})`);
  }

  const payload = await response.json();
  const proposals = payload?.data?.proposals ?? [];

  return proposals.map((proposal: any) => ({
    id: proposal.id,
    title: proposal.title,
    summary: proposal.body ? String(proposal.body).slice(0, 180) : 'Community governance proposal on Snapshot.',
    chain,
    ecosystem,
    url: proposal.discussion || `https://snapshot.org/#/${space}/proposal/${proposal.id}`,
    status: inferSnapshotStatus(proposal.start, proposal.end),
    startAt: new Date(proposal.start * 1000).toISOString(),
    endAt: new Date(proposal.end * 1000).toISOString(),
    source: 'snapshot.org'
  }));
}

async function fetchCosmosGov(endpoint: string, chain: string): Promise<GovernanceProposal[]> {
  const response = await fetch(`${endpoint}/cosmos/gov/v1/proposals?pagination.limit=12`);
  if (!response.ok) {
    throw new Error(`Cosmos request failed (${response.status})`);
  }

  const payload = await response.json();
  const proposals = payload?.proposals ?? [];

  return proposals.map((proposal: any) => {
    const id = String(proposal.id || proposal.proposal_id || 'unknown');
    const title = proposal?.metadata?.title || proposal?.title || `Proposal ${id}`;
    const summary = proposal?.metadata?.summary || proposal?.summary || 'On-chain governance proposal.';
    const statusRaw = String(proposal.status || '').toLowerCase();
    const status: GovernanceStatus = statusRaw.includes('voting')
      ? 'active'
      : statusRaw.includes('deposit')
      ? 'pending'
      : 'closed';

    return {
      id,
      title,
      summary,
      chain,
      ecosystem: 'Cosmos',
      url: `https://www.mintscan.io/${chain.toLowerCase()}/proposals/${id}`,
      status,
      startAt: proposal.voting_start_time,
      endAt: proposal.voting_end_time,
      source: endpoint.replace('https://', '')
    };
  });
}

async function fetchTezosProposals(): Promise<GovernanceProposal[]> {
  const response = await fetch('https://api.tzkt.io/v1/voting/proposals?limit=12&sort.desc=id');
  if (!response.ok) {
    throw new Error(`Tezos request failed (${response.status})`);
  }

  const proposals = await response.json();
  return proposals.map((proposal: any) => ({
    id: String(proposal.id),
    title: `Tezos protocol proposal ${proposal.hash}`,
    summary: `Protocol ${proposal.code} with ${proposal.rolls} rolls backing.`,
    chain: 'Tezos',
    ecosystem: 'Tezos',
    url: `https://tzkt.io/${proposal.hash}`,
    status: 'closed',
    source: 'api.tzkt.io'
  }));
}

async function fetchBipProposals(): Promise<GovernanceProposal[]> {
  const response = await fetch('https://raw.githubusercontent.com/bitcoin/bips/master/README.mediawiki');
  if (!response.ok) {
    throw new Error(`BIP index request failed (${response.status})`);
  }

  const text = await response.text();
  const lines = text
    .split('\n')
    .filter((line) => line.startsWith('| [[bip-'))
    .slice(0, 12);

  return lines.map((line) => {
    const bipMatch = line.match(/\[\[bip-(\d+)\|BIP-\d+\]\]/);
    const titleParts = line.split('||').map((part) => part.trim());
    const bipId = bipMatch ? bipMatch[1] : 'unknown';

    return {
      id: bipId,
      title: titleParts[1] || `BIP-${bipId}`,
      summary: `Status: ${titleParts[2] || 'unknown'} • Type: ${titleParts[3] || 'N/A'}`,
      chain: 'Bitcoin',
      ecosystem: 'Bitcoin',
      url: `https://github.com/bitcoin/bips/blob/master/bip-${bipId.padStart(4, '0')}.mediawiki`,
      status: 'closed' as GovernanceStatus,
      source: 'bitcoin/bips'
    };
  });
}


function cosmosSource(
  key: string,
  chain: string,
  endpoint: string,
  ecosystem = 'Cosmos',
  infoUrl = `https://www.mintscan.io/${key}`
): ChainSource {
  return {
    key,
    chain,
    ecosystem,
    source: endpoint.replace('https://', ''),
    infoUrl,
    fetchProposals: () => fetchCosmosGov(endpoint, chain)
  };
}


function noProposalSource(
  key: string,
  chain: string,
  ecosystem: string,
  infoUrl: string,
  note: string
): ChainSource {
  return {
    key,
    chain,
    ecosystem,
    source: 'coingecko-reference',
    infoUrl,
    note,
    fetchProposals: async () => []
  };
}

export const chainSources: ChainSource[] = [
  cosmosSource('cosmoshub', 'Cosmos Hub', 'https://lcd-cosmoshub.keplr.app', 'Cosmos', 'https://www.mintscan.io/cosmos'),
  cosmosSource('osmosis', 'Osmosis', 'https://lcd-osmosis.keplr.app', 'Cosmos', 'https://www.mintscan.io/osmosis'),
  cosmosSource('stargaze', 'Stargaze', 'https://lcd-stargaze.keplr.app', 'Cosmos', 'https://www.mintscan.io/stargaze'),
  cosmosSource('secret', 'Secret Network', 'https://lcd-secret.keplr.app', 'Cosmos', 'https://www.mintscan.io/secret'),
  cosmosSource('akash', 'Akash', 'https://lcd-akash.keplr.app', 'Cosmos', 'https://www.mintscan.io/akash'),
  cosmosSource('juno', 'Juno', 'https://lcd-juno.keplr.app', 'Cosmos', 'https://www.mintscan.io/juno'),
  cosmosSource('injective', 'Injective', 'https://lcd-injective.keplr.app', 'Cosmos', 'https://www.mintscan.io/injective'),
  cosmosSource('stride', 'Stride', 'https://lcd-stride.keplr.app', 'Cosmos', 'https://www.mintscan.io/stride'),
  cosmosSource('celestia', 'Celestia', 'https://lcd-celestia.keplr.app', 'Cosmos', 'https://www.mintscan.io/celestia'),
  cosmosSource('sei', 'Sei', 'https://lcd-sei.keplr.app', 'Cosmos', 'https://www.mintscan.io/sei'),
  cosmosSource('kava', 'Kava', 'https://lcd-kava.keplr.app', 'Cosmos', 'https://www.mintscan.io/kava'),
  noProposalSource('xrp', 'XRP Ledger', 'XRP', 'https://www.coingecko.com/en/coins/xrp', 'No on-chain proposal feed is exposed by a public governance endpoint in this client yet.'),
  noProposalSource('tron', 'TRON', 'TRON', 'https://www.coingecko.com/en/coins/tron', 'No open governance proposal endpoint is configured in this client yet.'),
  noProposalSource('polkadot', 'Polkadot', 'Polkadot', 'https://www.coingecko.com/en/coins/polkadot', 'Governance exists, but no browser-safe open endpoint is configured here yet.'),
  noProposalSource('icp', 'Internet Computer', 'Internet Computer', 'https://www.coingecko.com/en/coins/internet-computer', 'No open governance proposal endpoint is configured in this client yet.'),
  noProposalSource('monero', 'Monero', 'Monero', 'https://www.coingecko.com/en/coins/monero', 'No on-chain proposal feed is exposed by a public governance endpoint in this client yet.'),
  noProposalSource('filecoin', 'Filecoin', 'Filecoin', 'https://www.coingecko.com/en/coins/filecoin', 'No open governance proposal endpoint is configured in this client yet.'),
  {
    key: 'ethereum',
    chain: 'Ethereum',
    ecosystem: 'Ethereum',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/ens.eth',
    fetchProposals: () => fetchSnapshotSpaceProposals('ens.eth', 'Ethereum', 'Ethereum')
  },
  {
    key: 'bsc',
    chain: 'BNB Chain',
    ecosystem: 'Binance',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/binance.eth',
    fetchProposals: () => fetchSnapshotSpaceProposals('binance.eth', 'BNB Chain', 'Binance')
  },
  {
    key: 'cardano',
    chain: 'Cardano',
    ecosystem: 'Cardano',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/cardano-summit.eth',
    fetchProposals: () => fetchSnapshotSpaceProposals('cardano-summit.eth', 'Cardano', 'Cardano')
  },
  {
    key: 'algorand',
    chain: 'Algorand',
    ecosystem: 'Algorand',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/algorand.foundation',
    fetchProposals: () => fetchSnapshotSpaceProposals('algorand.foundation', 'Algorand', 'Algorand')
  },
  {
    key: 'solana',
    chain: 'Solana',
    ecosystem: 'Solana',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/solana',
    fetchProposals: () => fetchSnapshotSpaceProposals('solana', 'Solana', 'Solana')
  },
  {
    key: 'polygon',
    chain: 'Polygon',
    ecosystem: 'Polygon',
    source: 'hub.snapshot.org',
    infoUrl: 'https://snapshot.org/#/polygon',
    fetchProposals: () => fetchSnapshotSpaceProposals('polygon', 'Polygon', 'Polygon')
  },
  {
    key: 'tezos',
    chain: 'Tezos',
    ecosystem: 'Tezos',
    source: 'api.tzkt.io',
    infoUrl: 'https://tzkt.io',
    fetchProposals: fetchTezosProposals
  },
  {
    key: 'bitcoin',
    chain: 'Bitcoin',
    ecosystem: 'Bitcoin',
    source: 'bitcoin/bips',
    infoUrl: 'https://github.com/bitcoin/bips',
    fetchProposals: fetchBipProposals
  }
];

export const topChainCoverage = [
  'Ethereum', 'Bitcoin', 'BNB Chain', 'Solana', 'XRP Ledger', 'Cardano', 'Dogecoin', 'TRON',
  'Polkadot', 'Polygon', 'Avalanche', 'Chainlink', 'Ton', 'Shiba Inu', 'Litecoin', 'Bitcoin Cash',
  'Uniswap', 'Cosmos Hub', 'Near', 'Aptos', 'Internet Computer', 'Algorand', 'VeChain', 'Filecoin',
  'Tezos', 'Stellar', 'Monero', 'Arbitrum', 'Optimism', 'Sui', 'Astar', 'Sei', 'Injective', 'Osmosis',
  'Celestia', 'Kava', 'Cronos', 'Kaspa', 'Render', 'Maker', 'Lido', 'Pepe', 'Bonk', 'Mantle',
  'Immutable', 'Stacks', 'Hedera', 'Flow', 'EOS', 'Fantom', 'The Graph', 'THORChain', 'Curve',
  'Aave', 'Compound', 'Rocket Pool', 'Conflux', 'Gnosis', 'Zilliqa', 'IOTA', 'Neo', 'Kusama',
  'Waves', 'Qtum', 'Terra', 'Terra Classic', 'Axelar', 'Celo', 'MultiversX', 'Chiliz', 'Kadena',
  'Arweave', 'Mina', 'Bittensor', 'Helium', 'Loopring', 'dYdX', 'Jito', 'Blur', 'Pendle', 'Pendulum',
  'Ronin', 'Klaytn', 'Beam', 'Core', 'Nexo', 'Safe', 'ORDI', 'SATS', 'SSV', 'Akash', 'Secret',
  'Juno', 'Stride', 'Frax', 'eCash', 'Oasis', 'Wormhole', 'Nervos', 'Decred', 'Horizen', 'ICON'
];


export const connectedCoverage = Array.from(new Set(chainSources.map((source) => source.chain))).sort();

export const uncoveredTopChains = topChainCoverage.filter(
  (chain) => !connectedCoverage.some((connected) => connected.toLowerCase() == chain.toLowerCase())
);
