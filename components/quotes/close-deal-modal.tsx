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
import { closeDealRoom } from "@/lib/actions/bind";

export function CloseDealModal({ dealRoomId }: { dealRoomId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("deal_room_id", dealRoomId);
      const result = await closeDealRoom(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Deal room closed.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Close Deal Room</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this deal room?</DialogTitle>
          <DialogDescription>
            Once closed, the deal room is archived. The audit trail and bound quote remain accessible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? "Closing…" : "Confirm close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
