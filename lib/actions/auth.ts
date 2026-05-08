"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["broker", "mga", "insurer"] as const;
type Role = (typeof VALID_ROLES)[number];

function encodeError(message: string) {
  return encodeURIComponent(message);
}

function dashboardForRole(role: string | undefined | null): string {
  return (VALID_ROLES as readonly string[]).includes(role ?? "")
    ? `/${role}/dashboard`
    : "/broker/dashboard";
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeError("Email and password are required.")}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeError(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(dashboardForRole(data.user?.user_metadata?.role));
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "broker");
  const role: Role = (VALID_ROLES as readonly string[]).includes(requestedRole)
    ? (requestedRole as Role)
    : "broker";

  if (!email || !password) {
    redirect(`/signup?error=${encodeError("Email and password are required.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeError("Password must be at least 8 characters.")}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });

  if (error) {
    redirect(`/signup?error=${encodeError(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/${role}/dashboard`);
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
