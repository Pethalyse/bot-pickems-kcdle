import { SlashCommandBuilder } from 'discord.js';
import { getGuildSettings } from '../db/guildSettings.js';
import { matchesRepo } from '../db/matchesRepo.js';
import { matchEmbed } from '../ui/embeds.js';
import { voteButtons } from '../ui/voteComponents.js';
import { buildPageRow } from '../ui/paginator.js';
import { predictionsRepo } from '../db/predictionsRepo.js';
import {Command} from "../core/Command.js";


export default class MatchsCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('matchs')
            .setDescription('Prochains matchs (avec boutons de vote)');
        this.name = this.data.name;
    }

    async execute(interaction, ctx) {
        const gs = await getGuildSettings(interaction.guildId);
        if (!gs?.leagues?.length) {
            return interaction.reply({ content: "⚙️ Configure d’abord `/setup leagues`.", ephemeral: true });
        }

        const matches = await matchesRepo.upcomingByLeagues(gs.leagues, 50);
        if (!matches.length) return interaction.reply({ content: "📭 Aucun match à venir.", ephemeral: true });

        const page = 0;
        const m0 = matches[page];

        const key = `${interaction.guildId}:${interaction.channelId}:matchs`;
        ctx.cache.set(key, { ids: matches.map(m => m.id) }, 60_000);


        const currentPick = await predictionsRepo.findUserChoice(interaction.guildId, m0.id, interaction.user.id);
        const embed = matchEmbed(m0);
        if (currentPick) {
            const label = currentPick === m0.team1_id
                ? (m0.team1_acronym ?? m0.team1_name)
                : (m0.team2_acronym ?? m0.team2_name);
            embed.setFooter({ text: `Ton pick : ${label}` });
        }
        const votes = voteButtons(m0);
        const pager = buildPageRow('matchs', page, matches.length);

        await interaction.reply({ embeds: [embed], components: [votes, pager] });
    }

    async onComponent(interaction, ctx) {
        // customId: "matchs:prev:2" | "matchs:next:2"
        const [prefix, action, pageStr] = interaction.customId.split(':');
        if (prefix !== 'matchs') return;
        const key = `${interaction.guildId}:${interaction.channelId}:matchs`;

        await interaction.deferUpdate();

        let state = await ctx.cache.get(key);
        if (!state) {
            const gs = await getGuildSettings(interaction.guildId);
            const fresh = await (gs?.leagues?.length ? matchesRepo.upcomingByLeagues(gs.leagues, 50) : []);
            state = { ids: fresh.map(m => m.id) };
            ctx.cache.set(key, state, 60_000);
        }

        const cur = Number(pageStr) || 0;
        const next = action === 'next' ? cur + 1 : cur - 1;
        const matchId = state.ids[next];
        if (!matchId) return;

        const match = await matchesRepo.byId(matchId);
        const embed = matchEmbed(match);
        const votes = voteButtons(match);
        const pager = buildPageRow('matchs', next, state.ids.length);

        await interaction.editReply({ embeds: [embed], components: [votes, pager] });
    }
}
