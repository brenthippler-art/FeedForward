import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/app/actions/session";
import HeaderNav from "@/components/HeaderNav";
import SignInLink from "@/components/SignInLink";

const navByRole = {
  donor: [
    { href: "/donor", label: "Post surplus" },
    { href: "/dashboard", label: "Impact" },
  ],
  recipient: [
    { href: "/recipient", label: "Available food" },
    { href: "/dashboard", label: "Impact" },
  ],
};

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
        <Link href="/" className="font-display text-2xl font-bold">
          FeedForward
        </Link>

        {user ? (
          <div className="flex flex-wrap items-center gap-3">
            <HeaderNav links={navByRole[user.role]} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/85">
                Signed in as <strong className="text-white">{user.name}</strong>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="min-h-11 rounded-[10px] px-3 text-sm font-bold underline hover:bg-white/10"
                >
                  Switch
                </button>
              </form>
            </div>
          </div>
        ) : (
          <SignInLink className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 font-bold text-brand hover:bg-ground">
            Try the demo
          </SignInLink>
        )}
      </div>
    </header>
  );
}

export function SiteHeaderFallback() {
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl font-bold">
          FeedForward
        </Link>
      </div>
    </header>
  );
}
