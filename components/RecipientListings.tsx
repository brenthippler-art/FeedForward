'use client';

import { useEffect, useState } from 'react';
import type { RecipientListing } from '@/lib/listings';
import AvailableCard from './AvailableCard';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listings: RecipientListing[] };

export default function RecipientListings() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/listings', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load available food.');
        if (!Array.isArray(data)) throw new Error('The server returned an unexpected response.');
        if (!controller.signal.aborted) setState({ status: 'ready', listings: data });
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load available food.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function reload() {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  return (
    <section aria-labelledby="available-heading" className="flex flex-col gap-4" aria-busy={state.status === 'loading'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="available-heading" className="font-display text-2xl font-semibold">Available food</h2>
        <button type="button" onClick={reload} disabled={state.status === 'loading'}
          className="min-h-11 rounded-lg border border-brand px-4 font-bold text-brand disabled:opacity-50">
          {state.status === 'error' ? 'Try again' : 'Refresh'}
        </button>
      </div>
      {state.status === 'loading' && <p role="status">Loading available food…</p>}
      {state.status === 'error' && <p role="alert" className="rounded-xl border border-warn-line bg-warn-tint p-4 text-warn-text">{state.message}</p>}
      {state.status === 'ready' && (state.listings.length === 0 ? (
        <p role="status" className="rounded-xl border border-line bg-surface p-6">No available food matches your organization’s accepted tiers and categories right now.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {state.listings.map((listing) => <li key={listing.id}><AvailableCard listing={listing} /></li>)}
        </ul>
      ))}
    </section>
  );
}
