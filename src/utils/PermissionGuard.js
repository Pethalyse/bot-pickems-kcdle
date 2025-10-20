import { PermissionFlagsBits } from 'discord.js';


const FLAG_MAP = {
    ViewChannel: PermissionFlagsBits.ViewChannel,
    SendMessages: PermissionFlagsBits.SendMessages,
    EmbedLinks: PermissionFlagsBits.EmbedLinks,
    UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
};

export class PermissionGuard {
    /**
     * Return the first missing permission name or null if ok.
     * @param {import('discord.js').TextChannel} channel
     * @param {Array<keyof typeof FLAG_MAP>} required
     */
    firstError(channel, required) {
        const me = channel?.guild?.members?.me;
        if (!me) return 'Bot non résolu dans ce serveur';
        const perms = channel.permissionsFor(me);
        if (!perms) return 'permissions introuvables';
        for (const name of required) {
            const flag = FLAG_MAP[name];
            if (!perms.has(flag)) return name;
        }
        return null;
    }
}