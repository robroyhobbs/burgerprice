import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { confirmByToken } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm subscription | Burger Price Index",
  robots: { index: false, follow: false },
  alternates: { canonical: "/confirm" },
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;
  let email: string | null = null;
  let failed = false;
  if (token) {
    try {
      email = await confirmByToken(token);
    } catch (err) {
      console.error("confirm failed:", err);
      failed = true;
    }
  }

  return (
    <>
      <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full rounded-3xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light p-10 text-center shadow-sm">
          <p className="font-mono text-xs tracking-widest text-ketchup mb-4">BPI · NEWSLETTER</p>
          {email ? (
            <>
              <h1 className="font-headline text-2xl mb-3">You&apos;re on the tape. 🍔</h1>
              <p className="text-gray-600 dark:text-gray-300">
                The weekly Burger Price Index lands in your inbox every Monday, with the national
                print, the movers, and the Burger of the Week.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-headline text-2xl mb-3">
                {failed ? "Something went sideways." : "That link didn't work."}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {failed
                  ? "Please try the link again in a minute."
                  : "It may have expired or already been used. You can sign up again from the homepage."}
              </p>
            </>
          )}
          <p className="mt-8 text-sm">
            <Link href="/" className="underline decoration-dotted text-gray-500 hover:text-ketchup">
              Back to the terminal
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
