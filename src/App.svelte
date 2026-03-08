<script lang="ts">
  import { onMount } from 'svelte';
  import ModeSwitcher from './ModeSwitcher.svelte';
  import Tailwindcss from './Tailwindcss.svelte';
  import { chainSources, connectedCoverage, topChainCoverage, uncoveredTopChains } from './lib/sources';
  import type { GovernanceProposal } from './lib/types';
  import {
    getHistoricalProposals,
    getVisibleProposals,
    loadValidatorPreferences,
    saveValidatorPreferences
  } from './lib/governance.js';

  interface SourceState {
    key: string;
    chain: string;
    ecosystem: string;
    source: string;
    infoUrl: string;
    note?: string;
    loading: boolean;
    error?: string;
    count: number;
  }

  let proposals: GovernanceProposal[] = [];
  let filter = 'all';
  let query = '';
  let loading = true;
  let refreshedAt = '';
  let validatorName = '';
  let selectedChains: string[] = [];
  let historicalExpanded = false;

  const states: SourceState[] = chainSources.map((source) => ({
    key: source.key,
    chain: source.chain,
    ecosystem: source.ecosystem,
    source: source.source,
    infoUrl: source.infoUrl,
    note: source.note,
    loading: true,
    count: 0
  }));

  function toggleChain(chain: string) {
    selectedChains = selectedChains.includes(chain)
      ? selectedChains.filter((value) => value !== chain)
      : [...selectedChains, chain];

    saveValidatorPreferences(window.localStorage, validatorName, selectedChains);
    loadAll();
  }

  function onValidatorNameInput() {
    saveValidatorPreferences(window.localStorage, validatorName, selectedChains);
  }

  async function loadAll() {
    loading = true;
    proposals = [];

    states.forEach((state) => {
      state.loading = false;
      state.count = 0;
      state.error = '';
    });

    const enabledSources = selectedChains.length === 0
      ? chainSources
      : chainSources.filter((source) => selectedChains.includes(source.chain));

    await Promise.all(
      enabledSources.map(async (source) => {
        const state = states.find((value) => value.key === source.key);
        if (!state) {
          return;
        }

        state.loading = true;
        try {
          const fetched = await source.fetchProposals();
          proposals = [...proposals, ...fetched];
          state.count = fetched.length;
          state.error = '';
        } catch (error) {
          state.error = error instanceof Error ? error.message : 'Unknown fetch error';
        } finally {
          state.loading = false;
        }
      })
    );

    refreshedAt = new Date().toLocaleString();
    loading = false;
  }

  $: ecosystems = ['all', ...new Set(proposals.map((proposal) => proposal.ecosystem))];
  $: visibleProposals = getVisibleProposals(proposals, {
    ecosystemFilter: filter,
    query,
    selectedChains
  });
  $: historicalProposals = getHistoricalProposals(proposals, {
    ecosystemFilter: filter,
    query,
    selectedChains
  });
  $: coveragePercent = Math.round((connectedCoverage.length / topChainCoverage.length) * 100);
  $: uncoveredPreview = uncoveredTopChains.slice(0, 18);

  onMount(() => {
    const preferences = loadValidatorPreferences(window.localStorage);
    validatorName = preferences.validatorName;
    selectedChains = preferences.selectedChains;
    loadAll();
  });
</script>

<svelte:head>
  <title>Governance Light Client | Multi-chain validator governance dashboard</title>
  <meta name="description" content="Track open governance proposals across multiple ecosystems from public endpoints without running a local database." />
  <meta name="robots" content="index,follow" />
  <meta property="og:title" content="Governance Light Client" />
  <meta property="og:description" content="Validator-focused governance proposal dashboard with open endpoint adapters." />
  <meta property="og:type" content="website" />
</svelte:head>

<Tailwindcss />
<ModeSwitcher />

