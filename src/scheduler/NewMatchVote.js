import cron from 'node-cron';
import { DateTime } from 'luxon';
import { getAllGuildSettingsWithChannel } from '../db/guildSettingsRepo.js';
import {getCursor, setCursor, upsertMatch} from "../../scripts/utils_bdd.js";

export default class NewMatchVote {
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

    async scheduleNewMatch() {
        const guilds = await getAllGuildSettingsWithChannel();
        for (const gs of guilds) this.scheduleNewMatchForGuild(gs);
    }

    scheduleNewMatchForGuild(gs){
        this.cancelNewMatchForGuid(gs.guild_id);

        const expr = `*/5 * * * *`;
        const job = cron.schedule(expr, async () => {
            try { await this.postNewMatchForGuid(gs); }
            catch (e) { this.logger.error('newMatch cron error:', e); return false;}
        });

        this.jobs.set(gs.guild_id, job);
        this.logger.info(`newMatch: job planifié guild=${gs.guild_id}`);
        return true;
    }

    cancelNewMatchForGuid(guildId) {
        const job = this.jobs.get(guildId);
        if (job) { job.stop(); this.jobs.delete(guildId); }
    }

    async postNewMatchForGuid(gs) {
        const guild = await this.guildManager.fetch(gs.guild_id).catch(() => null);
        if (!guild) { this.logger.warn(`postNewMatch: guild ${gs.guild_id} introuvable`); return false; }

        const channel = await guild.channels.fetch(gs.vote_channel_id).catch(() => null);
        if (!channel?.isTextBased()) { this.logger.warn(`postNewMatch: channel invalide pour ${gs.guild_id}`); return false; }


        const leagues = Array.isArray(gs.leagues) ? gs.leagues : [];
        const matches = leagues.length ? await this.matchesService.upcomingByLeagues(leagues) : [];
        if (!matches.length) return;

        const lastSeen = (await getCursor("ps_incoming_modified")) || new Date(Date.now() - 7*24*3600e3).toISOString();
        let maxSeenThisRun = lastSeen;

        for (const m of matches) {

            if(m.modified_at <= lastSeen) continue;
            if(!gs.leagues.includes(m.league_id)) continue;
            if(m.status !== "not_started") continue;

            if (new Date(m.modified_at) > new Date(maxSeenThisRun)) maxSeenThisRun = m.modified_at;

            await channel.send(this.voteUI.build(m));
            await this.#sleep(350);
        }

        await setCursor(maxSeenThisRun, "ps_incoming_modified")

        return true;
    }

}
