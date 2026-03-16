import { describe, expect, it } from "vitest";
import { Conversation } from "../conversation";

describe("Conversation.clear()", () => {
	it("empties history so buildMessages returns only system + user", () => {
		const conv = new Conversation("test system prompt");
		conv.addTurn("hello", { role: "assistant", content: "hi" });
		conv.clear();
		const messages = conv.buildMessages("test");
		expect(messages).toHaveLength(2); // system + user only
		expect(messages[0]?.role).toBe("system");
		expect(messages[1]?.role).toBe("user");
	});

	it("preserves systemPrompt after clear", () => {
		const systemPrompt = "test system prompt";
		const conv = new Conversation(systemPrompt);
		conv.addTurn("hello", { role: "assistant", content: "hi" });
		conv.clear();
		const messages = conv.buildMessages("test");
		expect(messages[0]?.content).toBe(systemPrompt);
	});

	it("is idempotent on empty conversation", () => {
		const conv = new Conversation("test");
		expect(() => conv.clear()).not.toThrow();
	});

	it("returns empty array from getHistoryForMem0 after clear", () => {
		const conv = new Conversation("test");
		conv.addTurn("hello", { role: "assistant", content: "hi" });
		conv.clear();
		const history = conv.getHistoryForMem0();
		expect(history).toHaveLength(0);
	});
});
