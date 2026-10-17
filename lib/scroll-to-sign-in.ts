export function scrollToSignIn(): boolean {
  const section = document.getElementById('sign-in');
  if (!section) return false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

  document.getElementById('sign-in-heading')?.focus({ preventScroll: true });

  // Remove ?signin=1 or #sign-in so the address bar shows a clean "/"
  if (window.location.search || window.location.hash) {
    history.replaceState(null, '', '/');
  }

  return true;
}