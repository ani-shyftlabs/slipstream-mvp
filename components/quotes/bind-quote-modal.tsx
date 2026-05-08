"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { bindQuote } from "@/lib/actions/bind";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BindQuoteModal({
  dealRoomId,
  quoteId,
  partyName,
  premium,
}: {
  dealRoomId: string;
  quoteId: string;
  partyName: string;
  premium: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("deal_room_id", dealRoomId);
      formData.set("quote_id", quoteId);
      const result = await bindQuote(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Quote bound. Deal room is now in Bound state.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Bind</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bind this quote?</DialogTitle>
          <DialogDescription>
            Selecting this quote transitions the deal room to <strong>Bound</strong>, marks all other quotes <strong>lost</strong>, and locks further quoting.
          </DialogDescription>
        </DialogHeader>
        <div className="border border-silver rounded-md p-4 my-2">
          <p className="font-sans text-sm text-ink">
            <strong>{partyName}</strong>
          </p>
          <p className="font-mono text-sm text-navy mt-1">
            Premium: {formatCurrency(premium)}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? "Binding…" : "Confirm bind"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
