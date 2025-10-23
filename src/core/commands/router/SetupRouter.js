import {Router} from "./Router.js";
import {ensureEphemeral} from "../../../utils/ensureEphemeral.js";
import {CustomId} from "../../../utils/CustomId.js";

export default class SetupRouter extends Router {
    /**
     * @param {SetupUI} setupUI
     * @param {LeaguesUI} leaguesUI
     * @param {HoraireUI} horaireUI
     * @param {ChannelVoteUI} channelVoteUI
     * @param {VoteUI} voteUI
     * @param {GuildSettingsService} guildSettingsService
     * @param {LeagueService} leagueService
     * @param {ICache} cache
     * @param {NewMatchVote} dailyVotes
     */
    constructor(setupUI, leaguesUI, horaireUI, channelVoteUI, voteUI, guildSettingsService, leagueService, cache, dailyVotes) {
        super(cache);
        this.setupUI = setupUI;
        this.leaguesUI = leaguesUI;
        this.horaireUI = horaireUI;
        this.channelVoteUI = channelVoteUI;
        this.voteUI = voteUI;
        this.guildSettingsService = guildSettingsService;
        this.leagueService = leagueService;
        this.cache = cache;
        this.dailyVotes = dailyVotes;
    }

    async handleSlash(interaction) {
        await ensureEphemeral(interaction);
        const gs = await this.guildSettingsService.get(interaction.guildId);
        await interaction.editReply(this.setupUI.build(gs));
    }

    async handleButton(interaction) {
        if (!CustomId.match(interaction.customId, 'setup')) return;
        const action = CustomId.parse(interaction.customId);

        switch (action.action) {
            case 'back':
                return this.handleSlash(interaction);

            case 'leagues:open':
                return this.#openLeagues(interaction, { mode: 'all', page: 0 });
            // case 'leagues:search':
            //     return interaction.showModal(this.leaguesUI.openSearch());
            case 'leagues:toggle':
                return this.#toggleLeague(interaction, action.params.leagueId, action.params.page, action.params.mode);
            case 'leagues:page':
                return this.#openLeagues(interaction, { mode: action.params.mode, page: action.params.page, query: action.params.query });

            // case 'tz:open':
            //     return this.horaireUI.build(interaction);
            // case 'tz:save':
            //     return this.#saveTimezone(interaction, action.params.tz);

            case 'votechannel:open':
                return interaction.editReply(this.channelVoteUI.build(interaction));
            case 'votechannel:save':
                return this.#saveVoteChannel(interaction, action.params.channelId);

            // case 'votes:postToday': {
            //     return this.#postToday(interaction);
            // }
            // case 'votes:scheduleDaily':
            //     return this.#scheduleDaily(interaction);

            default:
                return this.UI.unknown(interaction);
        }
    }

    // async handleStringSelect(interaction) {
    //     if (!CustomId.match(interaction.customId, 'setup')) return;
    //     const id = CustomId.parse(interaction.customId);
    //     await ensureEphemeral(interaction);
    //
    //     if (id.action === 'tz:pick') {
    //         const tz = interaction.values?.[0];
    //         return this.horaireUI.confirmTimezone(interaction, tz);
    //     }
    // }

    async handleChannelSelect(interaction) {
        if (!CustomId.match(interaction.customId, 'setup')) return;
        const id = CustomId.parse(interaction.customId);
        await ensureEphemeral(interaction);

        if (id.action === 'votechannel:pick') {
            const channelId = interaction.values?.[0];
            await interaction.editReply(this.channelVoteUI.confirmVoteChannel(interaction, channelId));
        }
    }

    async handleModal(interaction) {
        if (!CustomId.match(interaction.customId, 'setup')) return;
        const id = CustomId.parse(interaction.customId);

        if (id.action === 'leagues:search:modal') {
            const q = interaction.fields.getTextInputValue('q');
            this.cache.set(this.#searchKey(interaction), q);
            return this.#openLeagues(interaction, { mode: 'search', page: 0, query: q });
        }
    }

    async #openLeagues(interaction, { mode, page, query }) {
        const guildId = interaction.guildId;
        const q = query ?? this.cache.get(this.#searchKey(interaction)) ?? '';
        const gs = await this.guildSettingsService.get(guildId);

        const pageData = await this.leagueService.page({
            guildId,
            followed: gs.leagues ?? [],
            page,
            pageSize: 10,
            mode,
            query: q,
        });

        await interaction.editReply(this.leaguesUI.build(pageData, mode, page, q));
    }

    async #toggleLeague(interaction, leagueId, page, mode) {
        const gs = await this.guildSettingsService.get(interaction.guildId);

        const leagues = gs.leagues.includes(leagueId)
            ? gs.leagues.filter((l) => { return l !== leagueId;})
            : gs.leagues.concat(leagueId);
        await this.guildSettingsService.setGuildLeagues(interaction.guildId, leagues);
        return this.#openLeagues(interaction, { mode, page: Number(page), query: this.cache.get(this.#searchKey(interaction)) });
    }

    async #saveTimezone(interaction, tz) {
        await this.guildSettingsService.setTimezone(interaction.guildId, tz);
        await interaction.editReply(this.horaireUI.build(interaction));
    }

    async #saveVoteChannel(interaction, channelId) {
        await this.guildSettingsService.setVoteChannel(interaction.guildId, channelId);
        const gs = await this.guildSettingsService.get(interaction.guildId);
        this.handleSlash(interaction);
    }

    async #postToday(interaction) {
        const res = this.dailyVotes.postNewMatchForGuid(interaction.guildId);
        await interaction.reply(
            this.UI.toast(interaction,
                res ? '✅ Votes du jour postés.' : `❌ Échec du poste.`));
    }

    async #scheduleDaily(interaction) {
        const res = this.dailyVotes.scheduleNewMatchForGuild(interaction.guildId);
        await interaction.reply(
            this.UI.toast(interaction,
                res ? '✅ Programmation quotidienne activée.' : `❌ Échec de la programmation.`));
    }

    #searchKey(interaction) { return `setup:leagues:search:${interaction.guildId}:${interaction.user.id}`; }
}