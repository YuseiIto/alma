import type { ChatResponse } from "./chat-agent";
import { chat } from "./chat-agent";
import { logger } from "./logger";

logger.info("Starting conversation...");

let ctx: ChatResponse = {
	content: "",
	messages: [
		{
			role: "system",
			content: "You are a helpful assistant.",
		},
	],
};

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

	ctx = await chat(ctx.messages, { remember: true });

	process.stdout.write(`Assistant: ${ctx.content}\n`);
}
