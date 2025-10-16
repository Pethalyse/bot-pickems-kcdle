import {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
    PermissionFlagsBits
} from 'discord.js';
import { Command } from '../Command.js';
import { getGuildSettings } from '../../../db/guildSettings.js';
import { leaderboardRepo } from '../../../db/leaderboardRepo.js';
import { seriesRepo } from '../../../db/seriesRepo.js';
import { formatLbLines } from '../../../ui/leaderboardFmt.js';
import {leaguesRepo} from "../../../db/leaguesRepo.js";

const CMD = 'leaderboard';
const PER_PAGE = 10;

async function scopeMenu(gs) {
    const opts = [{ label: 'Global', value: 'global' }];
    const leagues = await leaguesRepo.byIds(gs.leagues || []);
    leagues.forEach(l => opts.push({ label: l.name || l.slug || String(l.id), value: `league:${l.id}` }));
    const menu = new StringSelectMenuBuilder()
        .setCustomId('classement:scope')
        .setPlaceholder('Choisis un classement…')
        .addOptions(opts.slice(0,25));
    return new ActionRowBuilder().addComponents(menu);
}

function yearsMenu(leagueId, years) {
    const opts = [{ label: 'Toutes', value: `league:${leagueId}:all` }]
        .concat(years.map(y => ({ label: String(y), value: `league:${leagueId}:${y}` })));
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`${CMD}:year`)
        .setPlaceholder('Choisis une année…')
        .addOptions(opts.slice(0, 25));
    const back = new ButtonBuilder().setCustomId(`${CMD}:back`).setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary);
    return [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(back),
    ];
}

function pagerRow(customBase, page, pages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${customBase}:prev:${page}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page<=0),
        new ButtonBuilder().setCustomId(`${customBase}:next:${page}`).setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page>=pages-1)
    );
}

export default class LeaderboardCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName(CMD)
            .setDescription('Afficher les classements (global, ligue, année)')
    }

    async execute(interaction, ctx) {
        const gs = await getGuildSettings(interaction.guildId);
        const embed = new EmbedBuilder()
            .setTitle('📊 Classements')
            .setDescription('Choisis un classement à afficher (message final public).')
        await interaction.reply({
            embeds: [embed],
            components: [scopeMenu(gs)],
            ephemeral: true
        });
    }

    async onComponent(interaction, ctx) {
        if (!interaction.customId?.startsWith(`${CMD}:`)) return;

        const [_, kind, ...rest] = interaction.customId.split(':');

        if (kind === 'back') {
            const gs = await getGuildSettings(interaction.guildId);
            const embed = new EmbedBuilder().setTitle('📊 Classements').setDescription('Choisis un classement à afficher.');
            return interaction.update({ embeds: [embed], components: [scopeMenu(gs)] });
        }

        if (kind === 'scope' && interaction.isStringSelectMenu()) {
            const val = interaction.values[0];
            if (val === 'global') {
                await interaction.deferUpdate();
                return this.#postLeaderboard(interaction, { type: 'global' });
            }
            if (val.startsWith('league:')) {
                await interaction.deferUpdate();
                const leagueId = Number(val.split(':')[1]);
                const years = await seriesRepo.yearsForLeague(leagueId);
                const embed = new EmbedBuilder().setTitle(`📊 Classement — Ligue ${leagueId}`).setDescription('Choisis une année.');
                return interaction.editReply({ embeds: [embed], components: yearsMenu(leagueId, years) });
            }
        }

        if (kind === 'year' && interaction.isStringSelectMenu()) {
            await interaction.deferUpdate();
            const val = interaction.values[0];
            const parts = val.split(':');
            const leagueId = Number(parts[1]);
            const year = parts[2] === 'all' ? null : Number(parts[2]);
            return this.#postLeaderboard(interaction, { type: 'league', leagueId, year });
        }

        if (kind === 'lb') {
            const scopeKey = rest[0];
            const dir = rest[1];
            const cur = Number(rest[2]) || 0;
            const next = dir === 'next' ? cur + 1 : cur - 1;

            return this.#editLeaderboardPage(interaction, scopeKey, next);
        }
    }

    // ---- Helpers d’affichage public ----
    #scopeKey(params) {
        if (params.type === 'global') return 'global';
        return `league-${params.leagueId}-${params.year ?? 'all'}`;
    }

    async #fetchScope(interaction, params, page = 0) {
        const limit = PER_PAGE;
        const offset = page * limit;
        if (params.type === 'global') {
            return leaderboardRepo.global(interaction.guildId, limit, offset);
        }
        return leaderboardRepo.league(interaction.guildId, params.leagueId, { year: params.year, limit, offset });
    }

    async #postLeaderboard(interaction, params) {
        const scopeKey = this.#scopeKey(params);
        const { rows, totalRows } = await this.#fetchScope(interaction, params, 0);

        if (!rows.length) {
            return interaction.followUp({ content: '📭 Aucun résultat pour ce scope.', ephemeral: true });
        }

        const pages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
        const title =
            params.type === 'global'
                ? 'Classement — Global'
                : `Classement — Ligue ${params.leagueId}${params.year ? ' • ' + params.year : ' • Toutes années'}`;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(formatLbLines(rows))
            .setFooter({ text: `Page 1/${pages} • généré à ${new Date().toLocaleTimeString()}` });

        const rowPager = pagerRow(`${CMD}:lb:${scopeKey}`, 0, pages);

        const msg = await interaction.channel.send({ embeds: [embed], components: pages > 1 ? [rowPager] : [] });
        await interaction.editReply({ content: '✅ Classement posté.', embeds: [], components: [] });

        return msg;
    }

    async #editLeaderboardPage(interaction, scopeKey, page) {
        await interaction.deferUpdate();
        // parse scopeKey
        const parts = scopeKey.split('-');
        let params;
        if (scopeKey === 'global') params = { type: 'global' };
        else params = { type: 'league', leagueId: Number(parts[1]), year: parts[2] === 'all' ? null : Number(parts[2]) };

        const { rows, totalRows } = await this.#fetchScope(interaction, params, page);
        const pages = Math.max(1, Math.ceil(totalRows / PER_PAGE));

        const title =
            params.type === 'global'
                ? 'Classement — Global'
                : `Classement — Ligue ${params.leagueId}${params.year ? ' • ' + params.year : ' • Toutes années'}`;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(formatLbLines(rows))
            .setFooter({ text: `Page ${page+1}/${pages} • généré à ${new Date().toLocaleTimeString()}` });

        const rowPager = pagerRow(`${CMD}:lb:${scopeKey}`, page, pages);
        await interaction.editReply({ embeds: [embed], components: pages > 1 ? [rowPager] : [] });
    }
}
