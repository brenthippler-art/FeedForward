"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import PullQuote from "@/components/PullQuote";
import type { PullQuoteData } from "@/lib/impact-stats";

const ROTATE_MS = 7000;

type QuoteRotatorProps = {
  quotes: PullQuoteData[];
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getMotionSnapshot = () => window.matchMedia(REDUCED_MOTION).matches;
const getServerMotionSnapshot = () => false;

export default function QuoteRotator({ quotes }: QuoteRotatorProps) {
  const [index, setIndex] = useState(0);

  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    getMotionSnapshot,
    getServerMotionSnapshot,
  );
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reducedMotion;

    useEffect(() => {
    if (paused || quotes.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % quotes.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, quotes.length]);

  return (
    <section
      aria-label="What chefs say about food waste"
      className="flex flex-col gap-4"
      onFocus={(event) => {
        const enteringFromOutside = !event.currentTarget.contains(
          event.relatedTarget as Node | null,
        );
        if (enteringFromOutside && event.target.matches(":focus-visible")) {
          setUserPaused(true);
        }
      }}
    >
      <div className="grid">
        {quotes.map((quote, i) => (
          <div
            key={quote.name}
            inert={i !== index}
            className={`[grid-area:1/1] transition-opacity duration-700 motion-reduce:transition-none ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <PullQuote data={quote} />
          </div>
        ))}
      </div>

      {quotes.length > 1 && (
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 pl-6 md:pl-8">
          <button
            type="button"
            onClick={() => setUserPaused(!paused)}
            className="min-h-11 rounded-lg border border-line px-4 text-sm font-bold text-brand hover:border-brand"
          >
            {paused ? "Play quotes" : "Pause quotes"}
          </button>
          <div className="flex gap-2">
            {quotes.map((quote, i) => (
              <button
                key={quote.name}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show quote ${i + 1} of ${quotes.length}, ${quote.name}`}
                aria-current={i === index}
                className="flex size-11 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={`block size-2.5 rounded-full ${i === index ? "bg-brand" : "bg-field"}`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
