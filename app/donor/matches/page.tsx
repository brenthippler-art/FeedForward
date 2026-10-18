import SuggestedRecipients from '@/components/SuggestedRecipients';
import { requireRole } from '@/lib/session';

export const metadata = { title: 'Suggested recipients' };

export default async function MatchesPage({ searchParams }: {
  searchParams: Promise<{ listingId?: string | string[] }>;
}) {
  await requireRole('donor');
  const { listingId } = await searchParams;
  return <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-14 pt-8">
    <h1 className="font-display text-[34px] font-bold">Suggested recipients</h1>
    <SuggestedRecipients key={String(listingId ?? '')} requestedListingId={Array.isArray(listingId) ? 'invalid' : listingId} />
  </main>;
}
