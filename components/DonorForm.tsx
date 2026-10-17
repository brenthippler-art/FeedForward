'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DraftListing, Tier } from '@/types';
import { mockDrafts } from '@/lib/mock';
import TierBadge from './TierBadge';

const EXAMPLE_TEXT =
  'About 30 lbs of romaine, outer leaves wilted, two full trays of rice from lunch service, and a bucket of potato peels.';

const inputClass =
  'min-h-11 rounded-lg border-[1.5px] border-field bg-surface px-3 text-base text-ink';

export default function DonorForm() {
  const router = useRouter();
  const [text, setText] = useState(EXAMPLE_TEXT);
  const [drafts, setDrafts] = useState<DraftListing[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleDraft() {
    setLoading(true);
    // TODO: replace with fetch('/api/extract') when the backend route is ready
    await new Promise((resolve) => setTimeout(resolve, 600));
    setDrafts(mockDrafts);
    setLoading(false);
  }

  function updateDraft(index: number, changes: Partial<DraftListing>) {
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...changes } : draft)),
    );
  }

  const needsAnswers = drafts.some(
    (draft) => draft.category === 'cooked' && draft.hoursOut === null,
  );

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Left: describe the surplus */}
      <section
        aria-labelledby="describe-heading"
        className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id="describe-heading" className="font-display text-xl font-semibold">
          1. Describe what&apos;s left
        </h2>
        <label htmlFor="surplus-text" className="text-[15px] text-muted">
          Type it the way you&apos;d say it. The AI turns it into listings for you to check.
        </label>
        <textarea
          id="surplus-text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-y rounded-[10px] border-[1.5px] border-field p-3.5 text-[17px] leading-relaxed"
        />
        <button
          type="button"
          onClick={handleDraft}
          disabled={loading || text.trim() === ''}
          className="min-h-12 rounded-[10px] bg-brand font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'Drafting…' : 'Draft listings with AI'}
        </button>
        <p className="text-sm text-muted">Nothing is posted until you confirm.</p>
      </section>

      {/* Right: review the AI's draft */}
      <section
        aria-labelledby="review-heading"
        aria-live="polite"
        className="flex min-w-0 flex-[2_1_560px] flex-col gap-4 rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id="review-heading" className="font-display text-xl font-semibold">
          2. Check the AI&apos;s draft
        </h2>

        {drafts.length === 0 ? (
          <p className="text-muted">Your drafted items will appear here.</p>
        ) : (
          <>
            {drafts.map((draft, index) => {
              const isCooked = draft.category === 'cooked';
              return (
                <article
                  key={index}
                  className={`flex flex-col gap-3 rounded-xl p-4 ${
                    isCooked && draft.hoursOut === null
                      ? 'border-[1.5px] border-warn-line bg-[#FFFBEF]'
                      : 'border border-line'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{draft.item}</h3>
                    <div className="flex flex-wrap gap-2">
                      {draft.condition === 'unknown' && (
                        <span className="rounded-full bg-warn-tint px-3 py-1 text-sm font-bold text-warn-text">
                          Condition unknown
                        </span>
                      )}
                      <TierBadge tier={draft.tier} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`qty-${index}`} className="text-sm font-bold">Quantity</label>
                      <input
                        id={`qty-${index}`}
                        type="number"
                        min={0}
                        value={draft.quantity}
                        onChange={(e) => updateDraft(index, { quantity: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`unit-${index}`} className="text-sm font-bold">Unit</label>
                      <input
                        id={`unit-${index}`}
                        value={draft.unit}
                        onChange={(e) => updateDraft(index, { unit: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`lbs-${index}`} className="text-sm font-bold">Est. lbs</label>
                      <input
                        id={`lbs-${index}`}
                        type="number"
                        min={0}
                        value={draft.estimatedLbs ?? ''}
                        onChange={(e) =>
                          updateDraft(index, {
                            estimatedLbs: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`tier-${index}`} className="text-sm font-bold">Tier</label>
                      <select
                        id={`tier-${index}`}
                        value={draft.tier}
                        onChange={(e) => updateDraft(index, { tier: Number(e.target.value) as Tier })}
                        className={inputClass}
                      >
                        <option value={1}>1 · People</option>
                        <option value={2}>2 · Animals</option>
                        <option value={3}>3 · Compost</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`cond-${index}`} className="text-sm font-bold">Condition</label>
                    <input
                      id={`cond-${index}`}
                      value={draft.condition}
                      onChange={(e) => updateDraft(index, { condition: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {isCooked && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`hours-${index}`} className="text-sm font-bold text-warn-text">
                        Cooked food: how long has it been out of the fridge or warmer?
                      </label>
                      <select
                        id={`hours-${index}`}
                        value={draft.hoursOut ?? ''}
                        onChange={(e) =>
                          updateDraft(index, {
                            hoursOut: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      >
                        <option value="">Choose one</option>
                        <option value={1}>Under 2 hours</option>
                        <option value={3}>2–4 hours</option>
                        <option value={5}>Over 4 hours</option>
                      </select>
                    </div>
                  )}

                  <p className="text-sm text-muted">{draft.tierReason}</p>
                </article>
              );
            })}

            <div className="flex flex-col items-end gap-2 pt-1">
              {needsAnswers && (
                <p id="confirm-help" className="text-sm text-warn-text">
                  Answer the cooked-food question before confirming.
                </p>
              )}
              <button
                type="button"
                onClick={() => router.push('/recipient')}
                disabled={needsAnswers}
                aria-describedby={needsAnswers ? 'confirm-help' : undefined}
                className="min-h-12 rounded-[10px] bg-brand px-6 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                Confirm and find recipients
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}