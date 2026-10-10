// Copies the database and photos into backups/<date-time>/. Run: npm run backup
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const dest = path.join(root, "backups", stamp);
mkdirSync(dest, { recursive: true });

const db = path.join(root, "prisma", "momen.db");
if (existsSync(db)) cpSync(db, path.join(dest, "momen.db"));
const uploads = path.join(root, "uploads");
if (existsSync(uploads)) cpSync(uploads, path.join(dest, "uploads"), { recursive: true });

console.log(`Backup saved to ${path.relative(root, dest)}`);
