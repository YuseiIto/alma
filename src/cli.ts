import { chat } from "./chat-agent";
import { Conversation } from "./conversation";

const conversation = new Conversation("You are a helpful assistant.");

// Chat with stdio
while (true) {
	const userInput = await new Promise<string>((resolve) => {
		process.stdout.write("You: ");
		process.stdin.once("data", (data) => {
			resolve(data.toString().trim());
		});
	});

	const res = await chat(userInput, conversation, {
		remember: true,
		model: "qwen3.5-35b-a3b",
	});

	process.stdout.write(`Assistant: ${res}\n`);
}
