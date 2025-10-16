import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { getGuildSettings } from '../../../db/guildSettings.js';
import { matchesRepo } from '../../../db/matchesRepo.js';
import {Command} from "../Command.js";

function fmtLine(m) {
    const ts = m.scheduled_at ? `<t:${Math.floor(new Date(m.scheduled_at).getTime()/1000)}:t>` : '';
    const vs = `${m.team1_acronym ?? m.team1_name} vs ${m.team2_acronym ?? m.team2_name}`;
    return `• ${ts} — ${m.league_slug} — ${vs} (id:${m.id})`;
}

export default class AnnounceJ1Command extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('announce_j1')
            .setDescription('[ADMIN] Annoncer les matchs des prochaines 24h dans un salon')
            .addChannelOption(o =>
                o.setName('channel')
                    .setDescription('Salon cible')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true));
        this.name = this.data.name;
    }


    async execute(interaction/*, ctx */) {
        if (!interaction.memberPermissions.has('ManageGuild')) {
            return interaction.reply({ content: '⛔ Tu dois avoir "Gérer le serveur".', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel', true);
        const gs = await getGuildSettings(interaction.guildId);
        if (!gs?.leagues?.length) {
            return interaction.reply({ content: "⚙️ Configure d’abord `/setup leagues`.", ephemeral: true });
        }

        const now = new Date();
        const end = new Date(now.getTime() + 24*60*60*1000);
        const matches = await matchesRepo.upcomingWindow(gs.leagues, now.toISOString(), end.toISOString(), 100);

        if (!matches.length) {
            return interaction.reply({ content: '📭 Aucun match dans les prochaines 24h.', ephemeral: true });
        }

        const header = `🗓️ Matchs à venir (prochaines 24h) — ${matches.length} match(s)`;
        const body = matches.map(fmtLine).join('\n');
        await channel.send({ content: `${header}\n${body}` });

        return interaction.reply({ content: `✅ Annonce postée dans ${channel}`, ephemeral: true });
    }
}
