import { REST, Routes } from 'discord.js';

function buildSafely(bot) {
    const out = [];
    for (const cmd of bot.commandsForRegistry?.() ?? []) {
        try {
            out.push(cmd.toJSON());
        } catch (e) {
            console.error(`❌ toJSON failed for command "${cmd.name || '(no name)'}"`);
            console.error(e);
            throw e;
        }
    }
    return out;
}

export async function publishGuildCommands({ appId, guildId, token, bot }) {
    const rest = new REST({ version: '10' }).setToken(token);
    const body = buildSafely(bot);
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body });
}

export async function publishGlobalCommands({ appId, token, bot }) {
    const rest = new REST({ version: '10' }).setToken(token);
    const body = buildSafely(bot);
    await rest.put(Routes.applicationCommands(appId), { body });
}
