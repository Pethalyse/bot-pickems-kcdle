/**
 * Contrat minimal pour toutes les commandes
 * @property {Router} router
 */
export class Command {
    router;
    constructor(){}
    get data() {}
    get name() {}
    async execute(interaction) { await this.router.handleSlash(interaction);}
    async onButton(interaction) { await this.router.handleButton(interaction); }
    async onStringSelect(interaction) { await this.router.handleStringSelect(interaction); }
    async onChannelSelect(interaction) { await this.router.handleChannelSelect(interaction); }
    async onModalSubmit(interaction) { await this.router.handleModal(interaction); }
}
