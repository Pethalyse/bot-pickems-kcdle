import { SlashCommandBuilder } from 'discord.js';
import { getGuildSettings } from '../db/guildSettings.js';
import { matchesRepo } from '../db/matchesRepo.js';
import { voteService } from '../services/voteService.js';
import { matchEmbed } from '../ui/embeds.js';
import { voteButtons } from '../ui/voteComponents.js';
import {Command} from "../core/Command.js";

export default class VoteCommand extends Command {
    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName('vote')
            .setDescription('Voter pour un match')
            .addIntegerOption(o =>
                o.setName('match_id')
                    .setDescription('ID du match (autocomplete)')
                    .setRequired(true)
                    .setAutocomplete(true));
        this.name = this.data.name;
    }

    async execute(interaction/*, ctx */) {
        const matchId = interaction.options.getInteger('match_id', true);
        const match = await matchesRepo.byId(matchId);
        if (!match) return interaction.reply({ content: '❌ Match introuvable.', ephemeral: true });

        const embed = matchEmbed(match);
        const votes = voteButtons(match);
        return interaction.reply({ embeds: [embed], components: [votes], ephemeral: true });
    }

    // Autocomplete: tape "lec", "vks", "1234", etc.
    async onAutocomplete(interaction/*, ctx */) {
        const gs = await getGuildSettings(interaction.guildId);
        if (!gs?.leagues?.length) return interaction.respond([]);

        const q = interaction.options.getFocused(true).value?.trim() || '';
        const list = q
            ? await matchesRepo.searchUpcoming(gs.leagues, q, 25)
            : await matchesRepo.upcomingByLeagues(gs.leagues, 25);

        const choices = list.map(m => ({
            name: `${m.league_slug} • ${m.team1_acronym ?? m.team1_name} vs ${m.team2_acronym ?? m.team2_name} • ${m.id}`,
            value: m.id
        })).slice(0, 25);

        return interaction.respond(choices);
    }

    async onComponent(interaction, ctx) {
        // customId: "vote:<matchId>:<teamId>"
        const [prefix, matchIdStr, teamIdStr] = interaction.customId.split(':');
        if (prefix !== 'vote') return;

        const matchId = Number(matchIdStr);
        const teamId = Number(teamIdStr);

        const res = await voteService.cast({
            guildId: interaction.guildId,
            user: interaction.user,
            matchId,
            teamId
        });

        if (!res.ok) {
            const reasons = {
                MATCH_NOT_FOUND: "❌ Match introuvable.",
                MATCH_ALREADY_STARTED: "⛔ Le match a déjà démarré.",
                AFTER_DEADLINE: "⛔ Les votes sont fermés pour ce match.",
                INVALID_TEAM: "❌ Équipe invalide."
            };
            return interaction.reply({ content: reasons[res.reason] || "❌ Vote impossible.", ephemeral: true });
        }

        const name = (teamId === parseInt(res.match.team1_id))
            ? (res.match.team1_acronym ?? res.match.team1_name)
            : (res.match.team2_acronym ?? res.match.team2_name);

        let msg = res.changed
            ? `📝 **Vote modifié** → ${name}`
            : (res.previousChoice ? `✅ **Vote inchangé** → ${name}` : `🗳️ **Vote enregistré** → ${name}`);

        return interaction.reply({ content: msg, ephemeral: true });
    }
}
