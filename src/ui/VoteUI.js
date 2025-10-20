import {UI} from "./UI.js";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from "discord.js";
import {CustomId} from "../utils/CustomId.js";

/**
 * UI class who show a vote message fot a match
 */
export class VoteUI extends UI {

    /**
     * @param match
     * @return {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
     */
    build(match) {
        const embed =  new EmbedBuilder()
            .setTitle(`${match.team1_name ?? 'TBD'} vs ${match.team2_name ?? 'TBD'}`)
            .setDescription([
                `Ligue : **${match.league_name}**`,
                match.tournament_name ? `Tournoi : ${match.tournament_name}` : null,
                match.series_full_name ? `Série : ${match.series_full_name}` : null,
                match.scheduled_at ? `Début : <t:${Math.floor(new Date(match.scheduled_at).getTime()/1000)}:f>` : null,
                `Format : ${match.number_of_games ? `BO${match.number_of_games}` : (match.match_type || '—')}`
            ].filter(Boolean).join('\n'))
            .setThumbnail(match.team1_image_url || match.team2_image_url || null);

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CustomId.make(this.ns, 'vote:vote', {"match" : match.id, "vote" : match.team1_id}))
                    .setLabel(`${match.team1_acronym ?? match.team1_name ?? 'Equipe 1'}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(CustomId.make(this.ns, 'vote:vote', {"match" : match.id, "vote" : match.team2_id}))
                    .setLabel(`${match.team2_acronym ?? match.team2_name ?? 'Equipe 2'}`)
                    .setStyle(ButtonStyle.Danger)
            )
        ];

        return { embeds: [embed], components : components };
    }


}