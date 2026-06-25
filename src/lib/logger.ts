type LogPayload = Record<string, unknown>;

function write(level: "info" | "warn" | "error", payload: LogPayload | undefined, message: string) {
  const line = payload ? `${message} ${JSON.stringify(payload)}` : message;
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
