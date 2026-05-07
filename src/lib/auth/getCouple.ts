import "server-only";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireAuthCoupleId() {
  const s = await requireAuth();
  return s.user.coupleId;
}
