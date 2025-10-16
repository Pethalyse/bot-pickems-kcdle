import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle, PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../Command.js';
import {
    getGuildSettings,
    ensureGuildSettings,
    setGuildLeagues,
    setGuildTimezone,
    setGuildVoteChannel,
} from '../../../db/guildSettings.js';
import { postTodayVotesForGuild, scheduleDailyVotesForGuild } from '../../../scheduler/dailyVotes.js';
import {leaguesRepo} from "../../../db/leaguesRepo.js";

const CMD = 'setup';
const PAGE_SIZE = 10;
const clamp = (s, n) => (s?.length > n ? s.slice(0, n - 1) + '…' : s);
const numEmoji = (i) => ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i];

function searchCacheKey(guildId, userId) { return `setup:leagues:search:${guildId}:${userId}`; }

async function buildMainEmbed(gs) {
    const leaguesText = gs.leagues ? (await leaguesRepo.byIds(gs.leagues || [])).map(l => l.name || l.slug || l.id).join(', ') : '—';
    const channelText = gs.vote_channel_id ? `<#${gs.vote_channel_id}>` : '—';
    const tzText = gs.timezone || 'Europe/Paris';

    return new EmbedBuilder()
        .setTitle('⚙️ Configuration du serveur')
        .setDescription(
            [
                'Choisis une section à modifier ci-dessous.',
                '',
                `**Ligues suivies** : ${leaguesText}`,
                `**Fuseau horaire** : \`${tzText}\``,
                `**Salon des votes quotidiens** : ${channelText}`,
            ].join('\n')
        )
        .setFooter({text: 'Toutes les actions sont éphémères.'});
}

function buildMainRows() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${CMD}:view:leagues`).setLabel('Ligues').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`${CMD}:view:tz`).setLabel('Fuseau horaire').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`${CMD}:view:channel`).setLabel('Salon des votes').setStyle(ButtonStyle.Secondary),
    );
    return [row];
}

async function buildLeaguesPage({ gs, page = 0, mode = 'all', query = null, ctx }) {
    let items = [];
    if (mode === 'all') {
        items = await leaguesRepo.listPaged(page * PAGE_SIZE, PAGE_SIZE);
    } else {

        const key = searchCacheKey(gs.guild_id ?? 'g', 'u');
        const cached = ctx?.cache ? await ctx.cache.get(key) : null;
        const ids = cached?.ids ?? [];
        const start = page * PAGE_SIZE;
        const batch = ids.slice(start, start + PAGE_SIZE);
        items = await leaguesRepo.byIds(batch);
        items = [...items ,...await leaguesRepo.searchByName(query)];
    }

    let lines = [];
    if(items.length === 0) {
        lines = ["**_Aucun résultat_**"]
    }
    else{
        lines = items.map((l, i) => {
            const followed = (gs.leagues || []).includes(l.id);
            const idx = i + 1; // 1..10
            const label = clamp(l.name || l.slug || String(l.id), 60);
            const prefix = numEmoji(idx);
            const suffix = followed ? '✅' : '';
            return `${prefix} **${label}** ${suffix}`;
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(mode === 'all' ? 'Ligues — Liste' : `Ligues — Résultats de recherche${query ? `: “${clamp(query, 30)}”` : ''}`)
        .setDescription(lines.length ? lines.join('\n') : '_Aucun résultat_');

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    items.forEach((l, i) => {
        const idx = i + 1;
        const followed = (gs.leagues || []).includes(l.id);
        const btn = new ButtonBuilder()
            .setCustomId(`${CMD}:leagues:toggle:${l.id}:${mode}:${page}`) // toggle <leagueId>
            .setLabel(String(idx))
            .setStyle(followed ? ButtonStyle.Success : ButtonStyle.Secondary);
        (idx <= 5 ? row1 : row2).addComponents(btn);
    });

    while (row1.components.length < Math.min(5, items.length)) {
        row1.addComponents(new ButtonBuilder().setCustomId(`${CMD}:noop`).setLabel('·').setStyle(ButtonStyle.Secondary).setDisabled(true));
    }

    while (items.length > 5 && row2.components.length < Math.min(5, items.length - 5)) {
        row2.addComponents(new ButtonBuilder().setCustomId(`${CMD}:noop2`).setLabel('·').setStyle(ButtonStyle.Secondary).setDisabled(true));
    }

    const prev = new ButtonBuilder().setCustomId(`${CMD}:leagues:prev:${mode}:${page}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0);
    const next = new ButtonBuilder().setCustomId(`${CMD}:leagues:next:${mode}:${page}`).setLabel('➡️').setStyle(ButtonStyle.Secondary)
        .setDisabled(items.length < PAGE_SIZE && mode === 'all');

    const clear =
        mode === "all"
            ? new ButtonBuilder().setCustomId(`${CMD}:leagues:clear`).setLabel('Tout vider').setStyle(ButtonStyle.Danger)
            : new ButtonBuilder().setCustomId(`${CMD}:leagues:clearSearch`).setLabel('Quitter').setStyle(ButtonStyle.Danger);
    const search = new ButtonBuilder().setCustomId(`${CMD}:leagues:search`).setLabel('🔎 Rechercher').setStyle(ButtonStyle.Primary);
    const back = new ButtonBuilder().setCustomId(`${CMD}:back`).setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary);

    const rowNav = new ActionRowBuilder().addComponents(prev, next, search, clear, back);
    return { embed, rows: [(items.length > 0 ? row1 : null), (items.length > 5 ? row2 : null), rowNav].filter(Boolean) };
}

