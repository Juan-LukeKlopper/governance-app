/**
 * @typedef {'active'|'pending'|'closed'} GovernanceStatus
 * @typedef {{
 *  id: string;
 *  title: string;
 *  summary: string;
 *  chain: string;
 *  ecosystem: string;
 *  url: string;
 *  status: GovernanceStatus;
 *  startAt?: string;
 *  endAt?: string;
 *  source: string;
 * }} GovernanceProposal
 */

export const VALIDATOR_NAME_KEY = 'validatorName';
export const VALIDATOR_CHAINS_KEY = 'validatorChains';

/** @param {GovernanceProposal} proposal */
export function isOpenProposal(proposal) {
  return proposal.status === 'active' || proposal.status === 'pending';
}

/** @param {GovernanceProposal} proposal */
export function isHistoricalProposal(proposal) {
  return proposal.status === 'closed';
}

/** @param {string[]} selectedChains */
export function hasChainFilter(selectedChains) {
  return selectedChains.length > 0;
}

/**
 * @param {Array<{chain:string}>} sources
 * @param {string[]} selectedChains
 */
export function getEnabledSources(sources, selectedChains) {
  if (!hasChainFilter(selectedChains)) {
    return sources;
  }

  const allowed = new Set(selectedChains.map((chain) => chain.toLowerCase()));
  return sources.filter((source) => allowed.has(source.chain.toLowerCase()));
}

/**
 * @param {GovernanceProposal[]} proposals
 * @param {{
 *  ecosystemFilter: string;
 *  query: string;
 *  selectedChains: string[];
 * }} criteria
 */
function filterByCriteria(proposals, criteria) {
  const normalizedQuery = criteria.query.trim().toLowerCase();
  const selected = new Set(criteria.selectedChains.map((chain) => chain.toLowerCase()));

  return proposals
    .filter((proposal) => (criteria.ecosystemFilter === 'all' ? true : proposal.ecosystem === criteria.ecosystemFilter))
    .filter((proposal) => (selected.size === 0 ? true : selected.has(proposal.chain.toLowerCase())))
    .filter((proposal) => {
      if (!normalizedQuery) {
        return true;
      }
      return [proposal.title, proposal.summary, proposal.chain, proposal.ecosystem]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => (b.endAt || '').localeCompare(a.endAt || ''));
}

/**
 * @param {GovernanceProposal[]} proposals
 * @param {{
 *  ecosystemFilter: string;
 *  query: string;
 *  selectedChains: string[];
 * }} criteria
 */
export function getVisibleProposals(proposals, criteria) {
  return filterByCriteria(proposals.filter((proposal) => isOpenProposal(proposal)), criteria);
}

/**
 * @param {GovernanceProposal[]} proposals
 * @param {{
 *  ecosystemFilter: string;
 *  query: string;
 *  selectedChains: string[];
 * }} criteria
 */
export function getHistoricalProposals(proposals, criteria) {
  return filterByCriteria(proposals.filter((proposal) => isHistoricalProposal(proposal)), criteria);
}

/** @param {Storage | undefined} storage */
export function loadValidatorPreferences(storage) {
  if (!storage) {
    return { validatorName: '', selectedChains: [] };
  }

  const validatorName = storage.getItem(VALIDATOR_NAME_KEY) || '';
  const selectedChainsRaw = storage.getItem(VALIDATOR_CHAINS_KEY);

  if (!selectedChainsRaw) {
    return { validatorName, selectedChains: [] };
  }

  try {
    const selectedChains = JSON.parse(selectedChainsRaw);
    if (!Array.isArray(selectedChains)) {
      return { validatorName, selectedChains: [] };
    }

    return {
      validatorName,
      selectedChains: selectedChains.filter((value) => typeof value === 'string')
    };
  } catch {
    return { validatorName, selectedChains: [] };
  }
}

/** @param {Storage | undefined} storage @param {string} validatorName @param {string[]} selectedChains */
export function saveValidatorPreferences(storage, validatorName, selectedChains) {
  if (!storage) {
    return;
  }

  storage.setItem(VALIDATOR_NAME_KEY, validatorName);
  storage.setItem(VALIDATOR_CHAINS_KEY, JSON.stringify(selectedChains));
}
