import { Suspense } from 'react';
import SurveyChoice, { SurveyChoiceLinks } from '@/components/SurveyChoice';

export const metadata = { title: 'Take the survey' };

export default function SurveyPage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-14 pt-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] font-bold">Help shape FeedForward</h1>
        <p className="max-w-[65ch] text-muted">
          We’re finding out whether FeedForward would work in Bowling Green before building it out. Pick the
          survey that fits you. Your answers go straight to the FeedForward team and aren’t stored on this website.
        </p>
      </div>
      {/* The links show right away; the ?src= tag is added once the page loads in the browser */}
      <Suspense fallback={<SurveyChoiceLinks />}>
        <SurveyChoice />
      </Suspense>
    </main>
  );
}