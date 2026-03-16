import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../logger";
import {
	buildSkillCatalog,
	createActivateSkillTool,
	discoverSkills,
	type SkillEntry,
} from "../index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fixturesRoot = resolve(import.meta.dirname, "fixtures");
const tmpDirs: string[] = [];

const makeTempDir = (): string => {
	const dir = mkdtempSync(resolve(tmpdir(), "alma-skills-test-"));
	tmpDirs.push(dir);
	return dir;
};

const writeSkill = (
	root: string,
	skillDir: string,
	skillMdContent: string,
	createSkillMd = true,
): void => {
	const dir = resolve(root, ".agents", "skills", skillDir);
	mkdirSync(dir, { recursive: true });
	if (createSkillMd) {
		writeFileSync(resolve(dir, "SKILL.md"), skillMdContent, "utf8");
	}
};

const readFixture = (name: string): string => {
	return readFileSync(resolve(fixturesRoot, name, "SKILL.md"), "utf8");
};

afterEach(() => {
	vi.restoreAllMocks();
	for (const dir of tmpDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

// ---------------------------------------------------------------------------
// discoverSkills
// ---------------------------------------------------------------------------

describe("discoverSkills", () => {
	it("finds valid skills and skips invalid SKILL.md files in scanned directory", async () => {
		const root = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			root,
			"valid-skill",
			`---\nname: valid-skill\ndescription: valid\n---\n\n# Valid\n`,
		);
		writeSkill(
			root,
			"multi-skill",
			`---\nname: multi-skill\ndescription: multi\n---\n\n# Multi\n`,
		);
		writeSkill(
			root,
			"missing-description",
			`---\nname: missing-description\n---\n`,
		);
		writeSkill(
			root,
			"bad-yaml",
			`---\nname: bad-yaml\ndescription: ok\ninvalid: :\n---\n`,
		);

		const discovered = await discoverSkills({ projectRoot: root, userHome });

		expect(discovered).toHaveLength(2);
		expect(discovered.map((entry) => entry.name).sort()).toEqual([
			"multi-skill",
			"valid-skill",
		]);
		expect(
			discovered.every((entry) => basename(entry.location) === "SKILL.md"),
		).toBe(true);
	});

	it("returns empty array for empty skills directory", async () => {
		const root = makeTempDir();
		const userHome = makeTempDir();
		mkdirSync(resolve(root, ".agents", "skills"), { recursive: true });

		const discovered = await discoverSkills({ projectRoot: root, userHome });

		expect(discovered).toEqual([]);
	});

	it("returns empty array for non-existent skills directory without throwing", async () => {
		const root = makeTempDir();

		await expect(
			discoverSkills({
				projectRoot: resolve(root, "missing-project"),
				userHome: resolve(root, "missing-home"),
			}),
		).resolves.toEqual([]);
	});

	it("skips hidden and excluded directories", async () => {
		const root = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			root,
			"valid-skill",
			`---\nname: valid-skill\ndescription: valid\n---\n`,
		);
		writeSkill(
			root,
			".hidden-skill",
			`---\nname: hidden\ndescription: hidden\n---\n`,
		);
		writeSkill(
			root,
			"node_modules",
			`---\nname: node-modules-skill\ndescription: should skip\n---\n`,
		);
		writeSkill(
			root,
			".git",
			`---\nname: dot-git-skill\ndescription: should skip\n---\n`,
		);

		const discovered = await discoverSkills({ projectRoot: root, userHome });

		expect(discovered).toHaveLength(1);
		expect(discovered[0]?.name).toBe("valid-skill");
	});

	it("project-level skills override user-level skills on name collision and warn", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(
			userHome,
			"shared-skill",
			`---\nname: shared-skill\ndescription: user version\n---\n`,
		);
		writeSkill(
			projectRoot,
			"shared-skill",
			`---\nname: shared-skill\ndescription: project version\n---\n`,
		);

		const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

		const discovered = await discoverSkills({ projectRoot, userHome });

		expect(discovered).toHaveLength(1);
		expect(discovered[0]).toMatchObject({
			name: "shared-skill",
			description: "project version",
			location: resolve(
				projectRoot,
				".agents",
				"skills",
				"shared-skill",
				"SKILL.md",
			),
		});
		expect(warn).toHaveBeenCalled();
	});

	it("works with parser fixture corpus and returns only parse-valid skills", async () => {
		const projectRoot = makeTempDir();
		const userHome = makeTempDir();

		writeSkill(projectRoot, "valid-skill", readFixture("valid-skill"));
		writeSkill(projectRoot, "multi-skill", readFixture("multi-skill"));
		writeSkill(
			projectRoot,
			"missing-description",
			readFixture("missing-description"),
		);
		writeSkill(projectRoot, "bad-yaml", readFixture("bad-yaml"));
		writeSkill(projectRoot, "no-frontmatter", readFixture("no-frontmatter"));
		writeSkill(projectRoot, "name-mismatch", readFixture("name-mismatch"));

		const discovered = await discoverSkills({ projectRoot, userHome });

		expect(discovered).toHaveLength(2);
		expect(discovered.map((entry) => entry.name).sort()).toEqual([
			"multi-skill",
			"valid-skill",
		]);
	});
});

