import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-accent-brand uppercase tracking-wider">404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">Page not found</h1>
      <p className="mt-3 text-text-secondary max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
