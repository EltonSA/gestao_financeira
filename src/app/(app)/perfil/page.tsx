import { getSession } from "@/lib/auth/session";
import { updateProfileAction } from "@/actions/settings";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Mail } from "lucide-react";

export default async function PerfilPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Seu perfil"
        description="Atualize seu nome de exibição. O e-mail é o seu identificador único."
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={s.user.name} size="lg" />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight truncate">{s.user.name}</p>
              <p className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] truncate">
                <Mail className="h-3.5 w-3.5" /> {s.user.email}
              </p>
            </div>
          </div>

          <form action={updateProfileAction} className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
            <Field label="Nome exibido">
              <Input name="name" defaultValue={s.user.name} required />
            </Field>
            <div className="pt-2">
              <Button type="submit" block>Atualizar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
