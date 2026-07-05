"use client";

import { useRouter } from "next/navigation";
import { removeMemberAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserMinus } from "lucide-react";

export function RemoveMemberButton({
  userId,
  memberName,
  variant = "adult",
}: {
  userId: string;
  memberName: string;
  /** adult = parceiro(a); child = conta de filho(a) */
  variant?: "adult" | "child";
}) {
  const router = useRouter();
  const isChild = variant === "child";

  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[var(--danger-strong)] hover:bg-[var(--danger-soft)]"
          leftIcon={<UserMinus className="h-3.5 w-3.5" />}
        >
          {isChild ? "Remover conta" : "Remover membro"}
        </Button>
      }
      title={isChild ? "Remover conta do filho(a)?" : "Remover membro do casal?"}
      description={
        isChild ? (
          <>
            A conta de login de <strong>{memberName}</strong> será excluída. O cadastro na
            lista de filhos e os lançamentos no nome dele(a) permanecem — você pode gerar um
            novo link de convite depois.
          </>
        ) : (
          <>
            <strong>{memberName}</strong> perderá o acesso à conta do casal. Despesas e
            histórico com o nome dessa pessoa são mantidos. Você poderá convidar outra pessoa
            de novo pelo link de convite.
          </>
        )
      }
      confirmLabel={isChild ? "Remover conta" : "Remover membro"}
      onConfirm={async () => {
        const r = await removeMemberAction(userId);
        if (r && "error" in r && r.error) {
          throw new Error(String(r.error));
        }
        router.refresh();
      }}
    />
  );
}
