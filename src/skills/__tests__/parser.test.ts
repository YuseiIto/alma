import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSkillMd } from "../parser";

const fixturesRoot = resolve(import.meta.dirname, "fixtures");

const readFixture = (name: string): string => {
	return readFileSync(resolve(fixturesRoot, name, "SKILL.md"), "utf8");
};

describe("parseSkillMd", () => {
	it("returns ParsedSkill for valid SKILL.md", () => {
		const parsed = parseSkillMd(readFixture("valid-skill"));

		expect(parsed).not.toBeNull();
		expect(parsed).toMatchObject({
			name: "valid-skill",
			description:
				"A complete and valid skill with all proper frontmatter fields and markdown body content below the separator",
		});
		expect(parsed?.body).toContain("# Valid Skill");
	});

	it("returns ParsedSkill for multi-skill fixture", () => {
		const parsed = parseSkillMd(readFixture("multi-skill"));

		expect(parsed).not.toBeNull();
		expect(parsed).toMatchObject({
			name: "multi-skill",
			description:
				"Another valid skill fixture to test multiple valid configurations and ensure parser handles variety correctly",
		});
	});

	it("returns null when description is missing", () => {
		const parsed = parseSkillMd(readFixture("missing-description"));

		expect(parsed).toBeNull();
	});

	it("returns null for malformed YAML", () => {
		const parsed = parseSkillMd(readFixture("bad-yaml"));

		expect(parsed).toBeNull();
	});

	it("returns null when no frontmatter exists", () => {
		const parsed = parseSkillMd(readFixture("no-frontmatter"));

		expect(parsed).toBeNull();
	});

	it("returns valid result for name mismatch fixture", () => {
		const parsed = parseSkillMd(readFixture("name-mismatch"));

		expect(parsed).not.toBeNull();
		expect(parsed?.name).toBe("wrong-name");
	});

	it("extracts markdown body content after frontmatter", () => {
		const parsed = parseSkillMd(readFixture("multi-skill"));

		expect(parsed?.body).toBe(
			'# Multi Skill\n\nThis is a second valid fixture with different frontmatter structure to ensure the parser supports multiple valid configurations.\n\n## Details\n\n- Valid YAML with nested fields\n- Name: "multi-skill"\n- Description meets minimum requirements\n- Includes optional compatibility field\n',
		);
	});
});
