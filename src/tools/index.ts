import { initializeSkills } from "../skills/index";
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
	{
		name: "searxng",
		transport: "stdio",
		command: "npx",
		args: ["-y", "mcp-searxng"],
		env: {
			SEARXNG_URL: process.env.SEARXNG_URL ?? "",
		},
	},
	{
		name: "google_maps",
		transport: "http",
		url: "https://mapstools.googleapis.com/mcp",
		headers: {
			"X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY ?? "",
		},
	},
	{
		name: "transit",
		transport: "stdio",
		command: "npx",
		args: ["-y", "norikae-mcp"],
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

const { catalog: skillCatalog, tool: activateSkillTool } =
	await initializeSkills();
if (activateSkillTool !== null) {
	toolRegistry.registerTool(activateSkillTool);
}

export { skillCatalog };
export { toolRegistry };
export { ToolRegistry } from "./registry";
export type { Tool } from "./tool";
