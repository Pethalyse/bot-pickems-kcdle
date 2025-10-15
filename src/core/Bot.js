import { Client, GatewayIntentBits, InteractionType, Events } from 'discord.js';
import { loadCommands } from './loader.js';

export class Bot {
    #client;
    #commands;
    #ctx;

    constructor(ctx) {
        this.#client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.#ctx = ctx;
        this.#ctx.bot = this;
    }

    get client() { return this.#client; }

    async start(token) {
        this.#commands = await loadCommands();
        this.#wireInteractions();
        await this.#client.login(token);
        this.#ctx.logger?.info?.('✅ Bot logged in');
    }

    commandsForRegistry() {
        return Array.from(this.#commands.values()).map(c => c.data);
    }

    #wireInteractions() {
        this.#client.on(Events.InteractionCreate, async (interaction) => {
            try {
                // Slash command
                if (interaction.isChatInputCommand()) {
                    const cmd = this.#commands.get(interaction.commandName);
                    if (!cmd) return;
                    return await cmd.execute(interaction, this.#ctx);
                }
                // Autocomplete
                if (interaction.isAutocomplete()) {
                    const cmd = this.#commands.get(interaction.commandName);
                    if (!cmd?.onAutocomplete) return;
                    return await cmd.onAutocomplete(interaction, this.#ctx);
                }
                // Bouton / Select / Modal
                if (
                    interaction.isButton() ||
                    interaction.isStringSelectMenu() ||
                    interaction.type === InteractionType.ModalSubmit
                ) {
                    // convention: customId "cmd:action:payload"
                    const [name] = interaction.customId.split(':');
                    const cmd = this.#commands.get(name);
                    if (!cmd?.onComponent) return;
                    return await cmd.onComponent(interaction, this.#ctx);
                }
            } catch (e) {
                console.error(e);
                const reply = { content: '❌ Erreur interne.', ephemeral: true };
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(reply).catch(() => {});
                } else {
                    await interaction.reply(reply).catch(() => {});
                }
            }
        });
    }
}
