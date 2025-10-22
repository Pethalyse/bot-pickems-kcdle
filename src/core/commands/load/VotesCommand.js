import {SlashCommandBuilder, PermissionFlagsBits, ChannelType} from 'discord.js';
import {Command} from "../Command.js";
import {VotesRouter} from "../router/VotesRouter.js";
import {GuildSettingsService} from "../../../services/GuildSettingsService.js";
import {MatchesService} from "../../../services/MatchesService.js";
import {VoteUI} from "../../../ui/VoteUI.js";
import {PermissionGuard} from "../../../utils/PermissionGuard.js";
import {PredictionService} from "../../../services/PredictionService.js";


function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default class VotesCommand extends Command {
    constructor(deps) {
        super();
        this.router = new VotesRouter(
            new GuildSettingsService(),
            new PredictionService(),
            new MatchesService(),
            new VoteUI(this.name),
            new PermissionGuard(),
            deps?.logger,
            deps?.cache,
            null
        );
    }

    get data() {
        return new SlashCommandBuilder()
            .setName('votes')
            .setDescription("Publie des messages de vote pour les matchs à venir")
            .addIntegerOption(o => o
                .setName('within_hours')
                .setDescription('Fenêtre de publication (heures à venir), défaut 24')
                .setMinValue(1).setMaxValue(168))
            .addChannelOption(o => o
                .setName('channel')
                .setDescription("Salon cible (sinon, salon configuré ou salon courant)")
                .addChannelTypes(ChannelType.GuildText))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    }
    get name() { return "votes"; }
}
