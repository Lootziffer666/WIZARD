import { getDb } from "../src/lib/db";

async function main() {
  const db = getDb();
  const countResult = await db.execute("SELECT COUNT(*) AS c FROM assets");
  const count = Number(countResult.rows[0]?.c ?? 0);

  const platformsResult = await db.execute(
    "SELECT DISTINCT platform FROM assets ORDER BY platform"
  );
  const categoriesResult = await db.execute(
    "SELECT DISTINCT category FROM assets ORDER BY category"
  );

  const platforms = platformsResult.rows as unknown as { platform: string }[];

  console.log(`Database ready: ${count} assets`);
  console.log(`Platforms: ${platforms.map((p) => p.platform).join(", ")}`);
  console.log(`Distinct categories: ${categoriesResult.rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
