import type { Tool, ToolResult } from "./tool";

export class ToolBundle {
	readonly prefix: string;
	private tools: Tool[];

	constructor(prefix: string, tools: Tool[]) {
		this.prefix = prefix;
		this.tools = tools;
	}

	has(toolName: string): boolean {
		if (!toolName.startsWith(this.prefix)) {
			return false;
		}

		return this.tools.some(
			(tool) => tool.definition.function.name === toolName,
		);
	}

	/// Returns the tools in this bundle with their names prefixed
	toTools(): Tool[] {
		return this.tools.map((tool) => ({
			definition: {
				...tool.definition,
				function: {
					...tool.definition.function,
					name: this.prefix + tool.definition.function.name,
				},
			},
			execute: tool.execute,
		}));
	}

	async dispatch(fullToolName: string, args: string): Promise<ToolResult> {
		const toolName = fullToolName.replace(this.prefix, "");
		const tool = this.tools.find(
			(tool) => tool.definition.function.name === toolName,
		);
		if (!tool) {
			throw new Error(`Tool not found: ${toolName}`);
		}
		return await tool.execute(args);
	}
}
