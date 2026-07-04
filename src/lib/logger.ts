type LogPayload = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[_-]?key|refresh|access|credential|ssn)/i;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 240) {
      return `${value.slice(0, 120)}…[redacted]`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = sanitizeValue(nested);
      }
    }
    return sanitized;
  }
  return value;
}

function write(level: "info" | "warn" | "error", payload: LogPayload | undefined, message: string) {
  const safePayload = payload ? (sanitizeValue(payload) as LogPayload) : undefined;
  const line = safePayload ? `${message} ${JSON.stringify(safePayload)}` : message;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(payload: LogPayload, message: string) {
    write("info", payload, message);
  },
  warn(payload: LogPayload, message: string) {
    write("warn", payload, message);
  },
  error(payload: LogPayload, message: string) {
    write("error", payload, message);
  }
};
