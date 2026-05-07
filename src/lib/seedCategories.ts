import { db, schema } from "@/lib/db";
import { DEFAULT_CATEGORY_SEED } from "@/lib/constants";
import { isNull } from "drizzle-orm";

export async function ensureSystemCategories() {
  const [c] = await db
    .select()
    .from(schema.categories)
    .where(isNull(schema.categories.coupleId))
    .limit(1);
  if (c) return;
  for (const x of DEFAULT_CATEGORY_SEED) {
    await db.insert(schema.categories).values({
      id: crypto.randomUUID(),
      coupleId: null,
      name: x.name,
      slug: x.slug,
      isSystem: true,
    });
  }
}
