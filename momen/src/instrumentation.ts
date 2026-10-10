// Vercel servers run in UTC. Pin the shop's timezone so "today", due dates and
// month boundaries match the clock in the shop.
export function register() {
  process.env.TZ = process.env.APP_TIMEZONE || "Africa/Lagos";
}
