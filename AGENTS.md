# CLAUDE.md

This file provides guidance to Coding Agents when working with code in this repository.

## What is Alma

Alma is a personal AI chat assistant built with TypeScript. It connects to LLM backends via LiteLLM proxy (OpenAI-compatible API) and supports two interfaces: a CLI REPL and a Telegram bot. It uses mem0 for persistent memory across conversations and integrates external services through MCP (Model Context Protocol) servers.

## Commands

- `npm run dev:cli` — Run the CLI chat REPL
- `npm run dev:serve-telegram` — Start the Telegram bot
- `npm run lint` — Lint with Biome
- `npm run fix` — Auto-fix lint/format issues with Biome
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)

## Environment Variables

- `LITELLM_API_BASE` — LiteLLM proxy URL (also set as `OPENAI_BASE_URL` for mem0 compatibility)
- `LITELLM_API_KEY` — API key for LiteLLM (must start with `sk-`)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `TODOIST_MCP_KEY` — Todoist MCP API key
- `SEARXNG_URL` — SearXNG instance URL
- `GOOGLE_MAPS_API_KEY` — Google Maps API key
- `LOG_LEVEL` — Set to `debug` for verbose logging

## Architecture

### Chat Loop (`src/chat-agent.ts`)
The core agentic loop: sends messages to the LLM, handles tool calls in a loop until the model returns a `stop` finish reason, then optionally saves the conversation to mem0 memory (fire-and-forget).

### Tool System (`src/tools/`)
- **`Tool` interface** (`tool.ts`): wraps an OpenAI function tool definition + an execute function
- **`ToolBundle`** (`bundle.ts`): groups tools under a name prefix (used for MCP server tools)
- **`ToolRegistry`** (`registry.ts`): central registry that holds all tools and dispatches calls by name
- **MCP integration** (`mcp.ts`): connects to MCP servers (stdio or HTTP transport) and converts their tools into the `Tool` interface. MCP servers are configured in `src/tools/index.ts`
- Built-in tools: `get_current_time` (JST), `search_memory`, `add_memory`

### Memory (`src/memory.ts`)
Uses mem0 (mem0ai/oss) with an OpenAI-compatible LLM and embedding model via LiteLLM. Monkey-patches mem0's internal LLM to sanitize `<think>` tags from reasoning model outputs.

### Conversation (`src/conversation.ts`)
Manages chat history, builds message arrays for the OpenAI API, and converts history to mem0's message format.

### Sanitization (`src/sanitize.ts`)
Strips `<think>...</think>` blocks from reasoning model outputs (e.g., DeepSeek-R1) that LiteLLM may not fully clean.

## Code Style

- Biome for linting and formatting: tabs for indentation, double quotes
- ESM (`"type": "module"` in package.json)
- Strict TypeScript with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Runtime via `tsx` (no build step needed for development)
