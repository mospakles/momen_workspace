import path from "node:path";

// Photos live outside /public so they are only served to a logged-in owner.
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
