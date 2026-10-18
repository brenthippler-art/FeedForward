import type { Metadata } from 'next';
import ImpactDashboard from '@/components/ImpactDashboard';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Impact' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <main id="main"><ImpactDashboard key={user?.orgId ?? 'global'} recipientName={user?.role === 'recipient' ? user.name : undefined} /></main>;
}
