"use client";

import { useEffect, useState } from "react";
import type { Impact } from "@/types";
import StatTile from "./StatTile";
import TierBars from "./TierBars";
import TierBadge from "./TierBadge";
import CopyButton from "./CopyButton";
import { LBS_PER_MEAL, lbsPerMealSource } from "@/lib/impact-stats";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function ImpactDashboard({
  recipientName,
}: {
  recipientName?: string;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/impact", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Impact data could not be loaded.");
        if (
          !data ||
          !Number.isFinite(data.totalLbs) ||
          !Number.isSafeInteger(data.pickups) ||
          !data.lbsByTier ||
          !Array.isArray(data.recent)
        )
          throw new Error("Unexpected impact response.");
        if (!controller.signal.aborted) setImpact(data);
      } catch {
        if (!controller.signal.aborted)
          setError("Impact data could not be loaded. Please try again.");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <div>
        <h1 className="font-display text-[34px] font-bold">Impact</h1>
        <p role="alert">{error}</p>
        <button
          type="button"
          className="min-h-11 font-bold text-brand underline"
          onClick={() => {
            setError("");
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  if (!impact) return <p role="status">Loading recorded impact…</p>;
  const isRecipient = Boolean(recipientName);
  const viewerName = recipientName ?? "All of FeedForward";
  const summary = `${viewerName} recorded ${impact.pickups.toLocaleString("en-US")} completed pickup${impact.pickups === 1 ? "" : "s"}, totaling ${impact.totalLbs.toLocaleString("en-US")} lbs. By destination: ${impact.lbsByTier[1].toLocaleString("en-US")} lbs for people, ${impact.lbsByTier[2].toLocaleString("en-US")} lbs for animals, and ${impact.lbsByTier[3].toLocaleString("en-US")} lbs for compost That's about ${impact.meals.toLocaleString("en-US")} meals for people.`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-14 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] text-muted">
            {viewerName} · all recorded pickups
          </p>
          <h1 className="font-display text-[34px] font-bold">Impact</h1>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-brand px-4 font-bold text-brand"
          onClick={() => {
            setImpact(null);
            setError("");
            setAttempt((n) => n + 1);
          }}
        >
          Refresh impact
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatTile
          label={isRecipient ? "Pounds received" : "Pounds diverted"}
          value={impact.totalLbs.toLocaleString("en-US")}
          note="Recorded weight; estimates used when unmeasured"
        />
        <StatTile
          label="Meals provided (est.)"
          value={impact.meals.toLocaleString("en-US")}
          note={
            <>
              People-tier pounds at {LBS_PER_MEAL} lbs per meal (
              <a
                href={lbsPerMealSource.href}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {lbsPerMealSource.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              )
            </>
          }
        />
        <StatTile
          label="Pickups completed"
          value={impact.pickups.toLocaleString("en-US")}
          note="Logged at pickup"
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="tier-heading"
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4 rounded-2xl border border-line bg-surface p-6"
        >
          <h2 id="tier-heading" className="font-display text-xl font-semibold">
            Pounds by tier
          </h2>
          <TierBars lbsByTier={impact.lbsByTier} />
          <p className="text-sm text-muted">Pounds from completed pickups</p>
        </section>

        <section
          aria-labelledby="summary-heading"
          className="flex min-w-0 flex-[2_1_340px] flex-col gap-3 rounded-2xl border border-line bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="summary-heading"
              className="font-display text-xl font-semibold"
            >
              Impact summary
            </h2>
            <span className="text-sm text-muted">
              Summary of recorded pickups
            </span>
          </div>
          <p className="text-[17px] leading-relaxed">{summary}</p>
          <CopyButton text={summary} />
        </section>
      </div>

      <section
        aria-labelledby="recent-heading"
        className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id="recent-heading" className="font-display text-xl font-semibold">
          Recent pickups
        </h2>
        <div
          role="region"
          aria-label="Recent pickups table (scrolls sideways)"
          tabIndex={0}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="text-sm text-muted">
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  Date
                </th>
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  Item
                </th>
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  {isRecipient ? "Donor" : "Recipient"}
                </th>
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  Tier
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-3 py-2.5 text-right"
                >
                  Lbs
                </th>
              </tr>
            </thead>
            <tbody>
              {impact.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No completed pickups recorded yet.
                  </td>
                </tr>
              ) : (
                impact.recent.map((row) => (
                  <tr
                    key={row.pickupId}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-3 py-3">
                      {dateFormat.format(new Date(row.date))}
                    </td>
                    <td className="px-3 py-3">{row.item}</td>
                    <td className="px-3 py-3">
                      {isRecipient ? row.donorName : row.recipientName}
                    </td>
                    <td className="px-3 py-3">
                      <TierBadge tier={row.tier} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.lbs}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
