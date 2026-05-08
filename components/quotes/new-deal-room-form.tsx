"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASS_OF_BUSINESS, COVERAGE_TYPES } from "@/lib/constants/coverage-types";
import { createDealRoom } from "@/lib/actions/deal-rooms";

export function NewDealRoomForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await createDealRoom(formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Deal room created.");
          router.push(`/broker/quotes/${result.data!.id}`);
          router.refresh();
        })
      }
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="insured_name">Insured name</Label>
          <Input
            id="insured_name"
            name="insured_name"
            required
            maxLength={200}
            placeholder="Acme Manufacturing"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="class_of_business">Class of business</Label>
          <Select name="class_of_business" required>
            <SelectTrigger id="class_of_business">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASS_OF_BUSINESS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            required
            maxLength={100}
            placeholder="Ontario, Canada"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="coverage_type">Coverage type</Label>
          <Select name="coverage_type" required>
            <SelectTrigger id="coverage_type">
              <SelectValue placeholder="Select coverage" />
            </SelectTrigger>
            <SelectContent>
              {COVERAGE_TYPES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="coverage_amount">Coverage amount (USD)</Label>
          <Input
            id="coverage_amount"
            name="coverage_amount"
            type="number"
            min={0}
            step={1000}
            placeholder="5000000"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            maxLength={2000}
            rows={4}
            placeholder="Loss runs attached. Renewals due Q3."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-silver">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create deal room"}
        </Button>
      </div>
    </form>
  );
}
