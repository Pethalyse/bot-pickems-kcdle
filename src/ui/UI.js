/**
 * The main class UI
 */
export class UI{
    /**
     *
     * @param {string} ns First element for the custom ids
     */
    constructor(ns) {
        this.ns = ns;
    }

    static toast(interaction, message) { return interaction.editReply({ content: message, embeds: [], components: [] }); }
    static unknown(interaction) { return interaction.editReply({ content: 'Commande inconnue.', ephemeral: true }); }
}