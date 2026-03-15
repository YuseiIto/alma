import { parse } from "yaml";
import { z } from "zod";
import { logger } from "../logger";

export interface ParsedSkill {
	name: string;
	description: string;
	body: string;
}

const frontmatterSchema = z.object({
	name: z.string().min(1).max(64),
	description: z.string().min(1).max(1024),
});

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseSkillMd(content: string): ParsedSkill | null {
	const match = content.match(FRONTMATTER_REGEX);
	if (!match || match[1] === undefined) {
		logger.warn("SKILL.md parse failed: missing YAML frontmatter delimiters");
		return null;
	}

	let parsedYaml: unknown;
	try {
		parsedYaml = parse(match[1]);
	} catch (error) {
		logger.warn("SKILL.md parse failed: unparseable YAML frontmatter", error);
		return null;
	}

	const result = frontmatterSchema.safeParse(parsedYaml);
	if (!result.success) {
		logger.warn(
			"SKILL.md parse failed: invalid frontmatter",
			result.error.issues,
		);
		return null;
	}

	const body = content.slice(match[0].length).replace(/^\r?\n+/, "");
	return { ...result.data, body };
}
