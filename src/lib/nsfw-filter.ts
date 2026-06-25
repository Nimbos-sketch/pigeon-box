export type NsfwCheckInput = {
  subject?: string | null;
  fromAddress?: string | null;
  snippet?: string | null;
};

const NSFW_KEYWORD_PATTERN =
  /\b(nsfw|xxx|porn|porno|pornography|adult\s*content|onlyfans|fansly|nude|nudes|naked|sexting|sext|escort|hookup|camgirl|webcam\s*girl|erotic|hentai|x-rated|x rated)\b/i;

const NSFW_DOMAIN_PATTERN =
  /@(?:[^@\s]*\.)?(onlyfans|pornhub|xvideos|xhamster|chaturbate|redtube|brazzers|youporn|fanvue|manyvids)\./i;

const NSFW_SUBJECT_PATTERN =
  /\b(18\+|21\+|adults?\s+only|explicit\s+content|meet\s+singles|hot\s+singles)\b/i;

export function isNsfwEmail(input: NsfwCheckInput): boolean {
  const text = `${input.subject ?? ""} ${input.fromAddress ?? ""} ${input.snippet ?? ""}`.trim();
  if (!text) {
    return false;
  }
  return (
    NSFW_KEYWORD_PATTERN.test(text) ||
    NSFW_DOMAIN_PATTERN.test(text) ||
    NSFW_SUBJECT_PATTERN.test(text)
  );
}

export function redactNsfwPreview<T extends NsfwCheckInput>(input: T): T & { isNsfw: true } {
  return {
    ...input,
    isNsfw: true,
    subject: "Content blocked",
    snippet: "This message was hidden by the NSFW filter.",
    fromAddress: input.fromAddress ? "Sender hidden" : input.fromAddress
  };
}

export function withNsfwFlag<T extends NsfwCheckInput & { gmailId?: string }>(
  message: T
): T & { isNsfw: boolean } {
  const isNsfw = isNsfwEmail(message);
  if (!isNsfw) {
    return { ...message, isNsfw: false };
  }
  return redactNsfwPreview(message);
}
