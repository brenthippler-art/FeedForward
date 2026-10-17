'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findDemoUser } from '@/lib/demo-users';
import { SESSION_COOKIE } from '@/lib/session';

export async function signIn(formData: FormData) {
  const user = findDemoUser(Number(formData.get('orgId')));
  if (!user) redirect('/?signin=1');

//   This is a demo identity, not secure authentication. In a real application, you would verify the user's credentials and create a secure session.  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(user.orgId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(user.role === 'donor' ? '/donor' : '/recipient');
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/?signin=1');
}