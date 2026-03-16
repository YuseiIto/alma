import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Tool } from "../../tools/tool";
import { initializeSkills } from "../index";

const tmpDirs: string[] = [];

const makeTempDir = (): string => {
	const dir = mkdtempSync(resolve(tmpdir(), "alma-integration-test-"));
	tmpDirs.push(dir);
	return dir;
};

const writeSkill = (
	root: string,
	skillDir: string,
	skillMdContent: string,
): void => {
	const dir = resolve(root, ".agents", "skills", skillDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(resolve(dir, "SKILL.md"), skillMdContent, "utf8");
};

afterEach(() => {
	for (const dir of tmpDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("initializeSkills", () => {
	it("returns catalog and tool when skills are discovered", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			projectRoot,
			"test-skill-one",
			`---\nname: test-skill-one\ndescription: First test skill\n---\n\n# Skill One Body\n`,
		);
		writeSkill(
			userHome,
			"test-skill-two",
			`---\nname: test-skill-two\ndescription: Second test skill\n---\n\n# Skill Two Body\n`,
		);

		const result = await initializeSkills({ projectRoot, userHome });

		expect(result).toHaveProperty("catalog");
		expect(result).toHaveProperty("tool");
		expect(typeof result.catalog).toBe("string");
		expect(result.catalog.length).toBeGreaterThan(0);
		expect(result.tool).not.toBeNull();
	});

	it("returns empty catalog and null tool when no skills are found", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		const result = await initializeSkills({ projectRoot, userHome });

		expect(result.catalog).toBe("");
		expect(result.tool).toBeNull();
	});

	it("catalog contains all discovered skill names", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			projectRoot,
			"alpha-skill",
			`---\nname: alpha-skill\ndescription: Alpha description\n---\n\nAlpha body\n`,
		);
		writeSkill(
			projectRoot,
			"beta-skill",
			`---\nname: beta-skill\ndescription: Beta description\n---\n\nBeta body\n`,
		);

		const result = await initializeSkills({ projectRoot, userHome });

		expect(result.catalog).toContain("alpha-skill");
		expect(result.catalog).toContain("beta-skill");
		expect(result.catalog).toContain("Alpha description");
		expect(result.catalog).toContain("Beta description");
	});

	it("tool enum contains exactly the discovered skill names", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			projectRoot,
			"enum-test-one",
			`---\nname: enum-test-one\ndescription: Enum test one\n---\n\nBody one\n`,
		);
		writeSkill(
			userHome,
			"enum-test-two",
			`---\nname: enum-test-two\ndescription: Enum test two\n---\n\nBody two\n`,
		);

		const result = await initializeSkills({ projectRoot, userHome });

		expect(result.tool).not.toBeNull();
		const tool = result.tool as Tool;

		expect(tool.definition.type).toBe("function");
		expect(tool.definition.function.name).toBe("activate_skill");

		const params = tool.definition.function.parameters;
		expect(params).toBeDefined();

		const properties = (params as { properties?: unknown })
			.properties as Record<string, { enum?: string[] }>;
		expect(properties).toBeDefined();

		const nameParam = properties.name;
		expect(nameParam).toBeDefined();
		expect(nameParam).toHaveProperty("enum");

		if (nameParam === undefined) {
			throw new Error("nameParam should be defined");
		}

		expect(nameParam.enum).toEqual(
			expect.arrayContaining(["enum-test-one", "enum-test-two"]),
		);
		expect(nameParam.enum).toHaveLength(2);
	});

	it("tool execute method returns skill body wrapped in tags", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		const skillBody = "# Execute Test Skill\n\nThis is the skill body content.";
		writeSkill(
			projectRoot,
			"execute-test",
			`---\nname: execute-test\ndescription: Execute test skill\n---\n\n${skillBody}`,
		);

		const result = await initializeSkills({ projectRoot, userHome });

		expect(result.tool).not.toBeNull();
		const tool = result.tool as Tool;

		const executeResult = await tool.execute(
			JSON.stringify({ name: "execute-test" }),
		);

		expect(executeResult).toContain('<skill_content name="execute-test">');
		expect(executeResult).toContain(skillBody);
		expect(executeResult).toContain("</skill_content>");
	});
});
