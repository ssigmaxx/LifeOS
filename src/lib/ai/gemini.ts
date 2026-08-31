import "server-only";
import { GoogleGenAI, type Content } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./system-prompt";
import { TOOL_DECLARATIONS, TOOL_EXECUTORS } from "./tools";
import type { Proposal, ToolExecutionResult } from "./types";

const MAX_TOOL_CALLS = Number(process.env.AI_MAX_TOOL_CALLS_PER_REQUEST ?? "6");
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? "2048");
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type ConversationTurnResult = {
  text: string;
  toolCallsAudit: { name: string; args: unknown }[];
  proposals: Proposal[];
};

/**
 * Manual (not automatic) function-calling loop: every tool call is
 * executed by us, against the already-authenticated services in tools.ts,
 * never by the SDK itself — that's the point. Bounded by MAX_TOOL_CALLS so
 * a confused model can't loop indefinitely.
 */
export async function runAiConversationTurn(
  priorHistory: Content[],
  userMessage: string,
): Promise<ConversationTurnResult> {
  const ai = getClient();
  const contents: Content[] = [
    ...priorHistory,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const toolCallsAudit: { name: string; args: unknown }[] = [];
  const proposals: Proposal[] = [];

  const systemInstruction = `${SYSTEM_INSTRUCTION}\n\nToday's date is ${todayISO()}. Resolve relative ranges ("this week", "last month") against this date.`;

  for (let iteration = 0; iteration < MAX_TOOL_CALLS; iteration++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      return { text: response.text ?? "", toolCallsAudit, proposals };
    }

    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    const responseParts = [];
    for (const call of functionCalls) {
      const name = call.name ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      toolCallsAudit.push({ name, args });

      const executor = TOOL_EXECUTORS[name];
      const result: ToolExecutionResult = executor
        ? await executor(args).catch(
            (err): ToolExecutionResult => ({
              forModel: { error: err instanceof Error ? err.message : "Tool failed." },
            }),
          )
        : { forModel: { error: `Unknown tool: ${name}` } };

      if (result.proposal) proposals.push(result.proposal);

      responseParts.push({
        functionResponse: {
          name,
          id: call.id,
          response: { result: result.forModel },
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    text: "I wasn't able to finish that analysis — it needed more steps than I'm allowed to take at once. Try asking a narrower question.",
    toolCallsAudit,
    proposals,
  };
}
