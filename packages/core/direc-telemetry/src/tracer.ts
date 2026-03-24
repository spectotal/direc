import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type SpanStatus = "ok" | "error";

export interface Span {
  id: string;
  name: string;
  startMs: number;
  endMs?: number;
  parentId?: string;
  attrs: Record<string, unknown>;
  status?: SpanStatus;
  errorMessage?: string;
}

class Tracer {
  private als = new AsyncLocalStorage<Span>();
  readonly spans: Span[] = [];

  async withSpan<T>(
    name: string,
    attrs: Record<string, unknown>,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    const parent = this.als.getStore();
    const span: Span = {
      id: crypto.randomUUID(),
      name,
      startMs: performance.now(),
      parentId: parent?.id,
      attrs: { ...attrs },
    };
    this.spans.push(span);

    return this.als.run(span, async () => {
      try {
        const result = await fn(span);
        span.endMs = performance.now();
        span.status = "ok";
        return result;
      } catch (err) {
        span.endMs = performance.now();
        span.status = "error";
        span.errorMessage = err instanceof Error ? err.message : String(err);
        throw err;
      }
    });
  }

  current(): Span | undefined {
    return this.als.getStore();
  }

  reset(): void {
    this.spans.length = 0;
  }
}

export const tracer = new Tracer();
