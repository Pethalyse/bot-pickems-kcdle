import { ActionRowBuilder } from 'discord.js';


export const clamp = (s, n) => (s?.length > n ? s.slice(0, n - 1) + '…' : s);

/**
 * Create a tab of ActionRowBuilder who each contains a maximum of 5 components
 * @param {ButtonBuilder[]} buttons
 * @param {Number} perRow
 * @returns {ActionRowBuilder[]}
 */
export function chunkButtons(buttons, perRow = 5) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += perRow) {
        rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + perRow)));
    }
    return rows;
}

export const numEmoji = (i) => ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i];
