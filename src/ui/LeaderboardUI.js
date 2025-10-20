import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from "discord.js";
import {UI} from "./UI.js";
import {CustomId} from "../utils/CustomId.js";
import {chunkButtons, numEmoji} from "../utils/uiHelpers.js";

/**
 * UI class to show the leaderboard
 */
export class LeaderboardUI extends UI{

    /**
     * @param interaction
     * @param datas
     * @returns {Promise<{embeds, components: []}>}
     */
    build(interaction, datas) {
        const embed = new EmbedBuilder()
            .setTitle(`🏆 Classement de ${interaction.guild.name}`)
            .setDescription("-- TODO --")
            .setColor(0x3498db);

        const lines = datas.map(async (data, i) => {
            const member = await interaction.guild.members.fetch(data.user_id);
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const avatar = member.user.displayAvatarURL({dynamic: true});
            const name = `${member.user.globalName}`;
            const pourcentage = data.success_rate ?? 0;

            return new EmbedBuilder()
                .setAuthor({
                    name: `${medal} ${name}`,
                    iconURL: avatar ?? undefined,
                })
                .setDescription(
                    `**Taux de réussite :** ${pourcentage}%\n` +
                    `**Pronostics corrects :** ${data.correct_predictions} / ${data.total_predictions}`
                )
                .setThumbnail(avatar ?? undefined)
                .setColor(0x5865F2);
        });

        return Promise.all(lines).then(lines => {
            return { embeds: [embed, ...lines], components : [] };
        })
    }

    /**
     * @return {{embeds: EmbedBuilder[], components: []}}
     * @param {{}} pageData
     */
    createLeaguesPage(pageData){
        const embed = new EmbedBuilder()
            .setTitle("Choisissez les options du leaderboard")
            .setColor(0x3498db);

        embed.setFooter({ text :`${pageData.page + 1}/${pageData.totalPages}`})

        const lines = pageData.items.map((l, i) => {
            return `${numEmoji(i+1)} ${l.name}`;
        });
        embed.setDescription(lines.join('\n'));

        const options = pageData.items.map((l, i) =>
            new ButtonBuilder()
                .setCustomId(CustomId.make(this.ns,'leaderboard:leagues:select', { leagueId: l.id}))
                .setLabel(String(i + 1))
                .setStyle(ButtonStyle.Secondary)
        );

        const nav = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leaderboard:leagues:page', { page: Math.max(0, pageData.page - 1) }))
                .setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(pageData.page <= 0),
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leaderboard:leagues:page', { page: pageData.page + 1 }))
                .setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(pageData.page >= pageData.totalPages - 1),
        );

        const components = [...chunkButtons(options), nav];
        return { embeds: [embed], components : components };
    }
}