function buildTimezoneRows() {
    const rowPreset = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`${CMD}:set:tz_preset`)
            .setPlaceholder('Choisir un fuseau courant…')
            .addOptions(
                { label: 'Europe/Paris', value: 'Europe/Paris' },
                { label: 'UTC', value: 'UTC' },
                { label: 'Europe/Berlin', value: 'Europe/Berlin' },
                { label: 'America/New_York', value: 'America/New_York' },
                { label: 'Asia/Seoul', value: 'Asia/Seoul' },
            ),
    );
    const rowFree = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${CMD}:modal:tz`).setLabel('Saisir un fuseau IANA').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`${CMD}:back`).setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary),
    );
    return [rowPreset, rowFree];
}

function buildChannelRows() {
    const rowChan = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(`${CMD}:set:channel`)
            .addChannelTypes(ChannelType.GuildText)
            .setPlaceholder('Choisis le salon pour les votes quotidiens'),
    );
    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${CMD}:back`).setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary),
    );
    return [rowChan, rowBack];
}

function buildLeaguesSearchModal() {
    return new ModalBuilder()
        .setCustomId('setup:modal:leagues_search:submit')
        .setTitle('Rechercher une ligue')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('q')
                    .setLabel('Nom de la ligue')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );
}

function buildTzModal() {
    const modal = new ModalBuilder()
        .setCustomId(`${CMD}:modal:tz:submit`)
        .setTitle('Fuseau horaire (IANA)');
    const input = new TextInputBuilder()
        .setCustomId('tz_value')
        .setLabel('Ex: Europe/Paris, UTC, America/New_York')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    return modal.addComponents(new ActionRowBuilder().addComponents(input));
}

function ensureAdmin(interaction) {
    const perms = interaction.memberPermissions;
    const ok = perms?.has('ManageGuild') || perms?.has('Administrator');
    return !!ok;
}

