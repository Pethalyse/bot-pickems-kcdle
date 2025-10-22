import {Router} from "./Router.js";
import {disassureEphemeral, ensureEphemeral} from "../../../utils/ensureEphemeral.js";
import {CustomId} from "../../../utils/CustomId.js";

export class LeaderboardRouter extends Router{
    /**
     * @param {LeaderboardService} leaderboardService
     * @param {LeagueService} leagueService
     * @param {SeriesService} seriesService
     * @param {TournamentService} tournamentService
     * @param {GuildSettingsService} guildSettingsService
     * @param {LeaderboardUI} leaderboardUI
     * @param {Console} logger
     * @param {ICache} cache
     */
    constructor(leaderboardService, leagueService, seriesService, tournamentService, guildSettingsService, leaderboardUI, logger, cache) {
        super(cache)
        this.leaderboardService = leaderboardService;
        this.leagueService = leagueService;
        this.seriesService = seriesService;
        this.tournamentService = tournamentService;
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
            case "leagues" :
                return await this.#openLeagues(interaction);
            case "leagues:select" :
                if(action.params.leagueId === '-1')
                    return this.#createLeaderboard(interaction);
                else
                    return await this.#openSeries(interaction);

            case "series:select" :
                if(action.params.seriesId === '-1')
                    return this.#createLeaderboard(interaction);
                else
                    return await this.#openTournament(interaction);

            case "tournament:select" :
                return this.#createLeaderboard(interaction);

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
        const action = interaction.customId ? CustomId.parse(interaction.customId) : null;

        const pageData = await this.seriesService.pageFromLeague(
            action.params.leagueId,
            action?.params?.page ?? 0,
            10
        );

        const league = await this.leagueService.get(action.params.leagueId);
        pageData.items.unshift(
            {league_id : action.params.leagueId, id: -1, full_name : "**Global**"}
        );
        await interaction.editReply(this.leaderboardUI.createSeriesPage(action.params.leagueId, league.name ,pageData));
    }

    async #openTournament(interaction){
        const action = interaction.customId ? CustomId.parse(interaction.customId) : null;

        const pageData = await this.tournamentService.pageFromSeries(
            action.params.leagueId,
            action.params.seriesId,
            action?.params?.page ?? 0,
            10
        );

        const league = await this.leagueService.get(action.params.leagueId);
        const series = await this.seriesService.get(action.params.seriesId);

        pageData.items.unshift(
            {league_id : action.params.leagueId, series_id: action.params.seriesId, id: -1, name : "**Global**"}
        );
        await interaction.editReply(
            this.leaderboardUI.createTournamentPage(
                action.params.leagueId, league.name,
                action.params.seriesId, series.full_name,
                pageData
            ));
    }

    async #createLeaderboard(interaction) {
        const action = CustomId.parse(interaction.customId);

        const league = action.params.leagueId ? await this.leagueService.get(action.params.leagueId) : "";
        const series = action.params.seriesId ? await this.seriesService.get(action.params.seriesId) : "";
        const tournament = action.params.tournamentId ? await this.tournamentService.get(action.params.tournamentId) : "";

        const ui =
            action.params.leagueId !== "-1" ?
                action.params.seriesId !== "-1" ?
                    action.params.tournamentId !== "-1" ?
                        await this.leaderboardUI.build(interaction,
                            await this.leaderboardService
                                .tournament(
                                    interaction.guildId,
                                    action.params.leagueId,
                                    action.params.seriesId ,
                                    action.params.tournamentId
                                ),
                            league.name, series.full_name, tournament.name,
                        )
                    : await this.leaderboardUI.build(interaction,
                            await this.leaderboardService.series(
                                interaction.guildId,
                                action.params.leagueId,
                                action.params.seriesId
                            ),
                            league.name, series.full_name,
                    )
                :  await this.leaderboardUI.build(interaction,
                        await this.leaderboardService.league(
                            interaction.guildId,
                            action.params.leagueId
                        ),
                        league.name,
                )
            :  await this.leaderboardUI.build(interaction,await this.leaderboardService.global(interaction.guildId))

        await interaction.followUp(ui);
    }


}