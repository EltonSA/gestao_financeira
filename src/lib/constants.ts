export const INSTITUTIONS = [
  { value: "nubank", label: "Nubank" },
  { value: "itau", label: "Itaú" },
  { value: "santander", label: "Santander" },
  { value: "c6", label: "C6 Bank" },
  { value: "inter", label: "Inter" },
  { value: "bradesco", label: "Bradesco" },
  { value: "other", label: "Outro" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
] as const;

export const DEFAULT_CATEGORY_SEED: { name: string; slug: string }[] = [
  { name: "Moradia", slug: "moradia" },
  { name: "Mercado", slug: "mercado" },
  { name: "Transporte", slug: "transporte" },
  { name: "Saúde", slug: "saude" },
  { name: "Educação", slug: "educacao" },
  { name: "Lazer", slug: "lazer" },
  { name: "Restaurantes", slug: "restaurantes" },
  { name: "Assinaturas", slug: "assinaturas" },
  { name: "Cartão de crédito", slug: "cartao-credito" },
  { name: "Contas da casa", slug: "contas-casa" },
  { name: "Pets", slug: "pets" },
  { name: "Viagens", slug: "viagens" },
  { name: "Compras pessoais", slug: "compras-pessoais" },
  { name: "Emergência", slug: "emergencia" },
  { name: "Outros", slug: "outros" },
];

export const GOAL_CATEGORIES = [
  { value: "travel", label: "Viagem" },
  { value: "emergency", label: "Reserva de emergência" },
  { value: "purchase", label: "Compra" },
  { value: "investment", label: "Investimento" },
  { value: "house", label: "Casa" },
  { value: "car", label: "Carro" },
  { value: "other", label: "Outro" },
] as const;
