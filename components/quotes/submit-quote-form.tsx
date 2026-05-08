"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitQuote } from "@/lib/actions/quotes";

export function SubmitQuoteForm({ dealRoomId }: { dealRoomId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) => {
        formData.set("deal_room_id", dealRoomId);
        startTransition(async () => {
          const result = await submitQuote(formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Quote submitted.");
          router.refresh();
        });
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="premium">Premium (USD)</Label>
          <Input
            id="premium"
            name="premium"
            type="number"
            min={0}
            step={1000}
            required
            placeholder="250000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deductible">Deductible (USD)</Label>
          <Input
            id="deductible"
            name="deductible"
            type="number"
            min={0}
            step={1000}
            placeholder="25000"
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="coverage_limit">Coverage limit (USD)</Label>
          <Input
            id="coverage_limit"
            name="coverage_limit"
            type="number"
            min={0}
            step={1000}
            required
            placeholder="5000000"
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="terms">Terms</Label>
          <Textarea
            id="terms"
            name="terms"
            rows={4}
            required
            maxLength={2000}
            placeholder="Standard 12-month GL. Notable exclusions: …"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-silver">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit Quote"}
        </Button>
      </div>
    </form>
  );
}
