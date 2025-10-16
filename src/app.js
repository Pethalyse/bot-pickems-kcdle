import 'dotenv/config';
import pool from './db/pool.js';
import { Bot } from './core/Bot.js';
import { publishGlobalCommands } from './infra/discord/registry.js';
import { createCacheFromEnv } from './core/cache/cacheFactory.js';
import {scheduleDailyVotes} from "./scheduler/dailyVotes.js";

const logger = console;
const cache = await createCacheFromEnv();

const ctx = { pool, logger, cache };
const bot = new Bot(ctx);

await bot.start(process.env.DISCORD_TOKEN);

await publishGlobalCommands({
    appId: process.env.DISCORD_APP_ID,
    token: process.env.DISCORD_TOKEN,
    bot
});

await scheduleDailyVotes(ctx.bot, { logger: console });


async function shutdown(sig) {
    try {
        logger.info(`[${sig}] shutting down...`);
        bot.client?.destroy?.();
        if (cache.disconnect) await cache.disconnect();
        await pool.end();
    } finally {
        process.exit(0);
    }
}
['SIGINT','SIGTERM'].forEach(s => process.on(s, () => shutdown(s)));
