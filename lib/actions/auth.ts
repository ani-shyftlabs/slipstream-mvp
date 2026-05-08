"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function encodeError(message: string) {
  return encodeURIComponent(message);
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeError("Email and password are required.")}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeError(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/broker/dashboard");
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/signup?error=${encodeError("Email and password are required.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeError("Password must be at least 8 characters.")}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeError(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/broker/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
