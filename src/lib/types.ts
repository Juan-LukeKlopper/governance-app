export type GovernanceStatus = 'active' | 'pending' | 'closed';

export interface GovernanceProposal {
  id: string;
  title: string;
  summary: string;
  chain: string;
  ecosystem: string;
  url: string;
  status: GovernanceStatus;
  startAt?: string;
  endAt?: string;
  source: string;
}

export interface ChainSource {
  key: string;
  chain: string;
  ecosystem: string;
  source: string;
  infoUrl: string;
  fetchProposals: () => Promise<GovernanceProposal[]>;
  note?: string;
}
