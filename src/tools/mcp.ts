import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { logger } from "../logger.js";
import { ToolBundle } from "./bundle";
import type { Tool, ToolResult } from "./tool";

export type MCPServerConfig = StdioMcpServerConfig | HttpMcpServerConfig;

export interface StdioMcpServerConfig {
	name: string;
	transport: "stdio";
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

export interface HttpMcpServerConfig {
	name: string;
	transport: "http";
	url: string;
	headers?: Record<string, string>;
}

const createTransport = (config: MCPServerConfig): Transport => {
	switch (config.transport) {
		case "stdio":
			return new StdioClientTransport({
				command: config.command,
				args: config.args ?? [],
				env: config.env ?? {},
			});
		case "http":
			// StreamableHTTPClientTransport.sessionId is `string | undefined` but Transport interface
			// requires `string`. This is a bug in the MCP SDK. Cast to suppress the error.
			return new StreamableHTTPClientTransport(new URL(config.url), {
				requestInit: { headers: config.headers ?? {} },
			}) as unknown as Transport;
	}
};

export const connectMcpTools = async (
	config: MCPServerConfig,
): Promise<Tool[]> => {
	const transport = createTransport(config);
	const client = new Client({ name: "alma", version: "0.1.0" });
	await client.connect(transport);

	const { tools } = await client.listTools();

	logger.ready(
		`Connected to MCP server ${config.name}. Got ${tools.length} tools.`,
	);
	return tools.map((t) => ({
		definition: {
			type: "function",
			function: {
				name: t.name,
				description: t.description ?? "",
				parameters: t.inputSchema,
			},
		},
		execute: async (args: string): Promise<ToolResult> => {
			const toolName = t.name;
			const result = await client.callTool({
				name: toolName,
				arguments: JSON.parse(args),
			});
			return JSON.stringify(result.content);
		},
	}));
};

export const toolBundleFromMcpConfig = async (
	config: MCPServerConfig,
): Promise<ToolBundle> => {
	const prefix = `${config.name}_`;
	const tools = await connectMcpTools(config);
	return new ToolBundle(prefix, tools);
};
