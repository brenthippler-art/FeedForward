'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RecipientMatch } from '@/types';
import MatchCard from './MatchCard';

export default function MatchList({ matches }: { matches: RecipientMatch[] }) {
  const [openId, setOpenId] = useState<number | null>(matches[0]?.recipient.id ?? null);
  const [chosenId, setChosenId] = useState<number | null>(null);

  const chosen = matches.find((m) => m.recipient.id === chosenId);

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-semibold">No recipients match this listing right now.</p>
        <p className="mt-1 text-muted">Consider changing it to Tier 3 so a compost site can take it.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {chosen && (
        <div role="status" className="rounded-2xl border-2 border-brand bg-verified-tint p-5">
          <p className="font-bold">
            {chosen.recipient.name} has been chosen. They&apos;ll confirm a pickup time.
          </p>
          <Link href="/dashboard" className="mt-1 inline-block font-semibold text-brand underline">
            View impact dashboard
          </Link>
        </div>
      )}

      {matches.map((match) => {
        const id = match.recipient.id;
        return (
          <MatchCard
            key={id}
            match={match}
            expanded={openId === id}
            chosen={chosenId === id}
            onToggle={() => setOpenId(openId === id ? null : id)}
            onChoose={() => {
              // TODO: POST /api/claims when the backend route is ready
              setChosenId(id);
            }}
          />
        );
      })}

      <p className="text-sm text-muted">Sample organizations and contact details for the demo only.</p>
    </div>
  );
}