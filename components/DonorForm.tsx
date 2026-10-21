"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DraftListing, FoodCategory, Tier } from "@/types";
import type { PostedListing } from "@/lib/donor-listings";
import {
  FOOD_CATEGORIES,
  ListingError,
  parseListingRequest,
} from "@/lib/listing-input";
import { formatPickupDateTime } from "@/lib/format";
import TierBadge from "./TierBadge";
import SurveyPrompt from "./SurveyPrompt";
import Link from "next/link";

type EditableItem = {
  key: string;
  item: string;
  quantity: string;
  unit: string;
  unitWeight: string;
  condition: string;
  category: FoodCategory;
  containsMeat: boolean;
  hoursOut: string;
  tier: Tier;
  readyAt: string;
  safeUntil: string;
};
const inputClass =
  "min-h-11 w-full min-w-0 rounded-lg border-[1.5px] border-field bg-surface px-3 text-base text-ink";

function localDateValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function utcValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  // Reject a nonexistent local time during the spring DST transition.
  return Number.isFinite(date.getTime()) && localDateValue(date) === value
    ? date.toISOString()
    : value;
}
function emptyItem(key: string): EditableItem {
  return {
    key,
    item: "",
    quantity: "1",
    unit: "lbs",
    unitWeight: "",
    condition: "",
    category: "produce",
    containsMeat: false,
    hoursOut: "",
    tier: 1,
    readyAt: localDateValue(new Date()),
    safeUntil: "",
  };
}
function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-warn-text">
          {error}
        </p>
      )}
    </div>
  );
}

