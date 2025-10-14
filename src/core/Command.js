/**
 * Contrat minimal pour toutes les commandes
 * @property {data} SlashCommandBuilder
 * @property {name} String
 */
export class Command {
    data;
    name;
    constructor() {
    }

    async execute(/* interaction, ctx */) {
        throw new Error('execute() not implemented');
    }

    async onAutocomplete(/* interaction, ctx */) {}
    async onComponent(/* interaction, ctx */) {}
}
