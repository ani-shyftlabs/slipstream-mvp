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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteParty } from "@/lib/actions/parties";
import type { InvitableProfile } from "@/lib/queries/profiles";

export function InvitePartyModal({
  dealRoomId,
  invitable,
}: {
  dealRoomId: string;
  invitable: InvitableProfile[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [partyId, setPartyId] = useState<string>("");
  const [role, setRole] = useState<"mga" | "insurer">("mga");
  const router = useRouter();

  const eligible = invitable.filter((p) => p.role === role);

  function submit() {
    if (!partyId) {
      toast.error("Pick a profile to invite.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("deal_room_id", dealRoomId);
      formData.set("party_user_id", partyId);
      formData.set("role", role);
      const result = await inviteParty(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Party invited.");
      setOpen(false);
      setPartyId("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Invite Party</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a party</DialogTitle>
          <DialogDescription>
            Pick an MGA or insurer profile and assign a role on this deal room.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => {
                setRole(v as "mga" | "insurer");
                setPartyId("");
              }}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 text-sm font-sans text-ink cursor-pointer">
                <RadioGroupItem value="mga" id="role-mga" /> MGA
              </label>
              <label className="flex items-center gap-2 text-sm font-sans text-ink cursor-pointer">
                <RadioGroupItem value="insurer" id="role-insurer" /> Insurer
              </label>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Profile</Label>
            {eligible.length === 0 ? (
              <p className="text-sm font-sans text-ink/60 border border-silver rounded-md px-3 py-2">
                No eligible {role.toUpperCase()} profiles available.
              </p>
            ) : (
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select an ${role.toUpperCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.full_name ?? p.email) +
                        (p.org_name ? ` — ${p.org_name}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !partyId}>
            {pending ? "Inviting…" : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
