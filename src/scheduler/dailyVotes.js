import cron from 'node-cron';
import { DateTime } from 'luxon';
import { getAllGuildSettingsWithChannel } from '../db/guildSettings.js';
import { matchesRepo } from '../db/matchesRepo.js';
import { matchEmbed } from '../ui/embeds.js';
import { voteButtons } from '../ui/voteComponents.js';

const jobs = new Map();

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export async function postTodayVotesForGuild(bot, gs, logger = console) {
    const tz = gs.timezone || 'Europe/Paris';
    const guild = await bot.client.guilds.fetch(gs.guild_id).catch(() => null);
    if (!guild) { logger.warn(`postTodayVotes: guild ${gs.guild_id} introuvable`); return; }

    const channel = await guild.channels.fetch(gs.vote_channel_id).catch(() => null);
    if (!channel?.isTextBased()) { logger.warn(`postTodayVotes: channel invalide pour ${gs.guild_id}`); return; }

    const startLocal = DateTime.now().setZone(tz).startOf('day');
    const endLocal   = startLocal.endOf('day', {});
    const startIso = startLocal.toUTC().toISO();
    const endIso   = endLocal.toUTC().toISO();

    const leagues = Array.isArray(gs.leagues) ? gs.leagues : [];
    const matches = leagues.length ? await matchesRepo.upcomingWindow(leagues, startIso, endIso, 25) : [];
    if (!matches.length) {
        await channel.send({ content: `🗓️ **Votes du ${startLocal.toFormat('dd LLL yyyy')}** (${tz}) — aucun match.` });
        return;
    }

    await channel.send({ content: `🗓️ **Votes du ${startLocal.toFormat('dd LLL yyyy')}** (${tz})` });
    for (const m of matches) {
        await channel.send({ embeds: [matchEmbed(m)], components: [voteButtons(m)] });
        await sleep(350);
    }
}

export function cancelDailyVotesForGuild(guildId) {
    const job = jobs.get(guildId);
    if (job) { job.stop(); jobs.delete(guildId); }
}

export function scheduleDailyVotesForGuild(bot, gs, logger = console) {
    cancelDailyVotesForGuild(gs.guild_id);

    const tz = gs.timezone || 'Europe/Paris';
    const job = cron.schedule('0 0 * * *', async () => {
        try { await postTodayVotesForGuild(bot, gs, logger); }
        catch (e) { logger.error('dailyVotes cron error:', e); }
    }, { timezone: tz });

    jobs.set(gs.guild_id, job);
    logger.info(`dailyVotes: job planifié pour guild=${gs.guild_id} à 00:00 (${tz})`);
    return job;
}

export async function scheduleDailyVotes(bot, { logger = console } = {}) {
    const guilds = await getAllGuildSettingsWithChannel();
    for (const gs of guilds) scheduleDailyVotesForGuild(bot, gs, logger);
}
