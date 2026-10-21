import QuoteRotator from "@/components/QuoteRotator";
import StatBlock from '@/components/StatBlock';
import {
  kitchenQuotes,
  opportunityStat,
  storyActs,
} from "@/lib/impact-stats";



export default function WhyItMatters() {
  return (
    <section
      id="why"
      aria-labelledby="why-heading"
      className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">
          Why FeedForward
        </p>
        <h2 id="why-heading" className="font-display text-4xl font-bold">
          Good food is thrown away every night while our neighbors go hungry.
        </h2>
        <p className="text-lg text-muted">
          The food exists. The need exists. What&apos;s missing is a fast, safe
          way to connect them.
        </p>
      </div>

      <ol className="grid gap-6 md:grid-cols-3">
        {storyActs.map((act) => (
          <li
            key={act.id}
            className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6"
          >
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-wider text-muted">
                {act.eyebrow}
              </p>
              <h3 className="font-display text-xl font-semibold">
                {act.heading}
              </h3>
              <p className="text-muted">{act.body}</p>
            </div>
            <div className="flex flex-col gap-5 border-t border-line pt-5">
              {act.stats.map((stat) => (
                <StatBlock key={stat.value} stat={stat} />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <QuoteRotator quotes={kitchenQuotes} />

      <div className="flex flex-col gap-8 rounded-2xl bg-brand p-8 text-white md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-xl flex-col gap-3">
          <h3 className="font-display text-2xl font-bold">
            The opportunity is right here in Bowling Green.
          </h3>
          <p className="text-white/90">
            Much of today&apos;s food rescue comes from grocery stores.
            Restaurants, cafeterias, and caterers have surplus every night but
            no easy way to move it. FeedForward makes it a two-minute task:
            describe what&apos;s left, check the app&apos;s draft, and a nearby
            pantry or shelter claims it.
          </p>
        </div>
        <div className="md:max-w-xs">
          <StatBlock stat={opportunityStat} tone="dark" />
        </div>
      </div>
      <p className="text-sm text-muted">Every statistic links to its original source.</p>
    </section>
  );
}
