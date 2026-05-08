import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NewDealRoomForm } from "@/components/quotes/new-deal-room-form";

export default function NewDealRoomPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-navy">New Deal Room</h1>
          <p className="font-sans text-sm text-ink/70 mt-1">
            Capture the placement basics. You can invite parties on the next screen.
          </p>
        </div>
        <Link
          href="/broker/dashboard"
          className="text-sm font-sans text-ink/60 hover:text-ink underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-serif text-xl text-navy">Submission</h2>
          <p className="font-sans text-sm text-ink/70">
            Structured fields only — document upload arrives in a later cycle.
          </p>
        </CardHeader>
        <CardContent>
          <NewDealRoomForm />
        </CardContent>
      </Card>
    </div>
  );
}
