interface RateWindow {
  start: number;
  count: number;
}

// a fixed window per client: a brake on runaway agent loops, not billing.
export class RateLimiter {
  private readonly windows = new Map<string, RateWindow>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now
  ) {}

  // returns 0 when the request may proceed, else seconds until the reset.
  check(key: string): number {
    const now = this.now();
    const window = this.windows.get(key);

    if (!window || now - window.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });

      return 0;
    }

    if (window.count >= this.limit)
      return Math.ceil((window.start + this.windowMs - now) / 1000);

    window.count += 1;

    return 0;
  }
}
