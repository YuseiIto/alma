import type { OpenAI } from "openai";
import { logger } from "../logger.js";
import type { ToolBundle } from "./bundle.js";
import type { Tool, ToolResult } from "./tool.js";

export class ToolRegistry {
	private tools: Tool[] = [];

	constructor(tools: Tool[] = []) {
		this.tools = tools;
	}

	registerTool(tool: Tool) {
		this.tools.push(tool);
	}

	registerToolBundle(bundle: ToolBundle) {
		this.tools.concat(bundle.toTools());
	}

	has(toolName: string): boolean {
		return this.tools.some((entry) => {
			return entry.definition.function.name === toolName;
		});
	}

	find(toolName: string): Tool | undefined {
		const tool = this.tools.find((entry) => {
			return entry.definition.function.name === toolName;
		});
		return tool;
	}

	async execute(toolName: string, args: string): Promise<ToolResult> {
		logger.start(`Calling tool ${toolName}`);

		const tool = this.find(toolName);
		if (!tool) {
			logger.warn(`Requested tool ${toolName} not found in registry`);
			return `Tool not found: ${toolName}`;
		}

		const res = await tool.execute(args);

		logger.ready(`Tool ${toolName} returned result: ${res}`);
		return res;
	}

	toolDefinitions(): OpenAI.ChatCompletionFunctionTool[] {
		return this.tools.map((entry) => entry.definition);
	}
}
