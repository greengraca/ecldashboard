import * as fs from "fs";
import * as path from "path";
import { MongoClient } from "mongodb";

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[key] = val;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "eclbot");

  const runs = await db.collection("topdeck_month_dump_runs").find({}).sort({ month: 1 }).toArray();
  for (const run of runs) {
    const chunks = await db.collection("topdeck_month_dump_chunks")
      .find({ bracket_id: run.bracket_id, month: run.month, run_id: run.run_id })
      .sort({ chunk_index: 1 }).toArray();
    const json = chunks.map((c: any) => c.data).join("");
    const raw = JSON.parse(json);
    console.log(`${run.month} (${run.bracket_id}) | schema_version: ${raw.schema_version} | has entrant_to_uid: ${!!raw.entrant_to_uid} | uid count: ${raw.entrant_to_uid ? Object.keys(raw.entrant_to_uid).length : 0}`);
  }
  await client.close();
}
main().catch(console.error);
