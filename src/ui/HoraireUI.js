import {UI} from "./UI.js";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from "discord.js";
import {CustomId} from "../utils/CustomId.js";

/**
 * UI class to choose the schedule for the votes messages
 */
export class HoraireUI extends UI {

    /**
     * @param interaction
     * @return {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
     */
    build(interaction) {
        const embed = new EmbedBuilder().setTitle('Fuseau horaire')
            .setDescription('Sélectionnez le fuseau du serveur.');
        const select = new StringSelectMenuBuilder()
            .setCustomId(CustomId.make(this.ns, 'tz:pick'))
            .setPlaceholder('Choisir…')
            .addOptions([
                { label: 'Europe/Paris', value: 'Europe/Paris' },
                { label: 'Europe/London', value: 'Europe/London' },
                { label: 'UTC', value: 'UTC' },
                { label: 'America/New_York', value: 'America/New_York' },
                { label: 'Asia/Seoul', value: 'Asia/Seoul' },
            ]);

        const components = [
            new ActionRowBuilder().addComponents(select),
        ];

        return { embeds: [embed], components : components };
    }

    /**
     * Show to confirm the change
     * @param interaction
     * @param tz
     * @returns {*}
     */
    confirmTimezone(interaction, tz) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(CustomId.make(this.ns, 'tz:save', { tz }))
                .setLabel(`Enregistrer ${tz}`).setStyle(ButtonStyle.Success)
        );
        const embed = new EmbedBuilder().setDescription(`Confirmer le fuseau : **${tz}** ?`);
        return { embeds: [embed], components: [row] };
    }
}