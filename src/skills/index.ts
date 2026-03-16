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

export interface ReferenceEntry {
	name: string;
	location: string;
}

export interface SkillEntry {
	name: string;
	description: string;
	location: string;
	references: ReferenceEntry[];
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

		const refsDir = join(skillsRoot, entry.name, "references");
		let refEntries: Dirent<string>[];
		try {
			refEntries = await readdir(refsDir, { withFileTypes: true });
		} catch {
			refEntries = [];
		}
		const references = refEntries
			.filter((e) => e.isFile() && e.name.endsWith(".md"))
			.map((e) => ({ name: e.name, location: join(refsDir, e.name) }));

		discovered.push({
			name: parsed.name,
			description: parsed.description,
			location: skillPath,
			references,
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

			let output = `<skill_content name="${escapeXml(skillName)}">\n${parsed.body}`;

			if (skillEntry.references.length > 0) {
				const refList = skillEntry.references
					.map((r) => `- ${r.name}`)
					.join("\n");
				output += `\n\n<available_references>\n${refList}\n</available_references>`;
			}

			output += "\n</skill_content>";
			return output;
		},
	};
}

// ---------------------------------------------------------------------------
// Read reference tool
// ---------------------------------------------------------------------------

export function createReadReferenceTool(skills: SkillEntry[]): Tool | null {
	const skillsWithRefs = skills.filter((s) => s.references.length > 0);
	if (skillsWithRefs.length === 0) return null;

	return {
		definition: {
			type: "function",
			function: {
				name: "read_reference",
				description:
					"Read a reference document from a skill's references/ directory.",
				parameters: {
					type: "object",
					properties: {
						skill_name: {
							type: "string",
							enum: skillsWithRefs.map((s) => s.name),
							description: "Name of the skill containing the reference",
						},
						filename: {
							type: "string",
							description: "Filename of the reference (e.g. 'REFERENCE.md')",
						},
					},
					required: ["skill_name", "filename"],
				},
			},
		},
		execute: async (argsJson: string): Promise<string> => {
			let args: { skill_name: string; filename: string };
			try {
				args = JSON.parse(argsJson) as {
					skill_name: string;
					filename: string;
				};
			} catch {
				return "Error: Invalid JSON arguments for read_reference.";
			}

			const { skill_name, filename } = args;

			if (filename.includes("..")) {
				return "Error: Invalid filename — path traversal is not allowed.";
			}

			const skillEntry = skillsWithRefs.find((s) => s.name === skill_name);
			if (!skillEntry) {
				return `Error: Skill "${skill_name}" not found or has no references.`;
			}

			const refEntry = skillEntry.references.find((r) => r.name === filename);
			if (!refEntry) {
				return `Error: Reference "${filename}" not found in skill "${skill_name}".`;
			}

			try {
				const content = await readFile(refEntry.location, "utf8");
				return `<reference_content skill="${escapeXml(skill_name)}" file="${escapeXml(filename)}">\n${content}\n</reference_content>`;
			} catch (error) {
				logger.error(
					`Failed to read reference "${filename}" from skill "${skill_name}":`,
					error,
				);
				return `Error: Failed to read reference "${filename}".`;
			}
		},
	};
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function initializeSkills(
	options: { projectRoot?: string; userHome?: string } = {},
): Promise<{
	catalog: string;
	tool: Tool | null;
	readReferenceTool: Tool | null;
}> {
	const skills = await discoverSkills(options);
	logger.info(`Discovered ${skills.length} skill(s)`);

	const catalog = buildSkillCatalog(skills);
	const tool = createActivateSkillTool(skills);
	const readReferenceTool = createReadReferenceTool(skills);

	return { catalog, tool, readReferenceTool };
}
