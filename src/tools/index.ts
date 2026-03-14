import { getCurrentTimeTool } from "./datetime";
import { addMemoryTool, searchMemoryTool } from "./memory";
import { ToolRegistry } from "./registry";
import type { Tool } from "./tool";

export const tools: Tool[] = [
	getCurrentTimeTool,
	searchMemoryTool,
	addMemoryTool,
];

export const toolRegistry = new ToolRegistry(tools);
export { ToolRegistry } from "./registry";
export type { Tool } from "./tool";
