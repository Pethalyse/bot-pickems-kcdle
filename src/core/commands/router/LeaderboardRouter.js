import {Router} from "./Router.js";
import {disassureEphemeral, ensureEphemeral} from "../../../utils/ensureEphemeral.js";
import {CustomId} from "../../../utils/CustomId.js";

export class LeaderboardRouter extends Router{
    /**
     * @param {LeaderboardService} leaderboardService
     * @param {LeagueService} leagueService
     * @param {GuildSettingsService} guildSettingsService
     * @param {LeaderboardUI} leaderboardUI
     * @param {Console} logger
     * @param {ICache} cache
     */
    constructor(leaderboardService, leagueService, guildSettingsService, leaderboardUI, logger, cache) {
        super(cache)
        this.leaderboardService = leaderboardService;
        this.leagueService = leagueService;
        this.guildSettingsService = guildSettingsService;
        this.leaderboardUI = leaderboardUI;
        this.logger = logger ?? console;
    }

    async handleSlash(interaction) {
        await ensureEphemeral(interaction);
        await this.#openLeagues(interaction);
    }

    async handleButton(interaction) {
        const action = CustomId.parse(interaction.customId);

        switch (action.action) {
            case "leaderboard:leagues" :
                return await this.#openLeagues(interaction);
            case "leaderboard:leagues:select" :
                if(action.params.leagueId === '-1')
                    return this.#createLeaderboard(interaction);
                else
                    return await this.#openSeries(interaction);
            default:
                return this.handleSlash(interaction);
        }
    }

    async #openLeagues(interaction){
        const gs = await this.guildSettingsService.get(interaction.guildId);
        const action = interaction.customId ? CustomId.parse(interaction.customId) : null;

        const pageData = await this.leagueService.pageFollowed({
            guildId : interaction.guildId,
            followed: gs.leagues ?? [],
            page : action?.params?.page ?? 0,
            pageSize: 10,
        });
        pageData.items.unshift({id : -1, name : "**Global**"});
        await interaction.editReply(this.leaderboardUI.createLeaguesPage(pageData));
    }

    async #openSeries(interaction){

    }

    async #openTournament(interaction){

    }

    async #createLeaderboard(interaction) {
        await interaction.editReply(
            await this.leaderboardUI.build(
                interaction,
                await this.leaderboardService.global(interaction.guildId)
            )
        );
    }


}