import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries/profile";

export default async function Home() {
  const ctx = await getCurrentProfile();
  if (!ctx) redirect("/login");
  redirect(`/${ctx.role}/dashboard`);
}
