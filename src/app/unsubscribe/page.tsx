import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe | Burger Price Index",
  robots: { index: false, follow: false },
  alternates: { canonical: "/unsubscribe" },
};

type Props = { searchParams: Promise<{ token?: string; done?: string }> };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full rounded-3xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light p-10 text-center shadow-sm">
        <p className="font-mono text-xs tracking-widest text-ketchup mb-4">BPI · NEWSLETTER</p>
        {children}
        <p className="mt-8 text-sm">
          <Link href="/" className="underline decoration-dotted text-gray-500 hover:text-ketchup">
            Back to the terminal
          </Link>
        </p>
      </div>
    </main>
  );
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, done } = await searchParams;

  let body: React.ReactNode;
  if (done === "1") {
    body = (
      <>
        <h1 className="font-headline text-2xl mb-3">You&apos;re off the list.</h1>
        <p className="text-gray-600 dark:text-gray-300">
          No more Monday prints in your inbox. Burger prices will keep moving without you, and
          you can always rejoin from the homepage.
        </p>
      </>
    );
  } else if (done === "0" || !token) {
    body = (
      <>
        <h1 className="font-headline text-2xl mb-3">That link didn&apos;t work.</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Use the unsubscribe link at the bottom of any BPI email. If you keep getting mail you
          don&apos;t want, reply to it and we&apos;ll take you off by hand.
        </p>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="font-headline text-2xl mb-3">Unsubscribe from the BPI?</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          One click and the weekly print stops. No survey, no guilt trip.
        </p>
        <form method="post" action="/api/unsubscribe">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-ketchup text-white font-semibold hover:opacity-90"
          >
            Unsubscribe me
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Card>{body}</Card>
      <Footer />
    </>
  );
}
