import { requireRole } from '@/lib/session';
import { mockListingsFor } from '@/lib/mock';
import RecipientBoard from '@/components/RecipientBoard';

export const metadata = { title: 'Available food' };

export default async function RecipientPage() {
  const user = await requireRole('recipient');

  // TODO: replace with GET /api/listings?recipientId=${user.orgId}
  const listings = mockListingsFor(user.orgId);

  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-muted">{user.name} · recipient</p>
        <h1 className="font-display text-4xl font-bold">Available for you</h1>
      </div>
      <RecipientBoard key={user.orgId} listings={listings} />
    </main>
  );
}