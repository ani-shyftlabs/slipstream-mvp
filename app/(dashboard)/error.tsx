"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="rounded-xl border border-error/30 bg-error/5 p-8 flex flex-col gap-3">
        <h2 className="font-serif text-2xl text-navy">Something went wrong.</h2>
        <p className="font-sans text-sm text-ink/70">
          We hit an error rendering this view. The team has been notified. You can retry, or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="font-mono text-[11px] text-ink/40">ref: {error.digest}</p>
        )}
        <div className="flex gap-3 mt-2">
          <Button onClick={reset}>Retry</Button>
          <Button asChild variant="outline">
            <a href="/">Go to Slipstream home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
