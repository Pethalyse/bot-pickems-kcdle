import {UI} from "./UI.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    EmbedBuilder
} from "discord.js";
import {CustomId} from "../utils/CustomId.js";

/**
 * UI class to choose the channel for the votes messages
 */
export class ChannelVoteUI extends UI {
    /**
     * @param interaction
     * @return {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
     */
    build(interaction) {
        const embed = new EmbedBuilder().setTitle('Salon des votes')
            .setDescription('Choisissez le salon où poster les messages de vote.');
        
        const picker = new ChannelSelectMenuBuilder()
            .setCustomId(CustomId.make(this.ns, 'votechannel:pick'))
            .setChannelTypes([ChannelType.GuildText]);
        
        const components = [
            new ActionRowBuilder().addComponents(picker),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'back'))
                    .setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary),
                )
        ];

        return { embeds: [embed], components : components };
    }

    /**
     * Show to confirm the change
     * @param interaction
     * @param channelId
     * @returns {*}
     */
    confirmVoteChannel(interaction, channelId) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'votechannel:save', { channelId }))
                .setLabel(`Enregistrer le salon`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'votechannel:open'))
                .setLabel(`Annuler`).setStyle(ButtonStyle.Danger)
        );
        const embed = new EmbedBuilder().setDescription(`Confirmer le salon : <#${channelId}> ?`);
        return { embeds: [embed], components: [row] };
    }

}