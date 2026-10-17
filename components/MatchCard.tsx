'use client';

import type { RecipientMatch, OrgType, Tier } from '@/types';
import TierBadge from './TierBadge';

const typeLabels: Record<OrgType, string> = {
  donor: 'Donor',
  pantry: 'Pantry or shelter',
  farm: 'Farm · animal feed',
  compost: 'Compost site',
};

const typeTier: Record<OrgType, Tier> = {
  donor: 1,
  pantry: 1,
  farm: 2,
  compost: 3,
};

type MatchCardProps = {
  match: RecipientMatch;
  expanded: boolean;
  chosen: boolean;
  onToggle: () => void;
  onChoose: () => void;
};

export default function MatchCard({ match, expanded, chosen, onToggle, onChoose }: MatchCardProps) {
  const { recipient, distanceMiles, reasons, aiSummary } = match;
  const detailsId = `contact-${recipient.id}`;

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-surface ${
        expanded || chosen ? 'border-2 border-brand' : 'border border-line'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full flex-col gap-2.5 px-5 py-5 text-left"
      >
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-[21px] font-semibold">{recipient.name}</h3>
            <p className="text-[15px] text-muted">
              {typeLabels[recipient.type]} · {distanceMiles.toFixed(1)} mi
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {recipient.verified && (
              <span className="rounded-full bg-verified-tint px-3 py-1 text-sm font-bold text-brand-dark">
                Verified
              </span>
            )}
            <TierBadge tier={typeTier[recipient.type]} />
          </div>
        </div>

        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[15px] text-muted">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>

        {aiSummary && <p className="text-[15px] italic text-muted">AI note: {aiSummary}</p>}
      </button>

      {expanded && (
        <div
          id={detailsId}
          className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-[#FAFBF8] px-5 py-4"
        >
          <dl className="grid min-w-0 flex-[1_1_420px] grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">Contact</dt>
              <dd className="font-semibold">{recipient.contactName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Phone</dt>
              <dd className="font-semibold">
                <a href={`tel:${recipient.phone}`} className="underline">{recipient.phone}</a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Email</dt>
              <dd className="font-semibold break-all">
                <a href={`mailto:${recipient.email}`} className="underline">{recipient.email}</a>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onChoose}
            disabled={chosen}
            className="min-h-12 rounded-[10px] bg-brand px-6 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {chosen ? 'Chosen' : 'Choose this recipient'}
          </button>
        </div>
      )}
    </article>
  );
}