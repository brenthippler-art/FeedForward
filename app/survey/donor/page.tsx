import SurveyForm from '@/components/SurveyForm';

export const metadata = { title: 'Restaurant survey' };

export default function DonorSurveyPage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-14 pt-8">
      <h1 className="font-display text-[34px] font-bold">Restaurant survey</h1>
      <SurveyForm kind="donor" />
    </main>
  );
}