export default class SetupCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName(CMD)
            .setDescription('Configurer le bot via un panneau interactif')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
            .setDMPermission(false);
        this.name = this.data.name;
    }

    async execute(interaction, ctx) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({ content: '⛔ Cette commande est réservée aux admins.', ephemeral: true });
        }

        await ensureGuildSettings(interaction.guildId, { timezone: 'Europe/Paris', leagues: [] });
        const gs = await getGuildSettings(interaction.guildId);

        const embed = await buildMainEmbed(gs);
        const rows = buildMainRows();

        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }

    async onComponent(interaction, ctx) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({ content: '⛔ Réservé aux admins.', ephemeral: true });
        }

        if (!interaction.customId?.startsWith(`${CMD}:`)) return;

        const [_, kind, sub, ...rest] = interaction.customId.split(':');
        const guildId = interaction.guildId;

        if (kind === 'back') {
            const gs = await getGuildSettings(guildId);
            await interaction.update({ embeds: [await buildMainEmbed(gs)], components: buildMainRows() });
            return;
        }

        if (kind === 'view') {
            await interaction.deferUpdate();
            if (sub === 'leagues') {
                const gs = await getGuildSettings(interaction.guildId);
                const { embed, rows } = await buildLeaguesPage({ gs: { ...gs, guild_id: interaction.guildId }, page: 0, mode: 'all', ctx });
                return interaction.editReply({ embeds: [embed], components: rows });
            }
            if (sub === 'tz') {
                const gs = await getGuildSettings(guildId);
                const embed = await buildMainEmbed(gs);
                await interaction.editReply({ embeds: [embed], components: buildTimezoneRows() });
                return;
            }
            if (sub === 'channel') {
                const gs = await getGuildSettings(guildId);
                const embed = await buildMainEmbed(gs);
                await interaction.editReply({ embeds: [embed], components: buildChannelRows() });
                return;
            }
        }

        // if (kind === 'set' && sub === 'leagues' && interaction.isStringSelectMenu()) {
        //     const offset = Number(rest[0]) || 0;
        //     const selected = interaction.values.map(v => Number(v)).filter(Number.isFinite);
        //     await setGuildLeagues(guildId, selected);
        //     const gs = await getGuildSettings(guildId);
        //     await interaction.update({ embeds: [await buildMainEmbed(gs)], components: await buildLeaguesSearchRows(gs, offset) });
        //     return;
        // }
        //
        // if (kind === 'set' && sub === 'leagues_search' && interaction.isStringSelectMenu()) {
        //     const guildId = interaction.guildId;
        //     const selected = interaction.values.map(v => Number(v)).filter(Number.isFinite);
        //     await setGuildLeagues(guildId, selected);            // remplace par la sélection
        //     const gs = await getGuildSettings(guildId);
        //     const embed = await buildMainEmbed(gs);
        //     return interaction.editReply({ embeds: [embed], components: await buildLeaguesSearchRows(gs, 0) });
        // }

        if (kind === 'set' && sub === 'tz_preset' && interaction.isStringSelectMenu()) {
            const tz = interaction.values[0];
            await setGuildTimezone(guildId, tz);
            const gs = await getGuildSettings(guildId);
            await interaction.update({ embeds: [await buildMainEmbed(gs)], components: buildTimezoneRows() });
            return;
        }

        if (kind === 'set' && sub === 'channel' && interaction.isChannelSelectMenu()) {
            await interaction.deferUpdate();

            const guildId = interaction.guildId;
            const channelId = interaction.values?.[0];

            try {
                const guild = await interaction.client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(channelId);
                const me = guild.members.me;
                const perms = channel?.permissionsFor(me);
                if (!channel?.isTextBased() || !perms?.has(['ViewChannel','SendMessages'])) {
                    await interaction.followUp({
                        content: "⛔ Je ne peux pas écrire dans ce salon (ou ce n’est pas un salon texte).",
                        ephemeral: true
                    });
                    return;
                }
            } catch (_) {
                await interaction.followUp({ content: "❌ Salon invalide ou introuvable.", ephemeral: true });
                return;
            }

            await setGuildVoteChannel(guildId, channelId);
            const gs = await getGuildSettings(guildId);

            try {
                await postTodayVotesForGuild(ctx.bot, {
                    guild_id: guildId,
                    vote_channel_id: gs.vote_channel_id,
                    timezone: gs.timezone,
                    leagues: gs.leagues,
                });
                scheduleDailyVotesForGuild(ctx.bot, {
                    guild_id: guildId,
                    vote_channel_id: gs.vote_channel_id,
                    timezone: gs.timezone,
                    leagues: gs.leagues,
                });
                await interaction.followUp({ content: `✅ Salon enregistré : <#${gs.vote_channel_id}> — votes du jour publiés et cron installé.`, ephemeral: true });
            } catch (e) {
                console.error('setup channel immediate post/cron error:', e);
                await interaction.followUp({ content: "⚠️ Salon enregistré, mais échec publication/cron (voir logs).", ephemeral: true });
            }

            await interaction.editReply({
                embeds: [await buildMainEmbed(gs)],
                components: buildChannelRows()
            });
            return;
        }

        if (kind === 'modal' && sub === 'tz') {
            return interaction.showModal(buildTzModal());
        }

        if(kind === "leagues"){
            if(sub === 'prev' || sub === 'next'){
                await interaction.deferUpdate();
                const mode = rest[0];
                const curPage = Number(rest[1]) || 0;
                const nextPage = sub === 'next' ? curPage + 1 : Math.max(0, curPage - 1);

                const gs = await getGuildSettings(interaction.guildId);
                const key = searchCacheKey(interaction.guildId, interaction.user.id);
                const cached = ctx.cache ? await ctx.cache.get(key) : null;
                const query = cached?.query || null;

                const { embed, rows } = await buildLeaguesPage({ gs: { ...gs, guild_id: interaction.guildId }, page: nextPage, mode, query, ctx });
                return interaction.editReply({ embeds: [embed], components: rows });
            }

            if (sub === 'clear') {
                await interaction.deferUpdate();
                await setGuildLeagues(interaction.guildId, []);
                const gs = await getGuildSettings(interaction.guildId);
                const { embed, rows } = await buildLeaguesPage({ gs: { ...gs, guild_id: interaction.guildId }, page: 0, mode: 'all', ctx });
                return interaction.editReply({ embeds: [embed], components: rows });
            }

            if (sub === 'clearSearch') {
                await interaction.deferUpdate();
                const gs = await getGuildSettings(interaction.guildId);
                const { embed, rows } = await buildLeaguesPage({ gs: { ...gs, guild_id: interaction.guildId }, page: 0, mode: 'all', ctx });
                return interaction.editReply({ embeds: [embed], components: rows });
            }

            if (sub === 'search') {
                return interaction.showModal(buildLeaguesSearchModal());
            }

            if(sub === "toggle"){
                await interaction.deferUpdate();
                const leagueId = rest[0];
                const mode = rest[1];
                const page = Number(rest[2]) || 0;

                const gs = await getGuildSettings(interaction.guildId);
                const followed = new Set(gs.leagues || []);
                if (followed.has(leagueId)) followed.delete(leagueId);
                else followed.add(leagueId);
                await setGuildLeagues(interaction.guildId, Array.from(followed));

                const key = searchCacheKey(interaction.guildId, interaction.user.id);
                const cached = ctx.cache ? await ctx.cache.get(key) : null;
                const query = cached?.query || null;

                const gs2 = await getGuildSettings(interaction.guildId);
                const { embed, rows } = await buildLeaguesPage({ gs: { ...gs2, guild_id: interaction.guildId }, page, mode, query, ctx });
                return interaction.editReply({ embeds: [embed], components: rows });
            }
        }
    }

    async onModalSubmit(interaction, ctx) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({ content: '⛔ Réservé aux admins.', ephemeral: true });
        }

        if (!interaction.customId?.startsWith(`${CMD}:modal:`)) return;

        await interaction.deferUpdate();

        const [_, __, type, __submit] = interaction.customId.split(':');
        const guildId = interaction.guildId;

        if (type === 'tz') {
            const tz = interaction.fields.getTextInputValue('tz_value')?.trim();
            if (!tz) return interaction.reply({ content: '❌ Fuseau invalide.', ephemeral: true });
            await setGuildTimezone(guildId, tz);
            const gs = await getGuildSettings(guildId);
            await interaction.editReply({ embeds: [await buildMainEmbed(gs)], components: buildTimezoneRows(), ephemeral: true });
            return;
        }

        if (type === 'leagues_search') {
            const q = (interaction.fields.getTextInputValue('q') || '').trim();
            if (!q) return interaction.reply({ content: '❌ Requête vide.', ephemeral: true });

            const results = await leaguesRepo.searchByName(q, 200);
            const ids = results.map(r => r.id);
            if (ctx.cache) await ctx.cache.set(searchCacheKey(interaction.guildId, interaction.user.id), { query: q, ids }, 120_000);

            const gs = await getGuildSettings(interaction.guildId);
            const { embed, rows } = await buildLeaguesPage({
                gs: { ...gs, guild_id: interaction.guildId },
                page: 0,
                mode: 'search',
                query: q,
                ctx
            });
            await interaction.editReply({ embeds: [embed], components: rows, ephemeral: true });
            return;
        }
    }
}
