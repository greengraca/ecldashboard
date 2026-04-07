export async function register() {
  // Pre-warm MongoDB connection on server startup so API routes don't wait for cold connect
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./lib/mongodb");
    try {
      await getDb();
      console.log("[instrumentation] MongoDB connection pre-warmed");
    } catch (err) {
      console.warn("[instrumentation] MongoDB pre-warm failed, will retry on first request:", err);
    }
  }
}
