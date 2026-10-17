import DonorForm from '@/components/DonorForm';
import { requireRole } from '@/lib/session';

export const metadata = { title: 'Post surplus' };

export default async function DonorPage() {
  const user = await requireRole('donor');

  return (
    <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-14 pt-8">
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] text-muted">{user.name} · donor</p>
        <h1 className="font-display text-[34px] font-bold">Post tonight&apos;s surplus</h1>
      </div>
      <DonorForm />
    </main>
  );
}