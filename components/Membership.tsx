import Link from 'next/link';
import SignInLink from '@/components/SignInLink';
import { plans, recipientOffer } from '@/lib/membership';

function Check() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-verified-tint text-xs font-bold text-brand-dark"
    >
      ✓
    </span>
  );
}

export default function Membership() {
  return (
    <section
      id="membership"
      aria-labelledby="membership-heading"
      className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">Join FeedForward</p>
        <h2 id="membership-heading" className="font-display text-4xl font-bold">
          Free today. More ways to give, coming soon.
        </h2>
        <p className="text-lg text-muted">
          Recipients never pay. Donors can start free now, and upgrade for tax-ready records or
          full-service pickup when new memberships launch.
        </p>
      </div>

      <section
        aria-labelledby="recipients-heading"
        className="flex flex-col gap-5 rounded-2xl bg-verified-tint p-6 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 id="recipients-heading" className="font-display text-xl font-semibold">
              {recipientOffer.heading}
            </h3>
            <p className="font-bold text-brand-dark">{recipientOffer.price}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {recipientOffer.points.map((point) => (
              <li key={point} className="flex gap-3">
                <Check />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <SignInLink className="inline-flex min-h-12 shrink-0 items-center self-start rounded-[10px] bg-brand px-6 font-bold text-white hover:bg-brand-dark md:self-center">
          Start receiving
        </SignInLink>
      </section>

      <div className="flex flex-col gap-4">
        <h3 className="font-display text-xl font-semibold">For restaurants, cafeterias, and caterers</h3>

        <ul className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const available = plan.status === 'available';

            return (
              <li
                key={plan.id}
                className={`flex flex-col gap-5 rounded-2xl bg-surface p-6 ${
                  available ? 'border-2 border-brand' : 'border border-dashed border-field'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <span
                    className={`self-start rounded-full px-3 py-1 text-sm font-bold ${
                      available ? 'bg-verified-tint text-brand-dark' : 'bg-warn-tint text-warn-text'
                    }`}
                  >
                    {available ? 'Available now' : 'Coming soon'}
                  </span>
                  <h4 className="font-display text-2xl font-bold">{plan.name}</h4>
                  <p className="font-bold text-brand-dark">{plan.price}</p>
                  <p className="text-muted">{plan.summary}</p>
                </div>

                <p className="rounded-xl bg-ground px-4 py-3 text-sm">
                  <span className="font-bold">Pickup: </span>
                  {plan.pickup}
                </p>

                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {available && (
                  <SignInLink className="mt-auto inline-flex min-h-12 items-center self-start rounded-[10px] bg-brand px-6 font-bold text-white hover:bg-brand-dark">
                    Start donating
                  </SignInLink>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-sm text-muted">
        Paid memberships aren&apos;t available yet; pricing will be announced at launch. Legal and
        tax details are general information; see our{' '}
        <Link href="/disclaimer" className="font-semibold text-brand underline hover:text-brand-dark">
          food safety and liability notice
        </Link>{' '}
        and check with your tax advisor.
      </p>
    </section>
  );
}