'use client';

import { useState } from 'react';
import type { MatchResult } from '@/lib/matches';
import MatchCard from './MatchCard';

export default function MatchList({ matches }: { matches: MatchResult[] }) {
  const [openId, setOpenId] = useState<number | null>(matches[0]?.recipient.id ?? null);
  if (matches.length === 0) return <p className="rounded-2xl border border-line bg-surface p-6">No recipients match this listing’s tier and category right now.</p>;
  return <div className="flex flex-col gap-4">
    <p className="text-muted">Contact a suggested recipient to coordinate. Recipients reserve food from their own account; viewing these suggestions does not create a reservation. Pickup availability is checked when they claim.</p>
    {matches.map((match) => <MatchCard key={match.recipient.id} match={match}
      expanded={openId === match.recipient.id}
      onToggle={() => setOpenId(openId === match.recipient.id ? null : match.recipient.id)} />)}
  </div>;
}
