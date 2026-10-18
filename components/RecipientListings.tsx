"use client";

import { useEffect, useRef, useState } from "react";
import type { Claim, Pickup } from "@/types";
import type { BookableListing } from "@/lib/bookable-listings";
import type { RecipientListing } from "@/lib/listings";
import type { RecipientReservation } from "@/lib/recipient-claims";
import { formatPickupDateTime } from "@/lib/format";
import AvailableCard from "./AvailableCard";
import PickupCard from "./PickupCard";
import Link from "next/link";

type Resource<T> = { data: T[]; loading: boolean; error: string | null };
const initial = { data: [], loading: true, error: null };

async function readArray<T>(url: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Unable to load data. Please try again.");
  if (!Array.isArray(data))
    throw new Error("The server returned an unexpected response.");
  return data;
}

export default function RecipientListings() {
  const [attempt, setAttempt] = useState(0);
  const [listings, setListings] = useState<Resource<BookableListing>>(initial);
  const [pickups, setPickups] =
    useState<Resource<RecipientReservation>>(initial);
  const [savingPickupId, setSavingPickupId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const bookingInFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  const messageRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // The button a user pressed disappears or disables after a claim or pickup,
  // so move focus to the result instead of dropping it on the page body.
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);
  useEffect(() => {
    if (bookingError) errorRef.current?.focus();
  }, [bookingError]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const [food, reservations] = await Promise.allSettled([
        readArray<BookableListing>("/api/listings", controller.signal),
        readArray<RecipientReservation>("/api/claims", controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (food.status === "fulfilled")
        setListings({ data: food.value, loading: false, error: null });
      else
        setListings((current) => ({
          ...current,
          loading: false,
          error:
            "Available food could not be loaded. Please refresh and try again.",
        }));
      if (reservations.status === "fulfilled")
        setPickups({ data: reservations.value, loading: false, error: null });
      else
        setPickups((current) => ({
          ...current,
          loading: false,
          error:
            "Your pickups could not be loaded. Please refresh and try again.",
        }));
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function reload() {
    setListings((current) => ({ ...current, loading: true, error: null }));
    setPickups((current) => ({ ...current, loading: true, error: null }));
    setAttempt((current) => current + 1);
  }

  async function handleClaim(listing: RecipientListing, pickupTime: string) {
    if (bookingInFlight.current) return;
    bookingInFlight.current = true;
    setSavingId(listing.id);
    setBookingError("");
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, pickupTime }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ||
            "The reservation could not be confirmed. Refresh before trying again.",
        );
      const claim = data as Claim;
      if (
        !Number.isSafeInteger(claim.id) ||
        claim.listingId !== listing.id ||
        typeof claim.pickupTime !== "string"
      ) {
        throw new Error(
          "The reservation could not be confirmed. Refresh before trying again.",
        );
      }
      // Show the confirmed booking immediately, then reconcile with the database.
      setListings((current) => ({
        ...current,
        data: current.data.filter((item) => item.id !== listing.id),
      }));
      setPickups((current) => ({
        ...current,
        data: [
          {
            claimId: claim.id,
            listing,
            pickupTime: claim.pickupTime,
            status: "claimed",
            actualLbs: null,
          },
          ...current.data.filter((pickup) => pickup.claimId !== claim.id),
        ],
      }));
      setMessage(
        `Reserved ${listing.item} for ${formatPickupDateTime(claim.pickupTime)}.`,
      );
    } catch (error) {
      setBookingError(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "The reservation could not be confirmed. Refresh before trying again.",
      );
    } finally {
      bookingInFlight.current = false;
      setSavingId(null);
      // A network failure can happen after commit. Re-read saved claims instead
      // of automatically repeating a POST that might already have succeeded.
      reload();
    }
  }

  async function handlePickedUp(claimId: number, actualLbs: number) {
    if (bookingInFlight.current) return;
    bookingInFlight.current = true;
    setSavingPickupId(claimId);
    setBookingError("");
    setMessage("");
    let status: number | null = null;
    try {
      const response = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, actualLbs }),
      });
      status = response.status;
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Pickup could not be confirmed.");
      const pickup = result as Pickup;
      if (
        !Number.isSafeInteger(pickup.id) ||
        pickup.claimId !== claimId ||
        pickup.actualLbs !== actualLbs ||
        typeof pickup.pickedUpAt !== "string"
      )
        throw new Error("Unexpected pickup response.");
      setPickups((current) => ({
        ...current,
        data: current.data.map((saved) =>
          saved.claimId === claimId
            ? { ...saved, status: "picked_up", actualLbs: pickup.actualLbs }
            : saved,
        ),
      }));
      setMessage(
        `Pickup recorded: ${pickup.actualLbs} lbs. View the impact dashboard for updated totals.`,
      );
    } catch (error) {
      const uncertain =
        status === null || status >= 500 || (status >= 200 && status < 300);
      setBookingError(
        uncertain
          ? "Pickup confirmation is uncertain. Review your refreshed pickups before trying again."
          : error instanceof Error
            ? error.message
            : "Pickup could not be confirmed.",
      );
    } finally {
      bookingInFlight.current = false;
      setSavingPickupId(null);
      // Reconcile even after a lost response: never automatically repeat a write.
      reload();
    }
  }

  const loading = listings.loading || pickups.loading;
  const blocked =
    savingId !== null ||
    savingPickupId !== null ||
    loading ||
    Boolean(listings.error || pickups.error);
  const savedListingIds = new Set(
    pickups.data.map((pickup) => pickup.listing.id),
  );
  const available = listings.data.filter(
    (listing) => !savedListingIds.has(listing.id),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Pickup times are shown in Central time.
        </p>
        <button
          type="button"
          onClick={reload}
          disabled={loading || savingId !== null || savingPickupId !== null}
          className="min-h-11 rounded-lg border border-brand px-4 font-bold text-brand disabled:opacity-50"
        >
          {listings.error || pickups.error ? "Try again" : "Refresh"}
        </button>
      </div>
      {message && (
        <p
          ref={messageRef}
          tabIndex={-1}
          role="status"
          className="rounded-xl border border-brand bg-verified-tint p-4 font-semibold text-brand-dark"
        >
          {message}
        </p>
      )}
      {bookingError && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-warn-line bg-warn-tint p-4 text-warn-text"
        >
          {bookingError}
        </p>
      )}
      <Link
        href="/dashboard"
        className="inline-block font-semibold text-brand underline"
      >
        View impact dashboard
      </Link>
      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="available-heading"
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4"
          aria-busy={listings.loading}
        >
          <h2
            id="available-heading"
            className="font-display text-2xl font-semibold"
          >
            Available food
          </h2>
          {listings.loading && <p role="status">Loading available food…</p>}
          {listings.error && (
            <p role="alert" className="text-warn-text">
              {listings.error}
            </p>
          )}
          {!listings.loading && !listings.error && available.length === 0 && (
            <p className="rounded-xl border border-line bg-surface p-6">
              No available food matches your organization’s accepted tiers and
              categories right now.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {available.map((listing) => (
              <li key={listing.id}>
                <AvailableCard
                  listing={listing}
                  pickupTimes={listing.pickupSlots ?? []}
                  booking={savingId === listing.id}
                  disabled={blocked}
                  onClaim={(item, time) => {
                    void handleClaim(item, time);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-labelledby="pickups-heading"
          className="flex min-w-0 flex-[2_1_340px] flex-col gap-4"
          aria-busy={pickups.loading}
        >
          <h2
            id="pickups-heading"
            className="font-display text-2xl font-semibold"
          >
            Your pickups
          </h2>
          {pickups.loading && <p role="status">Loading your pickups…</p>}
          {pickups.error && (
            <p role="alert" className="text-warn-text">
              {pickups.error}
            </p>
          )}
          {!pickups.loading && !pickups.error && pickups.data.length === 0 && (
            <p className="rounded-xl border border-line bg-surface p-6">
              Food you reserve will appear here, including when you return
              later.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {pickups.data.map((pickup) => (
              <li key={pickup.claimId}>
                <PickupCard
                  pickup={pickup}
                  saving={savingPickupId === pickup.claimId}
                  disabled={blocked}
                  onPickedUp={(id, lbs) => {
                    void handlePickedUp(id, lbs);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
