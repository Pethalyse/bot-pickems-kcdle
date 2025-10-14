import { EmbedBuilder } from 'discord.js';

export function matchEmbed(m) {
    return new EmbedBuilder()
        .setTitle(`${m.team1_name ?? 'TBD'} vs ${m.team2_name ?? 'TBD'}`)
        .setDescription([
            `Ligue : **${m.league_name}**`,
            m.tournament_name ? `Tournoi : ${m.tournament_name}` : null,
            m.series_full_name ? `Série : ${m.series_full_name}` : null,
            m.scheduled_at ? `Début : <t:${Math.floor(new Date(m.scheduled_at).getTime()/1000)}:f>` : null,
            `Format : ${m.number_of_games ? `BO${m.number_of_games}` : (m.match_type || '—')}`
        ].filter(Boolean).join('\n'))
        .setThumbnail(m.team1_image_url || m.team2_image_url || null);
}

export function matchesListEmbeds(matches) {
    return matches.map(matchEmbed);
}
