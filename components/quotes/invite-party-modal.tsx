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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteParty, invitePartyByEmail } from "@/lib/actions/parties";
import type { InvitableProfile } from "@/lib/queries/profiles";
import { cn } from "@/lib/utils";

type Tab = "directory" | "email";

export function InvitePartyModal({
  dealRoomId,
  invitable,
}: {
  dealRoomId: string;
  invitable: InvitableProfile[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("directory");

  // Directory tab state
  const [partyId, setPartyId] = useState<string>("");
  const [role, setRole] = useState<"mga" | "insurer">("mga");

  // Email tab state
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<"mga" | "insurer">("mga");
  const [fullName, setFullName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const eligible = invitable.filter((p) => p.role === role);

  function submitDirectory() {
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

  function submitEmail() {
    setEmailError(null);
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("deal_room_id", dealRoomId);
      formData.set("email", email.trim());
      formData.set("role", emailRole);
      if (fullName.trim()) formData.set("full_name", fullName.trim());
      const result = await invitePartyByEmail(formData);
      if (result.error) {
        setEmailError(result.error);
        return;
      }
      toast.success(
        `Invited ${email.trim()} as ${emailRole.toUpperCase()}.${
          result.data?.was_new_user ? " (new account)" : ""
        }`,
      );
      setOpen(false);
      setEmail("");
      setFullName("");
      setEmailError(null);
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
            Choose an existing profile, or invite a new market by email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border border-silver rounded-md p-1 bg-silver/30 self-start mt-1">
          <button
            type="button"
            onClick={() => setTab("directory")}
            className={cn(
              "px-3 py-1 text-xs font-sans rounded transition-colors",
              tab === "directory" ? "bg-white text-navy shadow-mac-sm" : "text-ink/60 hover:text-ink",
            )}
          >
            From Directory
          </button>
          <button
            type="button"
            onClick={() => setTab("email")}
            className={cn(
              "px-3 py-1 text-xs font-sans rounded transition-colors",
              tab === "email" ? "bg-white text-navy shadow-mac-sm" : "text-ink/60 hover:text-ink",
            )}
          >
            By Email
          </button>
        </div>

        {tab === "directory" ? (
          <>
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
                    No eligible {role.toUpperCase()} profiles available. Use the &ldquo;By Email&rdquo; tab.
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
              <Button onClick={submitDirectory} disabled={pending || !partyId}>
                {pending ? "Inviting…" : "Invite"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-5 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="carrier@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <RadioGroup
                  value={emailRole}
                  onValueChange={(v) => setEmailRole(v as "mga" | "insurer")}
                  className="flex gap-6"
                >
                  <label className="flex items-center gap-2 text-sm font-sans text-ink cursor-pointer">
                    <RadioGroupItem value="mga" id="email-role-mga" /> MGA
                  </label>
                  <label className="flex items-center gap-2 text-sm font-sans text-ink cursor-pointer">
                    <RadioGroupItem value="insurer" id="email-role-insurer" /> Insurer
                  </label>
                </RadioGroup>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-name">Name (optional)</Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="Jane Smith — AIG"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={pending}
                />
              </div>
              {emailError && (
                <p className="text-sm font-sans text-error">{emailError}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={submitEmail} disabled={pending || !email.trim()}>
                {pending ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
