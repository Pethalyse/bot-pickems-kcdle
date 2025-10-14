import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildSettings } from '../db/guildSettings.js';
import { seriesRepo } from '../db/seriesRepo.js';
import { leaderboardService } from '../services/leaderboardService.js';
import {Command} from "../core/Command.js";

function fmtRow(i, uid, name, pts, meId) {
    const rank = i + 1;
    const who = name ? `**${name}**` : `<@${uid}>`;
    const me = uid === meId ? ' 👈' : '';
    return `**${rank}.** ${who} — **${pts}** pt${pts>1?'s':''}${me}`;
}

export default class LeaderboardCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('Classements par série, ligue+année, ou global (serveur)')
            .addStringOption(o =>
                o.setName('scope').setRequired(true)
                    .setDescription('global | series | league_year')
                    .addChoices(
                        {name: 'global (serveur)', value: 'global'},
                        {name: 'par série', value: 'series'},
                        {name: 'par ligue + année', value: 'league_year'}
                    ))
            .addIntegerOption(o => o.setName('series_id').setDescription('ID série').setAutocomplete(true))
            .addIntegerOption(o => o.setName('league_id').setDescription('ID ligue'))
            .addIntegerOption(o => o.setName('year').setDescription('Année'))
            .addIntegerOption(o => o.setName('limit').setDescription('Top N').setMinValue(3).setMaxValue(50));
        this.name = this.data.name;
    }

    async execute(interaction/*, ctx */) {
        const scope = interaction.options.getString('scope', true);
        const limit = interaction.options.getInteger('limit') ?? 15;
        const guildId = interaction.guildId;
        const meId = interaction.user.id;

        let title = 'Leaderboard';
        let rows = [];

        if (scope === 'global') {
            title = 'Leaderboard — Global (serveur)';
            rows = await leaderboardService.global(guildId, limit);
        } else if (scope === 'series') {
            const seriesId = interaction.options.getInteger('series_id');
            if (!seriesId) return interaction.reply({ content: '❌ Donne `series_id`.', ephemeral: true });
            title = `Leaderboard — Série ${seriesId}`;
            rows = await leaderboardService.series(guildId, seriesId, limit);
        } else {
            const leagueId = interaction.options.getInteger('league_id');
            const year = interaction.options.getInteger('year');
            if (!leagueId || !year) return interaction.reply({ content: '❌ Donne `league_id` et `year`.', ephemeral: true });
            title = `Leaderboard — Ligue ${leagueId} • ${year}`;
            rows = await leaderboardService.leagueYear(guildId, leagueId, year, limit);
        }

        if (!rows.length) return interaction.reply({ content: '📭 Aucun résultat.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(rows.map((r,i)=>fmtRow(i, r.user_id, r.display_name, r.points, meId)).join('\n'));

        return interaction.reply({ embeds: [embed] });
    }

    async onAutocomplete(interaction/*, ctx */) {
        const opt = interaction.options.getFocused(true);
        if (opt.name !== 'series_id') return interaction.respond([]);
        const q = String(opt.value || '').trim();

        const gs = await getGuildSettings(interaction.guildId);
        if (!gs?.leagues?.length) return interaction.respond([]);

        const found = await seriesRepo.searchByLeagueIds(gs.leagues, q, 25);
        const choices = found.map(s => ({
            name: `${s.league_slug} • ${s.full_name ?? ''} ${s.year ?? ''}`.trim(),
            value: s.id
        })).slice(0, 25);

        return interaction.respond(choices);
    }
}
