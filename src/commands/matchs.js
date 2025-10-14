import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildSettings } from '../db/guildSettings.js';
import { matchesRepo } from '../db/matchesRepo.js';
import { matchEmbed } from '../ui/embeds.js';
import { voteButtons } from '../ui/voteComponents.js';
import { buildMatchSelect } from '../ui/matchPicker.js';

export default class MatchsCommand {
    constructor() {
        this.data = new SlashCommandBuilder()
            .setName('matchs')
            .setDescription('Prochains matchs (sélecteur + vote)');
    }

    async execute(interaction, ctx) {
        const gs = await getGuildSettings(interaction.guildId);
        if (!gs?.leagues?.length) {
            return interaction.reply({ content: "⚙️ Configure d’abord `/setup leagues`.", ephemeral: true });
        }

        // on prend large pour la journée / week-end
        const matches = await matchesRepo.upcomingByLeagues(gs.leagues, 100);
        if (!matches.length) {
            return interaction.reply({ content: "📭 Aucun match à venir.", ephemeral: true });
        }

        const key = `${interaction.guildId}:${interaction.channelId}:matchs_ids`;
        ctx.cache.set(key, { ids: matches.map(m => m.id) }, 60_000);

        // afficher un header + sélecteur; pas de vote tant que rien n’est choisi
        const header = new EmbedBuilder()
            .setTitle('🗓️ Matchs à venir')
            .setDescription(`Utilise le sélecteur ci-dessous pour afficher un match et voter.`);

        const { rows } = buildMatchSelect({ cmdName: 'matchs', matches, offset: 0, total: matches.length });

        await interaction.reply({
            embeds: [header],
            components: rows
        });
    }

    async onComponent(interaction, ctx) {
        const [prefix, kind, arg] = interaction.customId.split(':');
        if (prefix !== 'matchs') return;

        const key = `${interaction.guildId}:${interaction.channelId}:matchs_ids`;
        let state = await ctx.cache.get(key);
        if (!state) {
            // cache expiré → re-fetch minimal
            // (on ne connaît pas les ligues ici, mais on peut éviter la DB: on laisse l’utilisateur relancer /matchs)
            return interaction.reply({ content: "⏳ La liste a expiré. Relance `/matchs`.", ephemeral: true });
        }

        // Reconstituer les matches à partir des IDs (on recharge tout d’un coup pour simplifier)
        const ids = state.ids;
        const matches = await Promise.all(ids.map(id => matchesRepo.byId(id)));

        // Navigation de la fenêtre
        if (kind === 'list') {
            await interaction.deferUpdate();
            const prevOffset = Number(arg) || 0;
            const windowSize = 25;
            const nextOffset = interaction.customId.includes(':next:')
                ? prevOffset + windowSize
                : Math.max(0, prevOffset - windowSize);

            const { rows } = buildMatchSelect({ cmdName: 'matchs', matches, offset: nextOffset, total: matches.length });
            // garde l’embed actuel si présent
            const current = await interaction.message.fetch();
            await interaction.editReply({
                embeds: current.embeds, // ne pas toucher
                components: rows
            });
            return;
        }

        // Sélection d’un match
        if (kind === 'select') {
            const matchId = Number(interaction.values?.[0]);
            if (!matchId) {
                return interaction.reply({ content: "❌ Sélection invalide.", ephemeral: true });
            }
            await interaction.deferUpdate(); // on va éditer le même message

            const match = await matchesRepo.byId(matchId);
            if (!match) {
                return interaction.followUp({ content: "❌ Match introuvable.", ephemeral: true });
            }

            const embed = matchEmbed(match);
            const votes = voteButtons(match);

            const prevOffset = Number(arg) || 0;
            const { rows } = buildMatchSelect({ cmdName: 'matchs', matches, offset: prevOffset, total: matches.length });

            await interaction.editReply({
                embeds: [embed],
                components: [votes, ...rows] // votes au-dessus, puis sélecteur + nav
            });

        }
    }
}
