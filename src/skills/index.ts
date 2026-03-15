import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { logger } from "../logger";
import type { Tool } from "../tools/tool";
import { type ParsedSkill, parseSkillMd } from "./parser";

export type { ParsedSkill };
export { parseSkillMd };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillEntry {
	name: string;
	description: string;
	location: string;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([".git", "node_modules"]);

async function scanSkillsRoot(root: string): Promise<SkillEntry[]> {
	const skillsRoot = resolve(root, ".agents", "skills");

	let entries: Dirent<string>[];
	try {
		entries = await readdir(skillsRoot, { withFileTypes: true });
	} catch {
		return [];
	}

	const discovered: SkillEntry[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (entry.name.startsWith(".") || EXCLUDED_DIRS.has(entry.name)) continue;

		const skillPath = join(skillsRoot, entry.name, "SKILL.md");

		let content: string;
		try {
			content = await readFile(skillPath, "utf8");
		} catch {
			continue;
		}

		const parsed = parseSkillMd(content);
		if (parsed === null) continue;

		if (parsed.name !== entry.name) {
			logger.warn(
				"Skipping skill because frontmatter name does not match directory",
				{
					directory: entry.name,
					frontmatterName: parsed.name,
					skillPath,
				},
			);
			continue;
		}

		discovered.push({
			name: parsed.name,
			description: parsed.description,
			location: skillPath,
		});
	}

	return discovered;
}

export async function discoverSkills(
	options: { projectRoot?: string; userHome?: string } = {},
): Promise<SkillEntry[]> {
	const projectRoot = options.projectRoot ?? process.cwd();
	const userHome = options.userHome ?? homedir();

	const [userSkills, projectSkills] = await Promise.all([
		scanSkillsRoot(userHome),
		scanSkillsRoot(projectRoot),
	]);

	const byName = new Map<string, SkillEntry>();

	for (const skill of userSkills) {
		byName.set(skill.name, skill);
	}

	for (const skill of projectSkills) {
		const existing = byName.get(skill.name);
		if (existing !== undefined) {
			logger.warn("Project skill overrides user skill with same name", {
				name: skill.name,
				userLocation: existing.location,
				projectLocation: skill.location,
			});
		}
		byName.set(skill.name, skill);
	}

	return [...byName.values()];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function buildSkillCatalog(
	skills: Pick<SkillEntry, "name" | "description">[],
): string {
	if (skills.length === 0) return "";

	const instructions =
		"The following skills provide specialized instructions for specific tasks. " +
		"When a task matches a skill's description, call the activate_skill tool " +
		"with the skill's name to load its full instructions.\n\n";

	const skillElements = skills
		.map((skill) => {
			const escapedName = escapeXml(skill.name);
			const escapedDescription = escapeXml(skill.description);
			return `<skill>\n<name>${escapedName}</name>\n<description>${escapedDescription}</description>\n</skill>`;
		})
		.join("\n");

	return `${instructions}<available_skills>\n${skillElements}\n</available_skills>`;
}

// ---------------------------------------------------------------------------
// Activate tool
// ---------------------------------------------------------------------------

export function createActivateSkillTool(skills: SkillEntry[]): Tool | null {
	if (skills.length === 0) return null;

	const activated = new Set<string>();

	return {
		definition: {
			type: "function",
			function: {
				name: "activate_skill",
				description:
					"Load skill instructions into the conversation. Use this tool to activate a skill and retrieve its full SKILL.md body content.",
				parameters: {
					type: "object",
					properties: {
						name: {
							type: "string",
							enum: skills.map((s) => s.name),
							description: "Name of the skill to activate",
						},
					},
					required: ["name"],
				},
			},
		},
		execute: async (argsJson: string): Promise<string> => {
			let args: { name: string };
			try {
				args = JSON.parse(argsJson) as { name: string };
			} catch {
				return "Error: Invalid JSON arguments for activate_skill.";
			}
			const skillName = args.name;

			const skillEntry = skills.find((s) => s.name === skillName);
			if (!skillEntry) {
				return `Error: Skill "${skillName}" not found.`;
			}

			let parsed: ParsedSkill | null;
			try {
				const fileContent = await readFile(skillEntry.location, "utf8");
				parsed = parseSkillMd(fileContent);
			} catch (error) {
				logger.error(
					`Failed to load skill "${skillName}" from "${skillEntry.location}":`,
					error,
				);
				return `Error: Failed to load skill "${skillName}".`;
			}
			if (!parsed) {
				return `Error: Failed to parse skill "${skillName}".`;
			}

			return `<skill_content name="${escapeXml(skillName)}">\n${parsed.body}\n</skill_content>`;
		},
	};
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function initializeSkills(
	options: { projectRoot?: string; userHome?: string } = {},
): Promise<{ catalog: string; tool: Tool | null }> {
	const skills = await discoverSkills(options);
	logger.info(`Discovered ${skills.length} skill(s)`);

	const catalog = buildSkillCatalog(skills);
	const tool = createActivateSkillTool(skills);

	return { catalog, tool };
}
