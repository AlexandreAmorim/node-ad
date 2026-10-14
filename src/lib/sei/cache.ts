/** Cache TTL em memória com dedupe de requisições em voo. */
export class TtlCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly ttlMs: number) {}

  async wrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.ttlMs === 0) return fn();

    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }

    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = fn()
      .then((value) => {
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

/** Limita concorrência sem depender de p-limit (ESM). */
export function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
    try {
      return await fn();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  };
}
