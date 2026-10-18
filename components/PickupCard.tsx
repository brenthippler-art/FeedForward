"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RecipientReservation } from "@/lib/recipient-claims";
import RatingPreview from "./RatingPreview";
import TierBadge from "./TierBadge";
import { formatPickupDateTime } from "@/lib/format";

type PickupCardProps = {
  pickup: RecipientReservation;
  saving?: boolean;
  disabled?: boolean;
  onPickedUp?: (claimId: number, actualLbs: number) => void;
};

export default function PickupCard({
  pickup,
  onPickedUp,
  saving = false,
  disabled = false,
}: PickupCardProps) {
  const { listing } = pickup;
  const [logging, setLogging] = useState(false);
  const [lbs, setLbs] = useState(listing.estimatedLbs?.toString() ?? "");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const weight = Number(lbs);
  const valid =
    lbs !== "" &&
    Number.isFinite(weight) &&
    weight >= 0.001 &&
    weight <= 9999999.999 &&
    Math.abs(weight * 1000 - Math.round(weight * 1000)) <= 0.000001;

  useEffect(() => {
    if (logging) inputRef.current?.focus();
  }, [logging]);

  // The server rejects a pickup before its reserved time, so wait for it here too.
  const opensAt = Date.parse(pickup.pickupTime);
  const [isOpen, setIsOpen] = useState(() => Date.now() >= opensAt);

  useEffect(() => {
    if (isOpen) return;
    // Browsers cap timers near 24.8 days; reservations are within 7 days.
    const id = window.setTimeout(() => setIsOpen(true), opensAt - Date.now());
    return () => window.clearTimeout(id);
  }, [isOpen, opensAt]);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-semibold">{listing.item}</h3>
          <p className="text-muted">
            {listing.donorName} · {formatPickupDateTime(pickup.pickupTime)}
          </p>
        </div>
        <TierBadge tier={listing.tier} />
      </div>

      <p className="text-sm text-muted">
        {listing.quantity} {listing.unit}
      </p>

      {pickup.status === "picked_up" ? (
        <>
          <p className="font-semibold text-brand-dark">
            <span aria-hidden="true">✓ </span>Picked up
            {pickup.actualLbs !== null
              ? ` · ${pickup.actualLbs} lbs`
              : " · Weight not recorded"}
          </p>
          <RatingPreview name={listing.donorName} />
        </>
      ) : !onPickedUp ? (
        <p className="font-semibold text-brand-dark">
          Reserved · Pickup confirmation will be available soon.
        </p>
      ) : logging ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !disabled && !saving)
              onPickedUp(pickup.claimId, weight);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-sm font-bold">
              Actual weight (lbs)
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="number"
              inputMode="decimal"
              min="0.001"
              max="9999999.999"
              disabled={disabled || saving}
              step="0.001"
              value={lbs}
              onChange={(event) => setLbs(event.target.value)}
              required
              className="min-h-11 w-32 rounded-lg border-[1.5px] border-field bg-surface px-3"
            />
          </div>
          <button
            type="submit"
            disabled={!valid || disabled || saving}
            className="min-h-12 rounded-[10px] bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving pickup…" : "Confirm pickup"}
          </button>
          <button
            type="button"
            disabled={saving || disabled}
            onClick={() => setLogging(false)}
            className="min-h-11 px-3 font-semibold text-brand underline"
          >
            Cancel
          </button>
        </form>
      ) : !isOpen ? (
        <p className="text-sm font-semibold text-muted">
          Reserved · Confirm pickup from{" "}
          {formatPickupDateTime(pickup.pickupTime)}
        </p>
      ) : (
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => setLogging(true)}
          className="min-h-12 self-start rounded-[10px] border-[1.5px] border-brand bg-surface px-5 font-bold text-brand"
        >
          Mark picked up<span className="sr-only"> {listing.item}</span>
        </button>
      )}
    </article>
  );
}
