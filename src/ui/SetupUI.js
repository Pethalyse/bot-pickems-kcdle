import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from "discord.js";
import {UI} from "./UI.js";
import {CustomId} from "../utils/CustomId.js";

/**
 * UI class to show the setup menu
 */
export class SetupUI extends UI {
    /**
     * @param gs
     * @return {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
     */
    build(gs) {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuration du serveur')
            .setDescription('Configurer les paramètres principaux du bot pour ce serveur.');

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'leagues:open'))
                    .setLabel('Ligues').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'votechannel:open'))
                    .setLabel('Salon des votes').setStyle(ButtonStyle.Secondary),
                // new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'tz:open'))
                //     .setLabel('Fuseau horaire').setStyle(ButtonStyle.Secondary),
            ),
            // new ActionRowBuilder().addComponents(
            //     new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'votes:postToday'))
            //         .setLabel('Poster les votes du jour').setStyle(ButtonStyle.Success),
            //     new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'votes:scheduleDaily'))
            //         .setLabel('Programmer quotidiennement').setStyle(ButtonStyle.Secondary),
            // ),
        ];

        embed.addFields(
            // {name: 'Fuseau horaire', value: gs.timezone ?? '_non défini_'},
            {name: 'Ligues suivies', value: gs.leagues?.length ? String(gs.leagues.length) : '_0_'},
            {name: 'Salon des votes', value: gs.vote_channel_id ? `<#${gs.vote_channel_id}>` : '_non défini_'},
        );


        return { embeds: [embed], components : components };
    }
}