'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import SurveyQuestion from '@/components/SurveyQuestion';
import { validateAnswers } from '@/lib/survey-submission';
import { isVisible, surveys, type Answers, type SurveyKind } from '@/lib/surveys';

type Status = 'idle' | 'sending' | 'sent';

const primaryButton = 'min-h-12 rounded-lg bg-brand px-6 font-bold text-white disabled:opacity-50';
const secondaryButton = 'min-h-12 rounded-lg border border-field bg-surface px-6 font-bold';

export default function SurveyForm({ kind }: { kind: SurveyKind }) {
  const survey = surveys[kind];
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  const headingRef = useRef<HTMLHeadingElement>(null);
  // What to focus after the next render: 'heading' or a question's id
  const focusTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!focusTarget.current) return;
    const target =
      focusTarget.current === 'heading' ? headingRef.current : document.getElementById(focusTarget.current);
    focusTarget.current = null;
    target?.focus();
  });

  const section = survey.sections[step];
  const isLast = step === survey.sections.length - 1;
  const visibleQuestions = section.questions.filter((question) => isVisible(question, answers));

  function update(id: string, value: string | string[] | number) {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    // Clear that question's error as soon as it's answered
    setErrors((previous) => {
      if (!(id in previous)) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  function goTo(nextStep: number) {
    setErrors({});
    setMessage('');
    setStep(nextStep);
    focusTarget.current = 'heading';
    window.scrollTo(0, 0);
  }

  // Show errors and jump to the section holding the first one
  function showErrors(found: Record<string, string>) {
    const firstId = Object.keys(found)[0];
    const index = survey.sections.findIndex((s) => s.questions.some((question) => question.id === firstId));
    setErrors(found);
    if (index >= 0) setStep(index);
    focusTarget.current = firstId;
  }

  function next() {
    const result = validateAnswers(survey, answers);
    const sectionIds = new Set(section.questions.map((question) => question.id));
    const found = result.ok
      ? {}
      : Object.fromEntries(Object.entries(result.errors).filter(([id]) => sectionIds.has(id)));
    if (Object.keys(found).length > 0) showErrors(found);
    else goTo(step + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLast) {
      next(); // Enter pressed on an earlier section
      return;
    }

    const result = validateAnswers(survey, answers);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    setStatus('sending');
    setMessage('');
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          answers: result.answers, // hidden follow-ups already removed
          website,
          source: new URLSearchParams(window.location.search).get('src') ?? undefined,
        }),
      });
      const data: { error?: string; fields?: Record<string, string> } = await response.json().catch(() => ({}));

      if (response.ok) {
        focusTarget.current = 'heading';
        setStatus('sent');
        window.scrollTo(0, 0);
        return;
      }
      setStatus('idle');
      if (data.fields) showErrors(data.fields);
      else setMessage(data.error ?? 'We couldn’t send your answers. Please try again.');
    } catch {
      setStatus('idle');
      setMessage('We couldn’t reach FeedForward. Check your connection and try again.');
    }
  }

  if (status === 'sent') {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold focus:outline-none">
          Thank you. Your answers were sent.
        </h2>
        <p>They went straight to the FeedForward team. If you left contact details for the pilot, we’ll be in touch.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/?signin=1" className={`${primaryButton} inline-flex items-center`}>
            Try the demo
          </Link>
          <Link href="/" className={`${secondaryButton} inline-flex items-center`}>
            Back to the home page
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative flex min-w-0 flex-col gap-6">
      {step === 0 && <p className="max-w-[65ch] text-muted">{survey.intro}</p>}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-muted">
          Section {step + 1} of {survey.sections.length}
        </p>
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${((step + 1) / survey.sections.length) * 100}%` }}
          />
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold focus:outline-none">
          {section.title}
        </h2>
      </div>

      <div className="flex flex-col gap-8">
        {visibleQuestions.map((question) => (
          <SurveyQuestion
            key={question.id}
            question={question}
            value={answers[question.id]}
            error={errors[question.id]}
            onChange={(value) => update(question.id, value)}
          />
        ))}
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {message && (
        <p role="alert" className="rounded-lg bg-warn-tint p-3 font-bold text-warn-text">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button type="button" onClick={() => goTo(step - 1)} className={secondaryButton}>
            Back
          </button>
        )}
        <button type="submit" disabled={status === 'sending'} className={primaryButton}>
          {!isLast ? 'Next' : status === 'sending' ? 'Sending…' : 'Send my answers'}
        </button>
      </div>
    </form>
  );
}