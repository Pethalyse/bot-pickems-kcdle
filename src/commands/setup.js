import {ChannelType, SlashCommandBuilder, PermissionFlagsBits} from 'discord.js';
import {ensureGuildSettings, setGuildLeagues, setGuildTimezone, setGuildVoteChannel} from '../db/guildSettings.js';
import {Command} from "../core/Command.js";
import {postTodayVotesForGuild, scheduleDailyVotesForGuild} from "../scheduler/dailyVotes.js";

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
            )
            .addSubcommand(sc =>
                sc.setName('channel')
                    .setDescription('Définir le salon de publication quotidienne des votes')
                    .addChannelOption(o =>
                        o.setName('votes')
                            .setDescription('Salon cible (texte)')
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(true)
                    )
            );
        this.name = this.data.name;
    }

    async execute(interaction, ctx ) {
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

        if (sub === 'channel') {
            const ch = interaction.options.getChannel('votes', true);
            const me = interaction.guild.members.me;
            const perms = ch.permissionsFor(me);
            if (!perms?.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ content: "⛔ Je ne peux pas écrire dans ce salon.", ephemeral: true });
            }

            const gs0 = await ensureGuildSettings(interaction.guildId, { timezone: 'Europe/Paris', leagues: [] });

            const gs = await setGuildVoteChannel(interaction.guildId, ch.id);

            await interaction.reply({ content: `✅ Salon des votes enregistré : ${ch}\n▶️ Publication des votes du jour…`, ephemeral: true });

            try {
                await postTodayVotesForGuild(ctx.bot ?? { client: interaction.client }, { ...gs0, ...gs, guild_id: interaction.guildId });
            } catch (e) {
                console.error('postTodayVotesForGuild error:', e);
                await interaction.followUp({ content: "⚠️ Impossible de poster les votes du jour (voir logs).", ephemeral: true });
            }

            try {
                await scheduleDailyVotesForGuild(ctx.bot ?? { client: interaction.client }, { ...gs0, ...gs, guild_id: interaction.guildId });
            } catch (e) {
                console.error('scheduleDailyVotesForGuild error:', e);
                await interaction.followUp({ content: "⚠️ Cron quotidien non planifié (voir logs).", ephemeral: true });
            }
        }
    }
}
