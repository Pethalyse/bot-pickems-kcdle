import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function voteButtons(match) {

    const b1 = new ButtonBuilder()
        .setCustomId(`vote:${match.id}:${match.team1_id}`)
        .setLabel(`${match.team1_acronym ?? match.team1_name ?? 'Equipe 1'}`)
        .setStyle(ButtonStyle.Primary);

    const b2 = new ButtonBuilder()
        .setCustomId(`vote:${match.id}:${match.team2_id}`)
        .setLabel(`${match.team2_acronym ?? match.team2_name ?? 'Equipe 2'}`)
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder().addComponents(b1, b2);
}
