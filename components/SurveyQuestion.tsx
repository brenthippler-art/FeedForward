'use client';

import { isRequired, type Question } from '@/lib/surveys';

type Answer = string | string[] | number;

type SurveyQuestionProps = {
  question: Question;
  value: Answer | undefined;
  error?: string;
  onChange: (value: Answer) => void;
};

// One tappable row per option; turns green when chosen
const optionClass =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 has-checked:border-brand has-checked:bg-verified-tint has-disabled:cursor-not-allowed has-disabled:opacity-50';

export default function SurveyQuestion({ question, value, error, onChange }: SurveyQuestionProps) {
  const errorId = `${question.id}-error`;
  const errorMessage = error ? (
    <p id={errorId} className="mt-2 text-sm font-bold text-warn-text">
      {error}
    </p>
  ) : null;

  if (question.type === 'text') {
    const text = typeof value === 'string' ? value : '';
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={question.id} className="font-semibold">
          {question.label}
          {!isRequired(question) && <span className="font-normal text-muted"> (optional)</span>}
        </label>
        <textarea
          id={question.id}
          rows={3}
          value={text}
          maxLength={question.maxLength ?? 1000}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 resize-y rounded-lg border border-field bg-surface p-3 text-base"
        />
        {errorMessage}
      </div>
    );
  }

  const chosen = Array.isArray(value) ? value : [];
  const atMax = question.type === 'multi' && question.max !== undefined && chosen.length >= question.max;
  const countId = `${question.id}-count`;
  const describedBy = [question.type === 'multi' && question.max ? countId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <fieldset id={question.id} tabIndex={-1} aria-describedby={describedBy} className="min-w-0 focus:outline-none">
      <legend className="mb-3 font-semibold">{question.label}</legend>

      {question.type === 'single' && (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <label key={option} className={optionClass}>
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="size-5 shrink-0 accent-brand"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'multi' && (
        <div className="flex flex-col gap-2">
          {question.max && (
            <p id={countId} aria-live="polite" className="text-sm text-muted">
              {chosen.length} of {question.max} chosen
            </p>
          )}
          {question.options.map((option) => {
            const checked = chosen.includes(option);
            return (
              <label key={option} className={optionClass}>
                <input
                  type="checkbox"
                  value={option}
                  checked={checked}
                  disabled={!checked && atMax}
                  onChange={() => onChange(checked ? chosen.filter((item) => item !== option) : [...chosen, option])}
                  className="size-5 shrink-0 accent-brand"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'scale' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((number) => (
              <label key={number} className={`${optionClass} justify-center`}>
                <input
                  type="radio"
                  name={question.id}
                  value={number}
                  checked={value === number}
                  onChange={() => onChange(number)}
                  aria-label={
                    number === 1 ? `1, ${question.minLabel}` : number === 5 ? `5, ${question.maxLabel}` : undefined
                  }
                  className="size-5 shrink-0 accent-brand"
                />
                <span aria-hidden={number === 1 || number === 5 ? true : undefined}>{number}</span>
              </label>
            ))}
          </div>
          <div aria-hidden="true" className="flex justify-between text-sm text-muted">
            <span>1 = {question.minLabel}</span>
            <span>5 = {question.maxLabel}</span>
          </div>
        </div>
      )}

      {errorMessage}
    </fieldset>
  );
}