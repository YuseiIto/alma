import type { OpenAI } from "openai";

export type ToolResult = OpenAI.ChatCompletionContentPartText[] | string;

export interface Tool {
	definition: OpenAI.ChatCompletionFunctionTool;
	execute: (args: string) => Promise<ToolResult> | ToolResult;
}
