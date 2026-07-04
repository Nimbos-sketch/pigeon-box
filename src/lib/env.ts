type EnvOptions = {
  fallback?: string;
  requiredInProduction?: boolean;
};

function readEnv(name: string, options: EnvOptions = {}): string | undefined {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (options.fallback !== undefined) {
    return options.fallback;
  }
  if (options.requiredInProduction && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return undefined;
}

function readRequired(name: string, aliases: string[] = []): string {
  const names = [name, ...aliases];
  for (const key of names) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
  }
  return "";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",

  get databaseUrl() {
    return readRequired("DATABASE_URL");
  },

  get authSecret() {
    return readRequired("AUTH_SECRET", ["NEXTAUTH_SECRET"]);
  },

  get authUrl() {
    return readEnv("AUTH_URL", { fallback: readEnv("NEXTAUTH_URL", { fallback: "http://localhost:3000" }) });
  },

  get googleClientId() {
    return readRequired("GOOGLE_CLIENT_ID", ["AUTH_GOOGLE_ID"]);
  },

  get googleClientSecret() {
    return readRequired("GOOGLE_CLIENT_SECRET", ["AUTH_GOOGLE_SECRET"]);
  },

  get tokenEncryptionKey() {
    return readRequired("TOKEN_ENCRYPTION_KEY");
  },

  get syncBatchSize() {
    return Number(readEnv("SYNC_BATCH_SIZE", { fallback: "50" }));
  },

  get openAiApiKey() {
    return readEnv("OPENAI_API_KEY");
  },

  get openAiModel() {
    return readEnv("OPENAI_MODEL", { fallback: "gpt-4o-mini" }) ?? "gpt-4o-mini";
  },

  /** Email content is only sent to OpenAI when explicitly enabled. */
  get aiOverviewEnabled() {
    return readEnv("AI_OVERVIEW_ENABLED") === "true" && Boolean(readEnv("OPENAI_API_KEY"));
  },

  get authDebug() {
    return readEnv("AUTH_DEBUG") === "true" && !this.isProduction;
  }
};

export function validateServerEnv(): void {
  if (!env.isProduction) {
    return;
  }

  env.databaseUrl;
  env.authSecret;
  env.googleClientId;
  env.googleClientSecret;
  env.tokenEncryptionKey;
}
