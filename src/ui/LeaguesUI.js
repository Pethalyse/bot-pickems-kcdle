import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle, Component,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import {UI} from "./UI.js";
import {chunkButtons, clamp, numEmoji} from "../utils/uiHelpers.js";
import {CustomId} from "../utils/CustomId.js";

const PAGE_SIZE = 10;

/**
 * UI class to show all the leagues and choose which follow
 * @method build
 * @method openSearch
 */
export class LeaguesUI extends UI {
    /**
     * @param pageData
     * @param mode
     * @param page
     * @param query
     * @return {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
     */
    build(pageData, mode, page, query) {
        const title = mode === 'all' ? 'Ligues — Liste' : `Ligues — Résultats${query ? ` : “${clamp(query, 30)}”` : ''}`;
        const embed = new EmbedBuilder().setTitle(title);

        const lines = pageData.items.map((l, i) => {
            const mark = l.followed ? '✅' : '➕';
            return `${numEmoji(i+1)} ${mark} ${l.name}`;
        });
        embed.setDescription(lines.length ? lines.join('\n') : '_Aucun résultat_');
        embed.setFooter({ text :`${pageData.page + 1}/${pageData.totalPages}`})


        const toggleButtons = pageData.items.map((l, i) =>
            new ButtonBuilder()
                .setCustomId(CustomId.make(this.ns, 'leagues:toggle', { leagueId: l.id, page, mode }))
                .setLabel(String(i + 1))
                .setStyle(l.followed ? ButtonStyle.Success : ButtonStyle.Secondary)
        );


        const nav = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leagues:page', { mode, page: Math.max(0, pageData.page - 1), query }))
                .setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leagues:page', { mode, page: pageData.page + 1, query }))
                .setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= pageData.totalPages - 1),
            // new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leagues:search', {update : false}))
            //     .setLabel('Rechercher').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'back'))
                .setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary),
        );


        const components = [...chunkButtons(toggleButtons), nav];
        return { embeds: [embed], components : components };
    }


    /**
     * Open a modal to search a specific league
     * @returns ModalBuilder
     */
    openSearch() {
        const modal = new ModalBuilder()
            .setCustomId(CustomId.make(this.ns, 'leagues:search:modal'))
            .setTitle('Rechercher une ligue');
        const q = new TextInputBuilder()
            .setCustomId('q').setLabel('Nom contient…').setRequired(true)
            .setStyle(TextInputStyle.Short).setPlaceholder('LEC, LFL, Worlds…');
        modal.addComponents(new ActionRowBuilder().addComponents(q));
        return modal;
    }
}