import cron from 'node-cron';
import { DateTime } from 'luxon';
import { getAllGuildSettingsWithChannel } from '../db/guildSettingsRepo.js';

export default class DailyVotes {
    /**
     * @param {MatchesService} matchService
     * @param {VoteUI} voteUI
     * @param {GuildManager} guildManager
     * @param {Console} logger
     */
    constructor(matchService, voteUI, guildManager, logger = console) {
        this.matchesService = matchService;
        this.voteUI = voteUI;
        this.guildManager = guildManager;
        this.logger = logger;
        this.jobs = new Map();
    }

    #sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

    /**
     *
     * @param gs
     * @return boolean
     */
    async postTodayVotesForGuild(gs) {
        const tz = gs.timezone || 'Europe/Paris';
        
        const guild = await this.guildManager.fetch(gs.guild_id).catch(() => null);
        if (!guild) { this.logger.warn(`postTodayVotes: guild ${gs.guild_id} introuvable`); return false; }
        
        const channel = await guild.channels.fetch(gs.vote_channel_id).catch(() => null);
        if (!channel?.isTextBased()) { this.logger.warn(`postTodayVotes: channel invalide pour ${gs.guild_id}`); return false; }

        const startLocal = DateTime.now().setZone(tz).startOf('day');
        const endLocal   = startLocal.endOf('day', {});
        const startIso = startLocal.toUTC().toISO();
        const endIso   = endLocal.toUTC().toISO();

        const leagues = Array.isArray(gs.leagues) ? gs.leagues : [];
        const matches = leagues.length ? await this.matchesService.findUpcoming({
            leagues : leagues, 
            start : startIso.toString(),
            end : endIso.toString(),
            limite : 25
        }) : [];
        
        await channel.send({ content: `🗓️ **Votes du ${startLocal.toFormat('dd LLL yyyy')}** (${tz})` });
        if (!matches.length) return;

        for (const m of matches) {
            await channel.send(this.voteUI.build(m));
            await this.#sleep(350);
        }

        return true;
    }

    cancelDailyVotesForGuild(guildId) {
        const job = this.jobs.get(guildId);
        if (job) { job.stop(); this.jobs.delete(guildId); }
    }

    scheduleDailyVotesForGuild(gs) {

        this.cancelDailyVotesForGuild(gs.guild_id);

        const tz = gs.timezone || 'Europe/Paris';
        const h = Number.isFinite(gs.vote_hour) ? gs.vote_hour : 0;
        const m = Number.isFinite(gs.vote_minute) ? gs.vote_minute : 0;

        const expr = `${m} ${h} * * *`;
        const job = cron.schedule(expr, async () => {
            try { this.postTodayVotesForGuild(gs); }
            catch (e) { this.logger.error('dailyVotes cron error:', e); return false;}
        }, { timezone: tz });

        this.jobs.set(gs.guild_id, job);
        this.logger.info(`dailyVotes: job planifié guild=${gs.guild_id} à ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} (${tz})`);
        return true;
    }

    async scheduleDailyVotes() {
        const guilds = await getAllGuildSettingsWithChannel();
        for (const gs of guilds) this.scheduleDailyVotesForGuild(gs);
    }
}
