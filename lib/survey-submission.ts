import { isRequired, isVisible, type Answers, type Survey } from '@/lib/surveys';

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Record<string, string> };

const DEFAULT_TEXT_MAX = 1000;

// Check a submission against the survey's own questions. Only known question IDs
// are read, so anything extra a bot sends is ignored.
export function validateAnswers(survey: Survey, input: unknown): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { answers: 'Answers are missing.' } };
  }
  const raw = input as Record<string, unknown>;
  const answers: Answers = {};
  const errors: Record<string, string> = {};

  for (const question of survey.sections.flatMap((section) => section.questions)) {
    // Follow-ups only point at earlier questions, so `answers` already holds what they need
    if (!isVisible(question, answers)) continue;

    const value = raw[question.id];
    const empty =
      value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (isRequired(question)) errors[question.id] = 'Please answer this question.';
      continue;
    }

    switch (question.type) {
      case 'single':
        if (typeof value === 'string' && question.options.includes(value)) answers[question.id] = value;
        else errors[question.id] = 'Choose one of the listed options.';
        break;

      case 'multi': {
        if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && question.options.includes(item))) {
          errors[question.id] = 'Choose from the listed options.';
          break;
        }
        const chosen = [...new Set(value as string[])];
        if (question.max && chosen.length > question.max) errors[question.id] = `Choose up to ${question.max}.`;
        else answers[question.id] = chosen;
        break;
      }

      case 'scale':
        if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) answers[question.id] = value;
        else errors[question.id] = 'Choose a number from 1 to 5.';
        break;

      case 'text': {
        if (typeof value !== 'string') {
          errors[question.id] = 'Enter your answer as text.';
          break;
        }
        const text = value.trim();
        const max = question.maxLength ?? DEFAULT_TEXT_MAX;
        if (!text) {
          if (isRequired(question)) errors[question.id] = 'Please answer this question.';
        } else if (text.length > max) {
          errors[question.id] = `Keep this under ${max} characters.`;
        } else {
          answers[question.id] = text;
        }
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers };
}

// Turn validated answers into a plain-text email, grouped by section
export function formatSurveyEmail(survey: Survey, answers: Answers, source?: string) {
  const lines: string[] = [];

  for (const section of survey.sections) {
    const answered = section.questions.filter((question) => answers[question.id] !== undefined);
    if (answered.length === 0) continue;

    lines.push(section.title.toUpperCase(), '');
    for (const question of answered) {
      const answer = answers[question.id];
      let shown: string;
      if (Array.isArray(answer)) shown = answer.map((item) => `  - ${item}`).join('\n');
      else if (question.type === 'scale') shown = `  ${answer} of 5 (1 = ${question.minLabel}, 5 = ${question.maxLabel})`;
      else shown = `  ${answer}`;
      lines.push(question.label, shown, '');
    }
  }

  const sentAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  lines.push('---', `Sent ${sentAt} Central${source ? ` · source: ${source}` : ''}`);

  // The first question (business or organization type) goes in the subject for easy scanning
  const firstAnswer = answers[survey.sections[0].questions[0].id];
  return {
    subject: `FeedForward ${survey.title.toLowerCase()}: ${firstAnswer}`,
    text: lines.join('\n'),
  };
}