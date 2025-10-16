import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildMatchSelect({ cmdName = 'matchs', matches, offset = 0, total }) {
    const windowSize = 25;
    const slice = matches.slice(offset, offset + windowSize);

    const options = slice.map(m => {
        const t = m.scheduled_at ? new Date(m.scheduled_at) : null;
        const hh = t ? t.toISOString().substring(11,16) : '??:??';
        const label = `${hh} • ${m.team1_acronym ?? m.team1_name} vs ${m.team2_acronym ?? m.team2_name}`;
        return {
            label: label.slice(0, 100),
            value: String(m.id),
            description: `${m.league_slug ?? ''} • ${m.tournament_name || m.series_full_name || m.slug || ''}`.slice(0, 100)
        };
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId(`${cmdName}:select:${offset}`)
        .setPlaceholder('Choisis un match…')
        .addOptions(options);

    const rowSelect = new ActionRowBuilder().addComponents(select);
    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${cmdName}:list:prev:${offset}`)
            .setLabel('⬅️ Précédent')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(offset <= 0),
        new ButtonBuilder()
            .setCustomId(`${cmdName}:list:next:${offset}`)
            .setLabel('Suivant ➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(offset + windowSize >= total)
    );

    return { rows: [rowSelect, rowNav], windowSize };
}
