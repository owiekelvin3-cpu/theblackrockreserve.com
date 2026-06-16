import Link from "next/link";
import Logo from "@/components/layout/Logo";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-8 bg-bg-primary text-text-primary">
      <div className="max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <Logo href={null} size="lg" />
        </div>
        <h1 className="text-2xl font-bold mb-3">You are offline</h1>
        <p className="text-text-muted mb-6 leading-relaxed">
          BlackrockReserve needs a connection for live balances and secure actions.
          Previously visited pages may still be available when you go back.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-3 rounded-full brand-gradient-bg text-white font-semibold"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
