// Tiny typed extractors for component props coming from a SceneSpec / parsed script.
// Each throws on missing-without-default so unknown ids and missing args fail loudly,
// which is exactly what the script parser (#5) will rely on.

export class ParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParamError";
  }
}

export function num(v: unknown, fallback?: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (fallback !== undefined) return fallback;
  throw new ParamError(`expected number, got ${JSON.stringify(v)}`);
}

export function str(v: unknown, fallback?: string): string {
  if (typeof v === "string") return v;
  if (fallback !== undefined) return fallback;
  throw new ParamError(`expected string, got ${JSON.stringify(v)}`);
}

export function bool(v: unknown, fallback?: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  if (fallback !== undefined) return fallback;
  throw new ParamError(`expected boolean, got ${JSON.stringify(v)}`);
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback?: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  if (fallback !== undefined) return fallback;
  throw new ParamError(`expected one of [${allowed.join(", ")}], got ${JSON.stringify(v)}`);
}
