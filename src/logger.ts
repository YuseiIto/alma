import { createConsola } from "consola";

export const logger = createConsola({
	level: process.env.LOG_LEVEL === "debug" ? 4 : 3,
	formatOptions: {
		date: true,
		colors: true,
	},
});