<main id="app-main" class="mx-auto max-w-6xl p-6 md:p-10" aria-label="Governance dashboard">
  <header class="mb-8 rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
    <h1 class="text-3xl font-semibold text-slate-900 dark:text-white">Web3 Governance Light Client</h1>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
      Pulls only open governance proposals directly from public endpoints (no local DB, no backend indexing).
    </p>

    <form class="mt-4 grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700" aria-label="Validator profile">
      <div>
        <label for="validator-name" class="block text-sm font-medium">Validator name</label>
        <input
          id="validator-name"
          bind:value={validatorName}
          on:input={onValidatorNameInput}
          class="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="e.g. Interchain Validator"
          autocomplete="organization"
        />
      </div>
      <fieldset>
        <legend class="text-sm font-medium">Chains you validate on</legend>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {#each chainSources as source}
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedChains.includes(source.chain)}
                on:change={() => toggleChain(source.chain)}
              />
              <span>{source.chain}</span>
            </label>
          {/each}
        </div>
      </fieldset>
    </form>

    <div class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div class="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">Connected chains with live adapters: <strong>{connectedCoverage.length}</strong></div>
      <div class="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">Top-chain target list: <strong>{topChainCoverage.length}</strong></div>
      <div class="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">Current chain coverage: <strong>{coveragePercent}%</strong></div>
    </div>
    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      The uncovered chains below are next in queue for adapter onboarding from public explorer/foundation APIs.
    </p>
    <div class="mt-2 flex flex-wrap gap-2">
      {#each uncoveredPreview as chain}
        <span class="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">{chain}</span>
      {/each}
      {#if uncoveredTopChains.length > uncoveredPreview.length}
        <span class="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">+{uncoveredTopChains.length - uncoveredPreview.length} more</span>
      {/if}
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <button type="button" class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500" on:click={loadAll}>Refresh now</button>
      {#if refreshedAt}
        <span class="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300" aria-live="polite">Last refresh: {refreshedAt}</span>
      {/if}
      {#if validatorName}
        <span class="rounded bg-emerald-100 px-3 py-2 text-xs text-emerald-800">Viewing for validator: {validatorName}</span>
      {/if}
    </div>
  </header>

  <section class="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Source status">
    {#each states as state}
      <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
        <h2 class="font-medium text-slate-900 dark:text-white">{state.chain}</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">{state.ecosystem} • {state.source}</p>
        <p class="mt-2 text-sm">{state.count} proposals loaded</p>
        {#if state.loading}
          <p class="text-xs text-amber-600">Loading…</p>
        {:else if state.error}
          <p class="text-xs text-red-600">{state.error}</p>
        {:else if state.count === 0}
          <p class="text-xs text-slate-500 dark:text-slate-400">{state.note || 'No proposals available from this source right now.'}</p>
        {/if}
        <a class="mt-2 inline-block text-xs text-indigo-600 underline" target="_blank" rel="noreferrer" href={state.infoUrl}>Source</a>
      </article>
    {/each}
  </section>

  <section class="mb-4 flex flex-wrap gap-3" aria-label="Filters">
    <label class="sr-only" for="ecosystem-filter">Ecosystem filter</label>
    <select id="ecosystem-filter" bind:value={filter} class="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
      {#each ecosystems as ecosystem}
        <option value={ecosystem}>{ecosystem === 'all' ? 'All ecosystems' : ecosystem}</option>
      {/each}
    </select>
    <label class="sr-only" for="proposal-search">Search proposals</label>
    <input id="proposal-search" bind:value={query} class="min-w-[280px] flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Search by title, summary, or chain" />
  </section>

  {#if loading}
    <p class="text-sm text-slate-600 dark:text-slate-300">Loading governance feeds…</p>
  {:else if visibleProposals.length === 0}
    <p class="text-sm text-slate-600 dark:text-slate-300">No open proposals matched your filters.</p>
  {:else}
    <section class="grid gap-3" aria-label="Open proposals list">
      {#each visibleProposals as proposal}
        <a class="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900" target="_blank" rel="noreferrer" href={proposal.url}>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-medium text-slate-900 dark:text-white">{proposal.title}</h3>
            <span class="rounded px-2 py-1 text-xs uppercase {proposal.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">{proposal.status}</span>
          </div>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{proposal.summary}</p>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{proposal.ecosystem} • {proposal.chain} • {proposal.source}</p>
        </a>
      {/each}
    </section>
  {/if}

  <section class="mt-8" aria-label="Historical proposals">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Historical proposals</h2>
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
        on:click={() => (historicalExpanded = !historicalExpanded)}
      >
        {historicalExpanded ? 'Hide history' : `Show history (${historicalProposals.length})`}
      </button>
    </div>

    {#if historicalExpanded}
      {#if historicalProposals.length === 0}
        <p class="text-sm text-slate-600 dark:text-slate-300">No historical proposals matched your filters.</p>
      {:else}
        <div class="grid gap-3">
          {#each historicalProposals.slice(0, 30) as proposal}
            <a class="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" target="_blank" rel="noreferrer" href={proposal.url}>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-medium text-slate-900 dark:text-white">{proposal.title}</h3>
                <span class="rounded bg-slate-200 px-2 py-1 text-xs uppercase text-slate-700">closed</span>
              </div>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{proposal.summary}</p>
              <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{proposal.ecosystem} • {proposal.chain} • {proposal.source}</p>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</main>
