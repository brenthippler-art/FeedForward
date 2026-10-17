import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findDemoUser, type Role } from './demo-users';

export const SESSION_COOKIE = 'ff_demo_user';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return value ? findDemoUser(Number(value)) : undefined;
}

export async function requireRole(role: Role) {
  const user = await getCurrentUser();
  if (!user || user.role !== role) redirect('/#sign-in');
  return user;
}