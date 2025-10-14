import { SlashCommandBuilder } from 'discord.js';
import { ensureGuildSettings, setGuildLeagues, setGuildTimezone } from '../db/guildSettings.js';
import {Command} from "../core/Command.js";

function parseLeagueArgToIds(raw) {
    const envMap = {
        lec: Number(process.env.LEAGUE_ID_LEC),
        lfl: Number(process.env.LEAGUE_ID_LFL),
        worlds: Number(process.env.LEAGUE_ID_WORLDS),
    };
    return raw.split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
        .map(v => /^\d+$/.test(v) ? Number(v) : envMap[v])
        .filter(n => Number.isFinite(n));
}

export default class SetupCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('setup')
            .setDescription('Configurer le bot pour ce serveur')
            .addSubcommand(sc =>
                sc.setName('leagues')
                    .setDescription('Définir les ligues suivies (lec,lfl,worlds ou IDs)')
                    .addStringOption(o =>
                        o.setName('values')
                            .setDescription('Liste: lec,lfl,worlds ou IDs séparés par des virgules')
                            .setRequired(true)
                    )
            )
            .addSubcommand(sc =>
                sc.setName('timezone')
                    .setDescription('Définir le fuseau horaire (IANA)')
                    .addStringOption(o =>
                        o.setName('tz')
                            .setDescription('Ex: Europe/Paris')
                            .setRequired(true)
                    )
            );
        this.name = this.data.name;
    }

    async execute(interaction/*, ctx */) {
        const guildId = interaction.guildId;
        const sub = interaction.options.getSubcommand();

        await ensureGuildSettings(guildId, { timezone: 'Europe/Paris', leagues: [] });

        if (sub === 'leagues') {
            const raw = interaction.options.getString('values', true);
            const ids = parseLeagueArgToIds(raw);
            if (!ids.length) {
                return interaction.reply({ content: "❌ Aucune ligue valide.", ephemeral: true });
            }
            const gs = await setGuildLeagues(guildId, ids);
            return interaction.reply({ content: `✅ Ligues: ${gs.leagues.join(', ')}`, ephemeral: true });
        }

        if (sub === 'timezone') {
            const tz = interaction.options.getString('tz', true);
            const gs = await setGuildTimezone(guildId, tz);
            return interaction.reply({ content: `✅ Fuseau: ${gs.timezone}`, ephemeral: true });
        }
    }
}
