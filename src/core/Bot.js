import { Client, GatewayIntentBits, InteractionType, Events } from 'discord.js';
import { loadCommands } from './commands/loader.js';
import {CustomId} from "../utils/CustomId.js";

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
        this.#commands =
            await loadCommands({
                client: this.#client,
                logger: this.#ctx.logger,
                cache: this.#ctx.cache
            });
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

                if (interaction.isChatInputCommand()) {
                    const cmd = this.#commands.get(interaction.commandName);
                    if (!cmd) return;
                    return await cmd.execute(interaction);
                }

                if(CustomId.parse(interaction.customId).params.update)
                    await interaction.deferUpdate();

                if (interaction.isButton()) {
                    const [name] = interaction.customId.split(':');
                    const cmd = this.#commands.get(name);
                    if (!cmd?.onButton) return;
                    return await cmd.onButton(interaction);
                }

                if (interaction.isStringSelectMenu()) {
                    const [name] = interaction.customId.split(':');
                    const cmd = this.#commands.get(name);
                    if (!cmd?.onStringSelect) return;
                    return await cmd.onStringSelect(interaction);
                }

                if (interaction.isChannelSelectMenu()) {
                    const [name] = interaction.customId.split(':');
                    const cmd = this.#commands.get(name);
                    if (!cmd?.onChannelSelect) return;
                    return await cmd.onChannelSelect(interaction);
                }

                if (interaction.isModalSubmit()) {
                    const [name] = interaction.customId.split(':');
                    const cmd = this.#commands.get(name);
                    if (!cmd?.onModalSubmit) return;
                    return await cmd.onModalSubmit(interaction);
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
