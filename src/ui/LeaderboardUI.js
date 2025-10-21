import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from "discord.js";
import {UI} from "./UI.js";
import {CustomId} from "../utils/CustomId.js";
import {chunkButtons, numEmoji} from "../utils/uiHelpers.js";

/**
 * UI class to show the leaderboard
 */
export class LeaderboardUI extends UI {

    build(interaction, datas) {
        const lines = datas.map(async (data, i) => {
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const rate = Number(data.success_rate ?? 0).toFixed(2);

            let member = null;
            let user;
            try {
                member = await interaction.guild.members.fetch(data.user_id);
                user = member.user;
            } catch {
                user = await interaction.client.users.fetch(data.user_id).catch(() => null);
            }

            const name =
                member?.displayName ??
                user?.globalName ??
                user?.username ??
                `User ${data.user_id}`;

            return `${medal} **${name}** — ${rate}% (${data.correct_predictions}/${data.total_predictions})`;
        });

        return Promise.all(lines).then((resolvedLines) => {
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `Classement de ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined
                })
                .setDescription(`${resolvedLines.join('\n')}`)
                .setColor(0x3498db)
                .setFooter({ text: `Total joueurs : ${datas.length}` });

            return { embeds: [embed], components: [] };
        });
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
                .setCustomId(CustomId.make(this.ns,'leaderboard:leagues:select', { leagueId: l.id }))
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