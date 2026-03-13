import type { OpenAI } from "openai";

type ToolResult = OpenAI.ChatCompletionContentPartText[] | string;

export const tools: OpenAI.ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "get_current_time",
			description: "Get the current time.",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
		},
	},
];

export const dispatchTool = async (
	toolName: string,
	_input: string,
): Promise<ToolResult> => {
	switch (toolName) {
		case "get_current_time":
			return new Date().toISOString();
	}

	throw new Error(`Unknown tool: ${toolName}`);
};
