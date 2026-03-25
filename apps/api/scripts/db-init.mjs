import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");

const envContent = readFileSync(path.join(apiRoot, ".env"), "utf8");
const databaseUrlLine = envContent.split("\n").find((line) => line.startsWith("DATABASE_URL="));
const databaseUrl = databaseUrlLine?.split("=")[1]?.trim() ?? "file:./dev.db";
if (!databaseUrl.startsWith("file:")) {
  throw new Error("db-init currently supports SQLite file URLs only.");
}
const relativeDbPath = databaseUrl.replace("file:", "");
const dbCandidates = [
  path.resolve(apiRoot, relativeDbPath),
  path.resolve(apiRoot, "prisma", relativeDbPath)
];
for (const dbPath of dbCandidates) {
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-journal`, { force: true });
}

const sql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", {
  cwd: apiRoot,
  encoding: "utf8"
});

const sqlPath = path.join(apiRoot, "prisma", "init.sql");
writeFileSync(sqlPath, sql, "utf8");

execSync("npx prisma db execute --file prisma/init.sql --schema prisma/schema.prisma", {
  cwd: apiRoot,
  stdio: "inherit"
});

console.log("Database initialized from schema.");
