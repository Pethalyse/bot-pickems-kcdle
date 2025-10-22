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
            .addFields([
                {name : "Ligue", value: match.league_name, inline: true},
                match.series_full_name ? {name : "Série", value: match.series_full_name, inline: true} : null,
                match.tournament_name ? {name : "Tournoi", value: match.tournament_name, inline: true} : null,
            ])
            .addFields([
                {name : `Format`, value : match.number_of_games ? `BO${match.number_of_games}` : match.match_type || '—', inline: true},
                match.scheduled_at ? {name : "Début", value : `<t:${Math.floor(new Date(match.scheduled_at).getTime() / 1000)}:f>`, inline: true} : null,
                {name : "", value: "", inline: true},
            ])
            .addFields({name : "", value :`<t:${Math.floor(new Date(match.scheduled_at).getTime() / 1000)}:R>`})
            .setThumbnail(match.league_image || match.team1_image_url || match.team2_image_url || null)

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CustomId.make(this.ns, 'votes:vote', {"match" : match.id, "vote" : match.team1_id}))
                    .setLabel(`${match.team1_acronym ?? match.team1_name ?? 'Equipe 1'}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(CustomId.make(this.ns, 'votes:vote', {"match" : match.id, "vote" : match.team2_id}))
                    .setLabel(`${match.team2_acronym ?? match.team2_name ?? 'Equipe 2'}`)
                    .setStyle(ButtonStyle.Danger)
            )
        ];

        return { embeds: [embed], components : components };
    }

    predictMessage(result) {
        if (!result.ok) {
            const reasons = {
                MATCH_NOT_FOUND: "❌ Match introuvable.",
                MATCH_ALREADY_STARTED: "⛔ Le match a déjà démarré.",
                AFTER_DEADLINE: "⛔ Les votes sont fermés pour ce match.",
                INVALID_TEAM: "❌ Équipe invalide."
            };
            return {content: reasons[result.reason] || "❌ Vote impossible.", ephemeral: true };
        }

        const name = (result.teamId === parseInt(result.match.team1_id))
            ? (result.match.team1_acronym ?? result.match.team1_name)
            : (result.match.team2_acronym ?? result.match.team2_name);

        let msg = result.changed
            ? `📝 **Vote modifié** → ${name}`
            : (result.previousChoice ? `✅ **Vote inchangé** → ${name}` : `🗳️ **Vote enregistré** → ${name}`);

        return { content: msg, ephemeral: true };
    }

}