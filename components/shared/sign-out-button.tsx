import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/10 font-sans"
      >
        Sign out
      </Button>
    </form>
  );
}
