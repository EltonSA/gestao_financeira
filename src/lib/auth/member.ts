import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { childResponsibleValue } from "@/lib/responsible";

export function isChildAccount(user: { linkedChildId: string | null | undefined }) {
  return Boolean(user.linkedChildId);
}

export async function requireAdultAuth() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (isChildAccount(s.user)) redirect("/");
  return s;
}

export function responsibleTagForChildUser(
  user: { linkedChildId: string | null | undefined }
): string | null {
  if (!user.linkedChildId) return null;
  return childResponsibleValue(user.linkedChildId);
}

export function lockedResponsibleCtx(
  user: { linkedChildId: string | null | undefined },
  children: { id: string; name: string }[]
): { lockedResponsible?: string; lockedResponsibleLabel?: string } {
  if (!user.linkedChildId) return {};
  const label = children.find((c) => c.id === user.linkedChildId)?.name ?? "Você";
  return {
    lockedResponsible: childResponsibleValue(user.linkedChildId),
    lockedResponsibleLabel: label,
  };
}
