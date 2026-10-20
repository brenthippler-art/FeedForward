import SurveyForm from '@/components/SurveyForm';

export const metadata = { title: 'Recipient survey' };

export default function RecipientSurveyPage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-14 pt-8">
      <h1 className="font-display text-[34px] font-bold">Recipient survey</h1>
      <SurveyForm kind="recipient" />
    </main>
  );
}