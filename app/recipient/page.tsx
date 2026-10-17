import { requireRole } from '@/lib/session';

export const metadata = { title: 'Available food' };

export default async function RecipientPage() {
  const user = await requireRole('recipient');

  return (
    <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-14 pt-8">
      <p className="text-[15px] text-muted">{user.name} · recipient</p>
      <h1 className="font-display text-[34px] font-bold">Available food</h1>
    </main>
  );
}