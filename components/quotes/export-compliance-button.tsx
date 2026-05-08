"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCompliancePackage } from "@/lib/actions/compliance";

export function ExportComplianceButton({
  dealRoomId,
  insuredName,
}: {
  dealRoomId: string;
  insuredName: string;
}) {
  const [pending, startTransition] = useTransition();

  function exportPackage() {
    startTransition(async () => {
      const result = await getCompliancePackage(dealRoomId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const json = JSON.stringify(result.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const slug = insuredName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `slipstream-${slug}-${dealRoomId.slice(0, 8)}-compliance.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Compliance package downloaded.");
    });
  }

  return (
    <Button variant="default" onClick={exportPackage} disabled={pending}>
      {pending ? "Preparing…" : "Export Compliance Package"}
    </Button>
  );
}
