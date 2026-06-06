"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-accent-brand uppercase tracking-wider">Error</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 text-text-secondary max-w-md">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}
