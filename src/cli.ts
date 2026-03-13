import type { ChatResponse } from "./chat-agent";
import { chat, start_chat } from "./chat-agent";

let ctx: ChatResponse = await start_chat();

// Chat with stdio
while (true) {
	const userInput = await new Promise<string>((resolve) => {
		process.stdout.write("You: ");
		process.stdin.once("data", (data) => {
			resolve(data.toString().trim());
		});
	});

	ctx.messages.push({
		role: "user",
		content: userInput,
	});

	ctx = await chat(ctx.messages, { remember: true, model: "qwen3.5-35b-a3b" });

	process.stdout.write(`Assistant: ${ctx.content}\n`);
}
