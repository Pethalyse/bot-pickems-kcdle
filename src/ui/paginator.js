import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildPageRow(cmdName, page, total) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${cmdName}:prev:${page}`)
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`${cmdName}:next:${page}`)
            .setLabel('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
    );
}

export function slicePage(items, page, per = 1) {
    const start = page * per;
    return items.slice(start, start + per);
}
