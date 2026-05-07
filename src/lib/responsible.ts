/** Valor gravado em `responsible` quando a despesa/meta/fixo é atribuído a um filho cadastrado. */
export const CHILD_RESPONSIBLE_PREFIX = "child:" as const;

export function childResponsibleValue(childId: string) {
  return `${CHILD_RESPONSIBLE_PREFIX}${childId}`;
}

export function isChildResponsible(value: string) {
  return value.startsWith(CHILD_RESPONSIBLE_PREFIX);
}

export function parseChildIdFromResponsible(value: string): string | null {
  if (!isChildResponsible(value)) return null;
  const id = value.slice(CHILD_RESPONSIBLE_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export type ResponsibleLabelsCtx = {
  p1: string;
  p2: string;
  children: { id: string; name: string }[];
};

export function labelForResponsible(value: string, ctx: ResponsibleLabelsCtx): string {
  if (value === "person1") return ctx.p1;
  if (value === "person2") return ctx.p2;
  if (value === "both") return "Ambos";
  const cid = parseChildIdFromResponsible(value);
  if (cid) {
    return ctx.children.find((c) => c.id === cid)?.name ?? "Filho(a)";
  }
  return value;
}
