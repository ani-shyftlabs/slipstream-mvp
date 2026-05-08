import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/actions/auth";

type SearchParams = { error?: string };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl text-navy tracking-wide">Slipstream</h1>
        <p className="mt-1 font-sans text-sm text-ink/60">
          Specialty insurance placement OS
        </p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="font-serif text-2xl text-navy">Sign in</h2>
          <p className="font-sans text-sm text-ink/70">
            Use your work email and password.
          </p>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@firm.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {searchParams?.error && (
              <p className="text-sm text-error font-sans">{searchParams.error}</p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm font-sans text-ink/70">
            New here?{" "}
            <Link href="/signup" className="text-navy underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
