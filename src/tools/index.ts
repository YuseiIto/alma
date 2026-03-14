import { getCurrentTimeTool } from "./datetime";
import { type MCPServerConfig, toolBundleFromMcpConfig } from "./mcp";
import { addMemoryTool, searchMemoryTool } from "./memory";
import { ToolRegistry } from "./registry";
import type { Tool } from "./tool";

const mcpConfigs: MCPServerConfig[] = [
	{
		name: "todoist",
		transport: "http",
		url: "https://ai.todoist.net/mcp",
		headers: {
			Authorization: `Bearer ${process.env.TODOIST_MCP_KEY}`,
		},
	},
];

export const tools: Tool[] = [
	getCurrentTimeTool,
	searchMemoryTool,
	addMemoryTool,
];

const toolRegistry = new ToolRegistry(tools);

for (const config of mcpConfigs) {
	const bundle = await toolBundleFromMcpConfig(config);
	toolRegistry.registerToolBundle(bundle);
}

export { toolRegistry };
export { ToolRegistry } from "./registry";
export type { Tool } from "./tool";