export default function DonorForm() {
  const [drafts, setDrafts] = useState<EditableItem[]>([]);
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const nextItemKey = useRef(0);
  const [uncertain, setUncertain] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState("");
  const [surveyReady, setSurveyReady] = useState(false);
  const [message, setMessage] = useState("");
  const [postError, setPostError] = useState("");
  const messageRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Posting clears the form (and its submit button), so move focus to the result.
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);
  useEffect(() => {
    if (postError && Object.keys(errors).length === 0)
      errorRef.current?.focus();
  }, [postError, errors]);

  const [posted, setPosted] = useState<PostedListing[]>([]);
  const [reading, setReading] = useState(true);
  const [readError, setReadError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/listings", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data))
          throw new Error("Your posted food could not be loaded.");
        if (!controller.signal.aborted) {
          setPosted(data);
          setReadError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setReadError(
            "Your posted food could not be loaded. Please refresh and try again.",
          );
      } finally {
        if (!controller.signal.aborted) setReading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refresh]);

  function refreshPosted() {
    setReading(true);
    setReadError("");
    setRefresh((current) => current + 1);
  }
  function update(index: number, changes: Partial<EditableItem>) {
    setDrafts((current) =>
      current.map((draft, position) =>
        position === index ? { ...draft, ...changes } : draft,
      ),
    );
    setConfirmed(false);
    setErrors({});
  }
  // Draft keys are local UI identities, not database IDs or security tokens.
  function createItem() {
    nextItemKey.current += 1;
    return emptyItem(String(nextItemKey.current));
  }
  function addItem() {
    const draft = createItem();
    setDrafts((current) => [...current, draft]);
    setConfirmed(false);
    setMessage("");
  }

  // Turn drafts (from the AI or the samples) into editable form items
  function toEditable(list: DraftListing[]) {
    return list.map((draft) => ({
      ...createItem(),
      item: draft.item,
      quantity: String(draft.quantity),
      unit: draft.unit,
      unitWeight:
        draft.estimatedLbs === null
          ? ""
          : (draft.estimatedLbs / draft.quantity).toFixed(2),
      condition: draft.condition === "unknown" ? "" : draft.condition,
      category: draft.category,
      containsMeat: draft.containsMeat,
      hoursOut: draft.hoursOut === null ? "" : String(draft.hoursOut),
      tier: draft.tier,
    }));
  }

  async function draftWithAI() {
    setDrafting(true);
    setAiError("");
    setMessage("");
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) {
        const error =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "The AI couldn’t draft listings this time. Try again, or add items by hand.";
        throw new Error(error);
      }
      setDrafts(toEditable(data as DraftListing[]));
      setConfirmed(false);
      setErrors({});
      setPostError("");
      setMessage(
        `Drafted ${data.length} item${data.length === 1 ? "" : "s"}. Check each one’s weight, condition and destination, and enter pickup times before posting.`,
      );
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "The AI couldn’t draft listings this time. Try again, or add items by hand.",
      );
    } finally {
      setDrafting(false);
    }
  }

  function focusError(fields: Record<string, string>) {
    const key = Object.keys(fields)[0];
    const parts = key?.split(".");
    const id =
      key === "confirmed"
        ? "donor-confirmed"
        : parts?.length === 3
          ? `${parts[2]}-${parts[1]}`
          : "";
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || uncertain) return;
    const body = {
      confirmed,
      listings: drafts.map((draft) => ({
        ...draft,
        quantity: Number(draft.quantity),
        unitWeight: Number(draft.unitWeight),
        hoursOut:
          draft.category === "cooked" && draft.hoursOut !== ""
            ? Number(draft.hoursOut)
            : null,
        readyAt: utcValue(draft.readyAt),
        safeUntil: draft.safeUntil ? utcValue(draft.safeUntil) : null,
      })),
    };
    try {
      parseListingRequest(body, 0, Date.now());
    } catch (error) {
      if (error instanceof ListingError) {
        setErrors(error.fields);
        setPostError(error.message);
        focusError(error.fields);
      }
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setErrors({});
    setPostError("");
    setMessage("");
    let responseStatus: number | null = null;
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      responseStatus = response.status;
      const data = await response.json();
      if (!response.ok) {
        if (data.fields) {
          setErrors(data.fields);
          focusError(data.fields);
        }
        throw new Error(data.error || "Posting could not be confirmed.");
      }
      if (
        !Array.isArray(data) ||
        data.length !== drafts.length ||
        data.some((item) => !Number.isSafeInteger(item.id) || item.id <= 0)
      ) {
        responseStatus = null;
        throw new Error("Posting could not be confirmed.");
      }
      setPosted((current) => [
        ...data,
        ...current.filter(
          (item) => !data.some((saved) => saved.id === item.id),
        ),
      ]);
      setMessage(
        `Posted ${data.length} item${data.length === 1 ? "" : "s"}. Eligible recipients can now find your food.`,
      );
      setSurveyReady(true);
      setDrafts([]);
      setConfirmed(false);
    } catch (error) {
      const unknown =
        responseStatus === null ||
        responseStatus >= 500 ||
        (responseStatus >= 200 && responseStatus < 300);
      setUncertain(unknown);
      setPostError(
        unknown
          ? "Posting could not be confirmed. Review your posted food below before starting another post."
          : error instanceof Error
            ? error.message
            : "The items could not be posted.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
      refreshPosted();
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <form onSubmit={save} className="flex min-w-0 flex-col gap-5">
        <fieldset
          disabled={saving || uncertain}
          className="flex min-w-0 flex-col gap-5"
        >
          <legend className="mb-3">
            <h2 className="font-display text-xl font-semibold">
              Add surplus food
            </h2>
          </legend>

          <section
            aria-labelledby="ai-preview-heading"
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="ai-preview-heading"
                className="font-display text-xl font-semibold"
              >
                Describe your surplus
              </h2>
              <span className="rounded-full bg-verified-tint px-3 py-1 text-sm font-bold text-brand">
                The app drafts · you confirm
              </span>
            </div>
            <label htmlFor="surplus-description" className="font-semibold">
              What’s left in your kitchen?
            </label>
            <textarea
              id="surplus-description"
              placeholder="Example: About 30 lbs of romaine, outer leaves wilted, two full trays of rice from lunch, and a bucket of potato peels."
              rows={4}
              maxLength={3000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-describedby="ai-note"
              className="w-full min-w-0 resize-y rounded-lg border border-field p-3 text-base"
            />
            <p id="ai-note" className="text-sm text-muted">
              Describe it the way you&apos;d tell a coworker. FeedForward&apos;s Smart Draft System drafts your listings, so leave
              out names and personal details.
            </p>
            <button
              type="button"
              disabled={!description.trim() || drafts.length > 0 || drafting}
              onClick={draftWithAI}
              className="min-h-12 self-start rounded-lg border border-brand px-5 font-bold text-brand disabled:opacity-50"
            >
              {drafting
                ? "Drafting… this can take up to 30 seconds"
                : "Draft smart listings"}
            </button>
            {aiError && (
              <p role="alert" className="text-sm font-bold text-warn-text">
                {aiError}
              </p>
            )}
            {drafts.length > 0 && (
              <p className="text-sm text-muted">
                Remove the current draft items to draft again. You can edit them
                below or add items manually.
              </p>
            )}
            <p className="text-sm text-muted">
              The app describes the food. FeedForward&apos;s rules suggest where it
              goes, and nothing is posted until you review and confirm.
            </p>
          </section>

          <p className="text-muted">
            Enter each item and review its destination and pickup availability
            before posting. Times use your device&apos;s local time.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={drafts.length >= 20}
              onClick={addItem}
              className="min-h-12 rounded-lg bg-brand px-5 font-bold text-white disabled:opacity-50"
            >
              Add food item manually
            </button>
          </div>
          {drafts.map((draft, index) => {
            const field = (name: string) => {
              const error = errors[`listings.${index}.${name}`];
              return {
                id: `${name}-${index}`,
                "aria-invalid": Boolean(error),
                "aria-describedby": error
                  ? `${name}-${index}-error`
                  : undefined,
              };
            };
            const error = (name: string) => errors[`listings.${index}.${name}`];
            const total = Number(draft.quantity) * Number(draft.unitWeight);
            return (
              <article
                key={draft.key}
                className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    Item {index + 1}
                  </h3>
                  <TierBadge tier={draft.tier} />
                  <button
                    type="button"
                    onClick={() => {
                      setDrafts((current) =>
                        current.filter((item) => item.key !== draft.key),
                      );
                      setConfirmed(false);
                      setErrors({});
                    }}
                    className="min-h-11 px-3 font-semibold text-brand underline"
                    aria-label={`Remove item ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
                <Field
                  label="Food name"
                  id={`item-${index}`}
                  error={error("item")}
                >
                  <input
                    {...field("item")}
                    value={draft.item}
                    onChange={(e) => update(index, { item: e.target.value })}
                    required
                    maxLength={200}
                    className={inputClass}
                  />
                </Field>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    label="Quantity"
                    id={`quantity-${index}`}
                    error={error("quantity")}
                  >
                    <input
                      {...field("quantity")}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={draft.quantity}
                      onChange={(e) =>
                        update(index, { quantity: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Unit (lbs, trays, boxes…)"
                    id={`unit-${index}`}
                    error={error("unit")}
                  >
                    <input
                      {...field("unit")}
                      required
                      maxLength={50}
                      value={draft.unit}
                      onChange={(e) => update(index, { unit: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Weight per unit (lbs)"
                    id={`unitWeight-${index}`}
                    error={error("unitWeight")}
                  >
                    <input
                      {...field("unitWeight")}
                      type="number"
                      min="0.01"
                      max="999999.99"
                      step="0.01"
                      inputMode="decimal"
                      required
                      value={draft.unitWeight}
                      onChange={(e) =>
                        update(index, { unitWeight: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <p className="text-sm text-muted">
                  Estimated total:{" "}
                  {Number.isFinite(total) && total > 0 ? total.toFixed(2) : "—"}{" "}
                  lbs
                </p>
                <Field
                  label="Condition"
                  id={`condition-${index}`}
                  error={error("condition")}
                >
                  <input
                    {...field("condition")}
                    required
                    maxLength={500}
                    value={draft.condition}
                    onChange={(e) =>
                      update(index, { condition: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Category"
                    id={`category-${index}`}
                    error={error("category")}
                  >
                    <select
                      {...field("category")}
                      value={draft.category}
                      onChange={(e) =>
                        update(index, {
                          category: e.target.value as FoodCategory,
                          ...(e.target.value === "meat"
                            ? { containsMeat: true }
                            : {}),
                        })
                      }
                      className={inputClass}
                    >
                      {FOOD_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Destination"
                    id={`tier-${index}`}
                    error={error("tier")}
                  >
                    <select
                      {...field("tier")}
                      value={draft.tier}
                      onChange={(e) =>
                        update(index, { tier: Number(e.target.value) as Tier })
                      }
                      className={inputClass}
                    >
                      <option value={1}>1 · People</option>
                      <option value={2}>2 · Animals</option>
                      <option value={3}>3 · Compost</option>
                    </select>
                  </Field>
                </div>
                <Field
                  label="Contains or touched meat"
                  id={`containsMeat-${index}`}
                  error={error("containsMeat")}
                >
                  <input
                    {...field("containsMeat")}
                    type="checkbox"
                    checked={draft.containsMeat}
                    disabled={draft.category === "meat"}
                    onChange={(e) =>
                      update(index, { containsMeat: e.target.checked })
                    }
                    className="h-6 w-6"
                  />
                </Field>
                {draft.category === "cooked" && (
                  <Field
                    label="Hours out of the fridge or warmer"
                    id={`hoursOut-${index}`}
                    error={error("hoursOut")}
                  >
                    <input
                      {...field("hoursOut")}
                      type="number"
                      required
                      min="0"
                      max="9999.99"
                      step="0.01"
                      value={draft.hoursOut}
                      onChange={(e) =>
                        update(index, { hoursOut: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                )}
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Ready for pickup"
                    id={`readyAt-${index}`}
                    error={error("readyAt")}
                  >
                    <input
                      {...field("readyAt")}
                      type="datetime-local"
                      required
                      value={draft.readyAt}
                      onChange={(e) =>
                        update(index, { readyAt: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label={`Pickup deadline${draft.tier === 1 ? " (required)" : " (optional)"}`}
                    id={`safeUntil-${index}`}
                    error={error("safeUntil")}
                  >
                    <input
                      {...field("safeUntil")}
                      type="datetime-local"
                      required={draft.tier === 1}
                      value={draft.safeUntil}
                      onChange={(e) =>
                        update(index, { safeUntil: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <p className="text-sm text-muted">
                  Choose availability from your kitchen’s actual handling and
                  storage conditions. A destination choice is not a food-safety
                  certification.
                </p>
              </article>
            );
          })}
          {drafts.length > 0 && (
            <>
              <label
                htmlFor="donor-confirmed"
                className="flex min-h-11 items-center gap-3 font-semibold"
              >
                <input
                  id="donor-confirmed"
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  aria-describedby={
                    errors.confirmed ? "confirmed-error" : undefined
                  }
                  className="h-6 w-6 shrink-0"
                />
                I reviewed every item, its condition, destination, and pickup
                availability.
              </label>
              {errors.confirmed && (
                <p id="confirmed-error" className="text-sm text-warn-text">
                  {errors.confirmed}
                </p>
              )}
              <button
                type="submit"
                className="min-h-12 self-start rounded-lg bg-brand px-6 font-bold text-white"
              >
                {saving ? "Posting…" : "Confirm and post food"}
              </button>
            </>
          )}
        </fieldset>
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
        {surveyReady && <SurveyPrompt kind="donor" />}
        {postError && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-warn-line bg-warn-tint p-4 text-warn-text"
          >
            {postError}
          </p>
        )}
        {uncertain && (
          <button
            type="button"
            disabled={reading || Boolean(readError)}
            onClick={() => {
              setDrafts([]);
              setConfirmed(false);
              setUncertain(false);
              setPostError("");
              setErrors({});
            }}
            className="min-h-12 self-start rounded-lg border border-brand px-5 font-bold text-brand disabled:opacity-50"
          >
            Start a new post after reviewing posted food
          </button>
        )}
      </form>
      <section
        aria-labelledby="posted-food-heading"
        className="flex flex-col gap-4"
        aria-busy={reading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="posted-food-heading"
            className="font-display text-2xl font-semibold"
          >
            Your posted food
          </h2>
          <button
            type="button"
            onClick={refreshPosted}
            disabled={reading || saving}
            className="min-h-11 rounded-lg border border-brand px-4 font-bold text-brand disabled:opacity-50"
          >
            Refresh posted food
          </button>
        </div>
        {reading && <p role="status">Loading posted food…</p>}
        {readError && (
          <p role="alert" className="text-warn-text">
            {readError}
          </p>
        )}
        {!reading && !readError && posted.length === 0 && (
          <p className="text-muted">You have not posted any food yet.</p>
        )}
        <ul className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {posted.map((listing) => (
            <li
              key={listing.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-5"
            >
              <h3 className="font-display text-lg font-semibold">
                {listing.item}
              </h3>
              <TierBadge tier={listing.tier} />
              <p>
                {listing.quantity} {listing.unit} · {listing.estimatedLbs} lbs
                remaining
              </p>
              <p className="font-semibold">
                {listing.status === "picked_up"
                  ? "Picked up"
                  : listing.status === "claimed"
                    ? "Reserved"
                    : "Posted"}
              </p>
              {listing.status !== "available" && listing.claimedBy && (
                <div className="flex flex-col gap-1 rounded-lg bg-ground p-3 text-sm">
                  <p>
                    <span className="text-muted">
                      {listing.status === "picked_up"
                        ? "Picked up by"
                        : "Reserved by"}
                    </span>{" "}
                    <span className="font-semibold">
                      {listing.claimedBy.name}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted">Pickup:</span>{" "}
                    {formatPickupDateTime(listing.claimedBy.pickupTime)}
                  </p>
                  <details>
                    <summary className="cursor-pointer py-2 font-semibold text-brand underline">
                      Contact details
                      <span className="sr-only">
                        {" "}
                        for {listing.claimedBy.name}
                      </span>
                    </summary>
                    <dl className="flex flex-col gap-1">
                      <div>
                        <dt className="inline text-muted">Contact: </dt>
                        <dd className="inline">
                          {listing.claimedBy.contactName}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-muted">Phone: </dt>
                        <dd className="inline">
                          <a
                            href={`tel:${listing.claimedBy.phone.replace(/[^\d+]/g, "")}`}
                            className="font-semibold text-brand underline"
                          >
                            {listing.claimedBy.phone}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-muted">Email: </dt>
                        <dd className="inline">
                          <a
                            href={`mailto:${listing.claimedBy.email}`}
                            className="font-semibold text-brand underline"
                          >
                            {listing.claimedBy.email}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>
              )}
              <p className="text-sm text-muted">
                Listing #{listing.id}
                {listing.readyAt
                  ? ` · Ready ${formatPickupDateTime(listing.readyAt)}`
                  : ""}
              </p>
              {listing.status === "available" && (
                <Link
                  href={`/donor/matches?listingId=${listing.id}`}
                  className="min-h-11 inline-flex items-center font-semibold text-brand underline"
                >
                  View suggested recipients
                </Link>
              )}
              {listing.safeUntil && (
                <p className="text-sm text-muted">
                  Pickup deadline: {formatPickupDateTime(listing.safeUntil)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
