import {LeaderboardRouter} from "../router/LeaderboardRouter.js";
import {LeaderboardService} from "../../../services/LeaderboardService.js";
import {LeaderboardUI} from "../../../ui/LeaderboardUI.js";
import {PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
import {Command} from "../Command.js";
import {LeagueService} from "../../../services/LeagueService.js";
import {GuildSettingsService} from "../../../services/GuildSettingsService.js";
import {SeriesService} from "../../../services/SeriesService.js";
import {TournamentService} from "../../../services/TournamentService.js";

export default class LeaderboardCommand extends Command {
    constructor(deps) {
        super();
        this.router = new LeaderboardRouter(
            new LeaderboardService(),
            new LeagueService(),
            new SeriesService(),
            new TournamentService(),
            new GuildSettingsService(),
            new LeaderboardUI(this.name),
            deps?.logger,
            deps?.cache
        );
    }


    get data() {
        return new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('Affiche le classement des joueurs ou équipes selon leurs points')
            .addStringOption(o => o
                .setName('type')
                .setDescription('Type de classement : joueurs ou équipes')
                .addChoices(
                    { name: 'Joueurs', value: 'players' },
                    { name: 'Équipes', value: 'teams' },
                ))
            .addIntegerOption(o => o
                .setName('limit')
                .setDescription('Nombre de résultats à afficher (défaut 10)')
                .setMinValue(1)
                .setMaxValue(50))
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);
    }
    get name() { return "leaderboard"; }
}