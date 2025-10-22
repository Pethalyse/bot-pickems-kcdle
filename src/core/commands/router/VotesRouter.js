import {Router} from "./Router.js";
import {ensureEphemeral} from "../../../utils/ensureEphemeral.js";
import {CustomId} from "../../../utils/CustomId.js";

export class VotesRouter extends Router {
    /**
     * @param {GuildSettingsService} guildSettingsService
     * @param {PredictionService} predictionService
     * @param {MatchesService} matchesService
     * @param {VoteUI} voteUI
     * @param {PermissionGuard} permissionGuard
     * @param {Console} logger
     * @param {ICache} cache
     * @param {Function} sleeper
     */
    constructor(guildSettingsService, predictionService, matchesService, voteUI, permissionGuard, logger, cache, sleeper) {
        super(cache);
        this.guildSettingsService = guildSettingsService;
        this.predictionService = predictionService;
        this.matchesService = matchesService;
        this.voteUI = voteUI;
        this.permissionGuard = permissionGuard;
        this.logger = logger ?? console;
        this.sleep = sleeper ?? ((ms) => new Promise(r => setTimeout(r, ms)));
    }

    async handleSlash(interaction) {
        await ensureEphemeral(interaction);

        const guildId = interaction.guildId;
        if (!guildId) return interaction.editReply({ content: '❌ Cette commande doit être utilisée dans un serveur.' });

        const within = interaction.options.getInteger('within_hours') ?? 24;
        const selectedChannel = interaction.options.getChannel('channel');


        const gs = await this.guildSettingsService.get(guildId);
        if (!gs?.leagues?.length) {
            return interaction.editReply({ content: '⚙️ Configure d’abord des ligues via `/setup`.' });
        }

        const channel = selectedChannel
            ?? (gs.vote_channel_id ? await interaction.client.channels.fetch(gs.vote_channel_id).catch(() => null) : null)
            ?? interaction.channel;


        if (!channel) return interaction.editReply({ content: '❌ Salon introuvable.' });


        const permError = this.permissionGuard.firstError(channel, [
            'ViewChannel', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis',
        ]);
        if (permError) {
            return interaction.editReply({ content: `⛔ Permissions manquantes sur ${channel}: ${permError}` });
        }


        const now = new Date();
        const end = new Date(now.getTime() + within * 60 * 60 * 1000);

        const matches = await this.matchesService.findUpcoming({
            leagues: gs.leagues,
            start: now,
            end,
        });


        if (!matches?.length) {
            return interaction.editReply({ content: `📭 Aucun match dans les ${within} prochaines heures.` });
        }


        await interaction.editReply({ content: `🛈 Publication de ${matches.length} message(s) de vote dans ${channel}.` });

        for (const m of matches) {
            try {
                const payload = this.voteUI.build(m);
                await channel.send(payload);
                await this.sleep(350);
            } catch (e) {
                this.logger.error('votes:send:error', e);
            }
        }
    }

    async handleButton(interaction){
        const id = CustomId.parse(interaction.customId);

        const matchId = Number(id.params.match);
        const teamId = Number(id.params.vote);

        const res = await this.predictionService.cast(
            interaction.guildId,
            interaction.user,
            matchId,
            teamId
        );

        if (!res.ok) {
            const reasons = {
                MATCH_NOT_FOUND: "❌ Match introuvable.",
                MATCH_ALREADY_STARTED: "⛔ Le match a déjà démarré.",
                AFTER_DEADLINE: "⛔ Les votes sont fermés pour ce match.",
                INVALID_TEAM: "❌ Équipe invalide."
            };
            return interaction.followUp({ content: reasons[res.reason] || "❌ Vote impossible.", ephemeral: true });
        }

        const name = (teamId === parseInt(res.match.team1_id))
            ? (res.match.team1_acronym ?? res.match.team1_name)
            : (res.match.team2_acronym ?? res.match.team2_name);

        let msg = res.changed
            ? `📝 **Vote modifié** → ${name}`
            : (res.previousChoice ? `✅ **Vote inchangé** → ${name}` : `🗳️ **Vote enregistré** → ${name}`);

        return interaction.followUp({ content: msg, ephemeral: true });
    }
}