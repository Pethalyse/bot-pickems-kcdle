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

async function buildLeaguesRows(gs, offset = 0) {
    const pageSize = 25;
    const all = await leaguesRepo.listPaged(offset, pageSize);
    const options = all.map(l => ({
        label: l.name || l.slug || String(l.id),
        value: String(l.id),
        description: l.slug ? `slug: ${l.slug}` : undefined
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId(`setup:set:leagues:${offset}`)
        .setPlaceholder('Sélectionne les ligues à suivre (multi)')
        .setMinValues(0)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options);

    const rowSelect = new ActionRowBuilder().addComponents(select);
    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`setup:leagues:prev:${offset}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(offset<=0),
        new ButtonBuilder().setCustomId(`setup:leagues:next:${offset}`).setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(options.length < pageSize),
        new ButtonBuilder().setCustomId(`setup:leagues:clear`).setLabel('Tout vider').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`setup:back`).setLabel('↩️ Retour').setStyle(ButtonStyle.Secondary),
    );

    return [rowSelect, rowNav];
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

function buildLeaguesModal() {
    const modal = new ModalBuilder()
        .setCustomId(`${CMD}:modal:leagues:submit`)
        .setTitle('IDs de ligues (séparés par des virgules)');
    const input = new TextInputBuilder()
        .setCustomId('leagues_ids')
        .setLabel('Ex: 297, 4192, 4321')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    return modal.addComponents(new ActionRowBuilder().addComponents(input));
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

function parseLeagueIdsFromStrings(values) {
    return values
        .map(v => String(v).trim())
        .filter(Boolean)
        .map(v => Number(v))
        .filter(n => Number.isFinite(n) && n > 0);
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

        const [_, kind, sub] = interaction.customId.split(':');
        const guildId = interaction.guildId;

        if (kind === 'back') {
            const gs = await getGuildSettings(guildId);
            await interaction.update({ embeds: [await buildMainEmbed(gs)], components: buildMainRows() });
            return;
        }

        if (kind === 'view') {
            await interaction.deferUpdate();
            if (sub === 'leagues') {
                const gs = await getGuildSettings(guildId);
                const embed = await buildMainEmbed(gs);
                await interaction.editReply({ embeds: [embed], components: await buildLeaguesRows(gs) });
                return;
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

        if (kind === 'set' && sub === 'leagues' && interaction.isStringSelectMenu()) {
            const offset = Number(rest[0]) || 0;
            const selected = interaction.values.map(v => Number(v)).filter(Number.isFinite);
            await setGuildLeagues(guildId, selected);
            const gs = await getGuildSettings(guildId);
            await interaction.update({ embeds: [await buildMainEmbed(gs)], components: await buildLeaguesRows(gs, offset) });
            return;
        }

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

        if (kind === 'modal' && sub === 'leagues') {
            return interaction.showModal(buildLeaguesModal());
        }
        if (kind === 'modal' && sub === 'tz') {
            return interaction.showModal(buildTzModal());
        }

        if(kind === "leagues"){
            if(sub === 'prev' || sub === 'next'){
                await interaction.deferUpdate();

                const prev = Number(rest[0]) || 0;
                const pageSize = 25;

                const next = sub === 'next' ? prev + pageSize : Math.max(0, prev - pageSize);

                const gs = await getGuildSettings(guildId);
                return interaction.editReply({ components: await buildLeaguesRows(gs, next) });

            }

            if (sub === 'clear') {
                await setGuildLeagues(guildId, []);

                const gs = await getGuildSettings(guildId);
                return interaction.update({ embeds: [await buildMainEmbed(gs)], components: await buildLeaguesRows(gs, 0) });
            }

        }
    }

    async onModalSubmit(interaction, ctx) {
        if (!ensureAdmin(interaction)) {
            return interaction.reply({ content: '⛔ Réservé aux admins.', ephemeral: true });
        }

        if (!interaction.customId?.startsWith(`${CMD}:modal:`)) return;

        const [_, __, type, __submit] = interaction.customId.split(':');
        const guildId = interaction.guildId;

        if (type === 'leagues') {
            const raw = interaction.fields.getTextInputValue('leagues_ids') || '';
            const ids = parseLeagueIdsFromStrings(raw.split(','));
            await setGuildLeagues(guildId, ids);
            const gs = await getGuildSettings(guildId);
            await interaction.reply({ embeds: [await buildMainEmbed(gs)], components: buildLeaguesRow(gs), ephemeral: true });
            return;
        }

        if (type === 'tz') {
            const tz = interaction.fields.getTextInputValue('tz_value')?.trim();
            if (!tz) return interaction.reply({ content: '❌ Fuseau invalide.', ephemeral: true });
            await setGuildTimezone(guildId, tz);
            const gs = await getGuildSettings(guildId);
            await interaction.reply({ embeds: [await buildMainEmbed(gs)], components: buildTimezoneRows(), ephemeral: true });
            return;
        }
    }
}
