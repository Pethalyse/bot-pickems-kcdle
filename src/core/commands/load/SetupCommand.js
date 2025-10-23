import SetupRouter from "../router/SetupRouter.js";
import {Command} from "../Command.js";
import {PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
import {SetupUI} from "../../../ui/SetupUI.js";
import {LeaguesUI} from "../../../ui/LeaguesUI.js";
import {HoraireUI} from "../../../ui/HoraireUI.js";
import {ChannelVoteUI} from "../../../ui/ChannelVoteUI.js";
import {VoteUI} from "../../../ui/VoteUI.js";
import {GuildSettingsService} from "../../../services/GuildSettingsService.js";
import {LeagueService} from "../../../services/LeagueService.js";
import NewMatchVote from "../../../scheduler/NewMatchVote.js";
import {MatchesService} from "../../../services/MatchesService.js";

export default class SetupCommand extends Command {
    constructor(deps) {
        super();
        const voteUI = new VoteUI(this.name);
        this.router = new SetupRouter(
            new SetupUI(this.name),
            new LeaguesUI(this.name),
            new HoraireUI(this.name),
            new ChannelVoteUI(this.name),
            voteUI,
            new GuildSettingsService(),
            new LeagueService(),
            deps?.cache,
            new NewMatchVote(
                new MatchesService(),
                voteUI,
                deps.client.guilds,
                deps.logger,
            ),
        )
    }

    get data() {
        return new SlashCommandBuilder()
                .setName('setup')
                .setDescription('Configurer le bot pour ce serveur (ligues, salon de vote, fuseau, etc.)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    }
    get name() { return "setup"; }
}