import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRatelimit(requests: number, window: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: false,
    prefix: "ecl-dashboard",
  });
}

/** 60 req/min for authenticated dashboard users */
export const authenticatedLimit = createRatelimit(60, "1 m");

/** 20 req/min for public/unauthenticated endpoints */
export const publicLimit = createRatelimit(20, "1 m");
