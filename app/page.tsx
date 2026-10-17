import Link from "next/link";
import Image from "next/image";
import TierBadge from "@/components/TierBadge";
import type { Tier } from "@/types";

export const metadata = {
  title: { absolute: "FeedForward: Route surplus food to its best use" },
};

const tiers: { tier: Tier; title: string; body: string }[] = [
  {
    tier: 1,
    title: "People first",
    body: "Safe, edible surplus goes to food pantries, shelters and meal programs.",
  },
  {
    tier: 2,
    title: "Then farms",
    body: "Plant-based scraps that never touched meat become feed for local livestock.",
  },
  {
    tier: 3,
    title: "Then compost",
    body: "Whatever is left goes to compost instead of the landfill.",
  },
];

const steps = [
  {
    title: "Describe it",
    body: "A kitchen manager types what’s left, the way they’d say it.",
  },
  {
    title: "AI drafts it",
    body: "OCI Generative AI turns it into listings. Our rules suggest each item’s tier.",
  },
  {
    title: "Confirm it",
    body: "The donor checks every item. Cooked food gets a quick safety question.",
  },
  {
    title: "Route it",
    body: "Verified recipients whose own rules fit are suggested, and one claims it.",
  },
];

const heroImages = [
  {
    src: "/images/hero-kitchen.png",
    alt: "Cooks preparing vegetables in a commercial kitchen",
    label: "Kitchens donate",
  },
  {
    src: "/images/hero-pantry.jpg",
    alt: "Volunteers handing out fresh produce at a food pantry",
    label: "People first",
  },
  {
    src: "/images/hero-farm.jpg",
    alt: "Farmers working in rows of leafy greens",
    label: "Then farms",
  },
];

export default function Home() {
  return (
    <main id="main">
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative">
        <div className="grid h-[520px] grid-cols-3 sm:h-[600px]">
          {heroImages.map((img, index) => (
            <div key={img.src} className="relative overflow-hidden">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={index === 1}
                sizes="(max-width: 640px) 34vw, 33vw"
                className="object-cover"
              />
              <span className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-surface/95 px-4 py-1.5 text-sm font-bold text-brand sm:inline-block">
                {img.label}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 flex justify-center px-4">
          <div className="flex w-full max-w-3xl flex-col items-center gap-5 rounded-b-2xl bg-brand/85 px-6 py-8 text-center text-white sm:px-10 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/85 sm:text-sm">
              HackTN26 · From Surplus to Social Good
            </p>
            <h1
              id="hero-heading"
              className="font-display text-[32px] font-bold uppercase leading-[1.05] sm:text-[52px]"
            >
              Rescue the surplus.
              <br />
              Feed what&apos;s next.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              FeedForward routes tonight&apos;s kitchen leftovers to their best
              use: people first, then farms, then compost.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/donor"
                className="inline-flex min-h-12 items-center rounded-full bg-surface px-7 font-bold uppercase tracking-wide text-brand hover:bg-ground"
              >
                Post surplus
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center rounded-full border-2 border-white px-7 font-bold uppercase tracking-wide text-white hover:bg-white/10"
              >
                See the impact
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section
        aria-labelledby="tiers-heading"
        className="border-y border-line bg-surface"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-14">
          <h2 id="tiers-heading" className="font-display text-[28px] font-bold">
            Every pound goes to the best use it&apos;s still good for
          </h2>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tiers.map((t) => (
              <li
                key={t.tier}
                className="flex flex-col gap-3 rounded-2xl border border-line p-6"
              >
                <div>
                  <TierBadge tier={t.tier} />
                </div>
                <h3 className="font-display text-xl font-semibold">
                  {t.title}
                </h3>
                <p className="text-muted">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section
        aria-labelledby="how-heading"
        className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-14"
      >
        <h2 id="how-heading" className="font-display text-[28px] font-bold">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white"
              >
                {index + 1}
              </span>
              <h3 className="font-display text-xl font-semibold">
                {step.title}
              </h3>
              <p className="text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust */}
      <section aria-labelledby="trust-heading" className="bg-brand text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 py-14">
          <h2
            id="trust-heading"
            className="font-display text-[28px] font-bold sm:text-[34px]"
          >
            The AI drafts. Your rules decide. A person confirms.
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-white/90">
            FeedForward never guesses whether food is safe. Unknown conditions
            get flagged, each recipient&apos;s own acceptance rules decide every
            match, and the donor confirms before anything is posted.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted">
        <p>
          Built for HackTN26 on Oracle Cloud Infrastructure: Compute, MySQL
          HeatWave and Generative AI.
        </p>
        <p>Prototype with sample data.</p>
      </footer>
    </main>
  );
}
