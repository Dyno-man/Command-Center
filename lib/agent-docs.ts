import { readFile } from "node:fs/promises";
import path from "node:path";

type AgentPromptDocs = {
  systemPrompt: string;
  sourceOfTruth: string;
  responseFormat: string;
};

let docsPromise: Promise<AgentPromptDocs> | null = null;

async function loadAgentDocs(): Promise<AgentPromptDocs> {
  const sourcePath = path.join(process.cwd(), "docs", "agent", "agent_source_of_truth.md");
  const formatPath = path.join(process.cwd(), "docs", "agent", "agent_response_format.md");

  const [sourceOfTruth, responseFormat] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(formatPath, "utf8")
  ]);

  return {
    sourceOfTruth,
    responseFormat,
    systemPrompt: [sourceOfTruth.trim(), responseFormat.trim()].join("\n\n")
  };
}

export async function getAgentPromptDocs() {
  if (!docsPromise) {
    docsPromise = loadAgentDocs();
  }

  return docsPromise;
}