// ---------------------------------------------------------------------------
// buildSkillCatalog
// ---------------------------------------------------------------------------

describe("buildSkillCatalog", () => {
	it("returns empty string when given empty array", () => {
		const result = buildSkillCatalog([]);
		expect(result).toBe("");
	});

	it("returns catalog with behavioral instructions for single skill", () => {
		const skills = [
			{
				name: "pdf-processing",
				description: "Extract PDF text, fill forms, merge files.",
			},
		];
		const result = buildSkillCatalog(skills);

		expect(result).toContain("activate_skill");
		expect(result).toContain("task matches a skill's description");
		expect(result).toContain("<available_skills>");
		expect(result).toContain("</available_skills>");
		expect(result).toContain("<skill>");
		expect(result).toContain("</skill>");
		expect(result).toContain("<name>pdf-processing</name>");
		expect(result).toContain(
			"<description>Extract PDF text, fill forms, merge files.</description>",
		);
	});

	it("returns catalog with multiple skills", () => {
		const skills = [
			{
				name: "pdf-processing",
				description: "Extract PDF text, fill forms, merge files.",
			},
			{
				name: "data-analysis",
				description: "Analyze datasets, generate charts, and create reports.",
			},
			{
				name: "code-review",
				description: "Review code for best practices and potential issues.",
			},
		];
		const result = buildSkillCatalog(skills);

		expect(result).toContain("<name>pdf-processing</name>");
		expect(result).toContain("<name>data-analysis</name>");
		expect(result).toContain("<name>code-review</name>");

		const skillMatches = result.match(/<skill>/g);
		expect(skillMatches?.length).toBe(3);
	});

	it("properly escapes special characters in descriptions", () => {
		const skills = [
			{
				name: "xml-escape-test",
				description:
					"This has <special> chars & \"quotes\" and 'apostrophes' to escape",
			},
		];
		const result = buildSkillCatalog(skills);

		expect(result).toContain("&lt;special&gt;");
		expect(result).toContain("&amp;");
		expect(result).toContain("&quot;");
		expect(result).toContain("&apos;");

		expect(result).not.toMatch(/<description>.*<special>.*<\/description>/);
		expect(result).not.toMatch(/<description>.*"quotes".*<\/description>/);
	});
});

// ---------------------------------------------------------------------------
// createActivateSkillTool
// ---------------------------------------------------------------------------

const makeSkills = (): SkillEntry[] => [
	{
		name: "valid-skill",
		description: "A valid fixture skill",
		location: resolve(fixturesRoot, "valid-skill", "SKILL.md"),
	},
	{
		name: "multi-skill",
		description: "A second fixture skill",
		location: resolve(fixturesRoot, "multi-skill", "SKILL.md"),
	},
];

describe("createActivateSkillTool", () => {
	it("returns null when no skills are provided", () => {
		expect(createActivateSkillTool([])).toBeNull();
	});

	it("creates activate_skill tool with exact name", () => {
		const tool = createActivateSkillTool(makeSkills());

		expect(tool).not.toBeNull();
		expect(tool?.definition.function.name).toBe("activate_skill");
	});

	it("builds enum parameter from discovered skill names", () => {
		const skills = makeSkills();
		const tool = createActivateSkillTool(skills);

		expect(tool).not.toBeNull();
		expect(tool?.definition.function.parameters).toMatchObject({
			type: "object",
			properties: {
				name: {
					type: "string",
					enum: ["valid-skill", "multi-skill"],
				},
			},
			required: ["name"],
		});
	});

	it("returns skill body wrapped in skill_content tags", async () => {
		const tool = createActivateSkillTool(makeSkills());
		if (!tool) {
			throw new Error("Expected activate_skill tool to be created");
		}

		const output = await tool.execute(JSON.stringify({ name: "valid-skill" }));

		expect(typeof output).toBe("string");
		expect(output).toContain('<skill_content name="valid-skill">');
		expect(output).toContain("# Valid Skill");
		expect(output).toContain("This is a valid skill fixture");
		expect(output).toContain("</skill_content>");
	});

	it("returns already loaded message for repeated activation", async () => {
		const tool = createActivateSkillTool(makeSkills());
		if (!tool) {
			throw new Error("Expected activate_skill tool to be created");
		}

		await tool.execute(JSON.stringify({ name: "valid-skill" }));
		const second = await tool.execute(JSON.stringify({ name: "valid-skill" }));

		expect(second).toBe(
			'Skill "valid-skill" is already loaded in this conversation.',
		);
	});
});
