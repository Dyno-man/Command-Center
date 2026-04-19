import { CourseOfActionResult, Decision } from "@/lib/types";

type ValidationSuccess = {
  ok: true;
  result: CourseOfActionResult;
};

type ValidationFailure = {
  ok: false;
  error: string;
};

function preprocess(content: string) {
  return content
    .replace(/^```[a-zA-Z0-9_-]*\s*/g, "")
    .replace(/\s*```$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*---\s*$/gm, "")
    .replace(/\s+(#{1,6}\s)/g, "\n$1")
    .trim();
}

function extractSection(content: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)#{1,6}\\s*${escapedHeading}\\s*(?:\\n|\\s+)([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`, "i");
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function normalizeTextBlock(value: string) {
  return value
    .replace(/^\s*-\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function parseTradeSection(value: string) {
  const lines = value.split("\n");
  const capture = (label: string) => {
    const line = lines.find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line?.slice(label.length + 1).trim() ?? "";
  };

  const thesis = normalizeTextBlock(extractInlineBlock(value, "Thesis"));
  const whyNow = normalizeTextBlock(extractInlineBlock(value, "Why Now"));
  const risks = normalizeTextBlock(extractInlineBlock(value, "Risks"));
  const invalidation = normalizeTextBlock(extractInlineBlock(value, "Invalidation"));
  const confidenceRaw = capture("Confidence");
  const confidence = Number(confidenceRaw);

  return {
    asset: capture("Asset"),
    direction: capture("Direction"),
    horizon: capture("Time Horizon"),
    thesis,
    whyNow,
    risks,
    invalidation,
    confidence
  };
}

function extractInlineBlock(value: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedHeading}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z ]+:|$)`, "i");
  const match = value.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function validateDecision(value: string): Decision | null {
  const normalized = normalizeTextBlock(value).toUpperCase();
  const match = normalized.match(/\b(RECOMMEND|WATCH|PASS)\b/);
  if (match?.[1] === "RECOMMEND" || match?.[1] === "WATCH" || match?.[1] === "PASS") {
    return match[1];
  }
  return null;
}

export function validateCourseOfActionResponse(rawText: string): ValidationSuccess | ValidationFailure {
  const cleaned = preprocess(rawText);
  const decision = validateDecision(extractSection(cleaned, "Decision"));
  const whatHappened = normalizeTextBlock(extractSection(cleaned, "What Happened"));
  const whyItMatters =
    normalizeTextBlock(extractSection(cleaned, "Why It Matters (1–12 months)")) ||
    normalizeTextBlock(extractSection(cleaned, "Why It Matters (1-12 months)")) ||
    normalizeTextBlock(extractSection(cleaned, "Why It Matters"));
  const affectedAssets = parseList(extractSection(cleaned, "Affected Assets"));
  const analysis = normalizeTextBlock(extractSection(cleaned, "Analysis"));

  if (!decision) {
    return { ok: false, error: "Missing or invalid Decision section." };
  }

  if (!whatHappened) {
    return { ok: false, error: "Missing What Happened section." };
  }

  if (!whyItMatters) {
    return { ok: false, error: "Missing Why It Matters section." };
  }

  if (affectedAssets.length === 0) {
    return { ok: false, error: "Missing Affected Assets section." };
  }

  if (!analysis) {
    return { ok: false, error: "Missing Analysis section." };
  }

  const result: CourseOfActionResult = {
    decision,
    whatHappened,
    whyItMatters,
    affectedAssets,
    analysis,
    rawModelText: cleaned
  };

  if (decision === "RECOMMEND") {
    const tradeSection = extractSection(cleaned, "Trade");
    if (!tradeSection) {
      return { ok: false, error: "Trade section is required when Decision is RECOMMEND." };
    }

    const trade = parseTradeSection(tradeSection);
    if (
      !trade.asset ||
      !trade.direction ||
      !trade.horizon ||
      !trade.thesis ||
      !trade.whyNow ||
      !trade.risks ||
      !trade.invalidation
    ) {
      return { ok: false, error: "Trade section is incomplete." };
    }

    if (!Number.isFinite(trade.confidence) || trade.confidence < 0 || trade.confidence > 1) {
      return { ok: false, error: "Trade confidence must be a number between 0 and 1." };
    }

    result.trade = trade;
  }

  if (decision === "WATCH") {
    const watchConditions = normalizeTextBlock(extractSection(cleaned, "Watch Conditions"));
    if (!watchConditions) {
      return { ok: false, error: "Watch Conditions section is required when Decision is WATCH." };
    }
    result.watchConditions = watchConditions;
  }

  if (decision === "PASS") {
    const passReason = normalizeTextBlock(extractSection(cleaned, "Why Pass"));
    if (!passReason) {
      return { ok: false, error: "Why Pass section is required when Decision is PASS." };
    }
    result.passReason = passReason;
  }

  return { ok: true, result };
}
