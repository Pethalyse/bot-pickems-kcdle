import {getGuildSettings, setGuildLeagues, setGuildTimezone, setGuildVoteChannel} from "../db/guildSettingsRepo.js";

export class GuildSettingsService {
    async get(guildId) {
        const gs = await getGuildSettings(guildId);
        return { ...gs, guild_id: guildId, leagues: gs?.leagues ?? [] };
    }

    async setTimezone(guildId, tz) { await setGuildTimezone(guildId, tz); }
    async setVoteChannel(guildId, channelId) { await setGuildVoteChannel(guildId, channelId); }
    async setGuildLeagues(guildId, leagueId) { await setGuildLeagues(guildId, leagueId); }
}