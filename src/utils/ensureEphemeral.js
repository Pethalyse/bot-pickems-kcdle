export async function ensureEphemeral(interaction) {
    if (interaction.deferred || interaction.replied) return;
    return interaction.deferReply({ ephemeral: true });
}

export async function disassureEphemeral(interaction) {
    if (interaction.deferred || interaction.replied) return;
    return interaction.deferReply({ ephemeral: false });
}