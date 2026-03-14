import * as readline from "node:readline";
import { chat } from "./chat-agent";
import { Conversation } from "./conversation";

const conversation = new Conversation("You are a helpful assistant.");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true,
});

const question = (prompt: string): Promise<string> =>
	new Promise((resolve) => rl.question(prompt, resolve));

// Chat with stdio
while (true) {
	const userInput = await question("You: ");

	const res = await chat(userInput.trim(), conversation, {
		remember: true,
		model: "qwen3.5-35b-a3b",
	});

	process.stdout.write(`Assistant: ${res}\n`);
}
