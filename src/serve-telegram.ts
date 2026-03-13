import { chat } from "./chat-agent";
import { logger } from "./logger";
import { initTelegramBot } from "./telegram";

logger.box("🤖 Alma is listening on Telegram!");

const bot = initTelegramBot(chat);

bot.start();
