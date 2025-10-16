import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildSettings } from '../../../db/guildSettings.js';
import { matchesRepo } from '../../../db/matchesRepo.js';
import { matchEmbed } from '../../../ui/embeds.js';
import { voteButtons } from '../../../ui/voteComponents.js';
import {Command} from "../Command.js";


function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default class VotesCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('votes')
            .setDescription('Publie des messages de vote pour les matchs à venir (non ephemeral)')
            .addIntegerOption(o =>
                o.setName('within_hours')
                    .setDescription('Fenêtre des prochaines X heures (défaut 24)')
            )
            .addIntegerOption(o =>
                o.setName('limit')
                    .setDescription('Nombre max de matchs à publier (défaut 10, max 25)')
            );
        this.name = this.data.name;
    }

    async execute(interaction/*, ctx */) {
        const guildId = interaction.guildId;
        const channel = interaction.channel;

        const me = interaction.guild.members.me;
        const perms = channel.permissionsFor(me);
        if (!perms?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({ content: "⛔ Je n'ai pas la permission d'écrire ici.", ephemeral: true });
        }

        const gs = await getGuildSettings(guildId);
        if (!gs?.leagues?.length) {
            return interaction.reply({ content: "⚙️ Configure d’abord `/setup leagues`.", ephemeral: true });
        }

        const within = interaction.options.getInteger('within_hours') ?? 24;
        const limitReq = interaction.options.getInteger('limit') ?? 10;
        const limit = Math.max(1, Math.min(25, limitReq));

        const now = new Date();
        const end = new Date(now.getTime() + within * 60 * 60 * 1000);

        const matches = await matchesRepo.upcomingWindow(gs.leagues, now.toISOString(), end.toISOString(), limit);

        if (!matches.length) {
            return interaction.reply({ content: `📭 Aucun match dans les ${within} prochaines heures.`, ephemeral: true });
        }

        await interaction.reply({ content: `🛈 Publication de ${matches.length} message(s) de vote…`, ephemeral: true });

        for (let i = 0; i < matches.length; i++) {
            const m = matches[i];
            const embed = matchEmbed(m);
            const components = [voteButtons(m)];
            await channel.send({ embeds: [embed], components });
            await sleep(350);
        }
    }
}
