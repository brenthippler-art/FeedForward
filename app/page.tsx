import Image from "next/image";
import Link from "next/link";
import { demoUsers } from "@/lib/demo-users";
import { signIn } from "@/app/actions/session";
import { Suspense } from "react";
import SignInScroller from "@/components/SignInScroller";
import SignInLink from "@/components/SignInLink";
import WhyItMatters from "@/components/WhyItMatters";
import Membership from "@/components/Membership";
import BestUse from "@/components/BestUse";

export const metadata = {
  title: { absolute: "FeedForward: Route surplus food to its best use" },
};

const steps = [
  {
    title: "Describe it",
    body: "A kitchen manager types what’s left, the way they’d say it.",
  },
  {
    title: "AI drafts it",
    body: "Google’s Gemini AI turns it into listings. Our rules suggest where each item goes.",
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
      <Suspense fallback={null}>
        <SignInScroller />
      </Suspense>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative">
        <div className="grid h-[560px] grid-cols-3 sm:h-[600px]">
          {heroImages.map((img, index) => (
            <div key={img.src} className="relative overflow-hidden">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={index === 1}
                loading="eager"
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
              From Surplus to Social Good
            </p>
            <h1
              id="hero-heading"
              className="font-display text-[32px] font-bold uppercase leading-[1.05] sm:text-[52px]"
            >
              Tonight&apos;s leftovers.
              <br />
              Tomorrow&apos;s meals.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              FeedForward routes tonight&apos;s kitchen leftovers to their best
              use: <br />
              people first, then farms, then compost.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <SignInLink className="inline-flex min-h-12 items-center rounded-full bg-surface px-7 font-bold uppercase tracking-wide text-brand hover:bg-ground">
                I&apos;m donating food
              </SignInLink>
              <SignInLink className="inline-flex min-h-12 items-center rounded-full border-2 border-white px-7 font-bold uppercase tracking-wide text-white hover:bg-white/10">
                I&apos;m receiving food
              </SignInLink>
            </div>
            <p className="text-sm text-white/90 sm:text-base">
              Run a kitchen, pantry or farm in Bowling Green?{" "}
              <Link
                href="/survey"
                className="font-bold text-white underline underline-offset-4 hover:no-underline"
              >
                Take our 5-minute survey
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <WhyItMatters />

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

      <BestUse />

      {/* Membership */}
      <Membership />

      {/* Demo sign-in */}
      <section
        id="sign-in"
        aria-labelledby="signin-heading"
        className="mx-auto flex max-w-[1200px] scroll-mt-4 flex-col gap-6 px-6 py-14"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="signin-heading"
            tabIndex={-1}
            className="font-display text-[28px] font-bold focus:ouline-none"
          >
            Try the demo: choose who you are
          </h2>
          <p className="text-muted">
            No password needed. Pick a sample organization to see FeedForward
            from their side.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {(["donor", "recipient"] as const).map((role) => (
            <div
              key={role}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6"
            >
              <h3 className="font-display text-xl font-semibold">
                {role === "donor" ? "I’m donating food" : "I’m receiving food"}
              </h3>
              <ul className="flex flex-col gap-2">
                {demoUsers
                  .filter((user) => user.role === role)
                  .map((user) => (
                    <li key={user.orgId}>
                      <form action={signIn}>
                        <input type="hidden" name="orgId" value={user.orgId} />
                        <button
                          type="submit"
                          className="flex min-h-14 w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-2 text-left hover:border-brand"
                        >
                          <span className="font-bold">{user.name}</span>
                          <span className="text-sm text-muted">
                            {user.description}
                          </span>
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
