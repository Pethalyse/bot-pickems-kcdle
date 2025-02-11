require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const {createCanvas, loadImage } = require('canvas')
const fs = require('fs')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const API_URL = process.env.API_URL;

// Fonction pour récupérer les matchs à venir pour LFL et LEC
async function getUpcomingMatches() {
    try {
        const lecResponse = await axios.get(`${API_URL}/get/matchs/lec-winter-playoff-2025`);
        const lflResponse = await axios.get(`${API_URL}/get/matchs/lfl-winter-playoff-2025`);
        return [...lecResponse.data, ...lflResponse.data];
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des matchs :", error);
        return [];
    }
}

// // Fonction pour fusionner deux images avec "VS" au centre
// async function createMatchImage(team1Img, team2Img, matchId) {
//     try {
//         const canvas = createCanvas(600, 300); // Taille de l'image
//         const ctx = canvas.getContext('2d');
//
//         // Charger les images
//         const img1 = await loadImage(team1Img);
//         const img2 = await loadImage(team2Img);
//
//         // Dessiner les images côte à côte
//         ctx.drawImage(img1, 50, 50, 200, 200);
//         ctx.drawImage(img2, 350, 50, 200, 200);
//
//         // Ajouter "VS" au centre
//         ctx.font = 'bold 50px Arial';
//         ctx.fillStyle = 'white';
//         ctx.textAlign = 'center';
//         ctx.fillText('VS', 300, 150);
//
//         // Sauvegarder l'image
//         const outputPath = `./match_${matchId}.png`;
//         const buffer = canvas.toBuffer('image/png');
//         fs.writeFileSync(outputPath, buffer);
//
//         return outputPath;
//     } catch (error) {
//         console.error("❌ Erreur lors de la création de l'image :", error);
//         return null;
//     }
// }
//
// // Fonction pour envoyer un rappel 24h avant les matchs
// async function sendMatchReminder() {
//     const channel = await client.channels.fetch(CHANNEL_ID);
//     if (!channel) return console.error("❌ Salon introuvable.");
//
//     const matches = await getUpcomingMatches();
//     if (matches.length === 0) return;
//
//     const today = new Date();
//     today.setDate(today.getDate() + 1);
//     const formattedDate = today.toISOString().split('T')[0];
//
//     for (const match of matches) {
//         if (match.match_date === formattedDate) {
//             // Générer une image fusionnée
//             const imagePath = await createMatchImage(match.equipe1.image, match.equipe2.image, match.id);
//
//             if (!imagePath) {
//                 console.error("❌ Impossible de générer l'image.");
//                 continue;
//             }
//
//             // Créer l'embed avec l'image fusionnée
//             const embed = new EmbedBuilder()
//                 .setTitle(`📢 Match à venir : **${match.equipe1.name}** 🆚 **${match.equipe2.name}**`)
//                 .setDescription(`🕐 **Date** : ${match.match_date}\n📝 Faites vos pickems maintenant !`)
//                 .setColor("Blue")
//                 .setImage(`attachment://match_${match.id}.png`);
//
//             const row = new ActionRowBuilder()
//                 .addComponents(
//                     new ButtonBuilder()
//                         .setLabel("Voter pour " + match.equipe1.name)
//                         .setStyle(ButtonStyle.Primary)
//                         .setCustomId(`vote_${match.id}_team1`),
//                     new ButtonBuilder()
//                         .setLabel("Voter pour " + match.equipe2.name)
//                         .setStyle(ButtonStyle.Primary)
//                         .setCustomId(`vote_${match.id}_team2`)
//                 );
//
//             await channel.send({
//                 embeds: [embed],
//                 files: [{ attachment: imagePath, name: `match_${match.id}.png` }],
//                 components: [row]
//             });
//
//             // Supprimer l'image après l'envoi
//             fs.unlinkSync(imagePath);
//         }
//     }
// }

async function createMatchVoteMessage(matches, everyone = false){
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Salon introuvable.");

    for (const match of matches) {
        const embed = new EmbedBuilder()
            .setTitle(`📢 Match à venir : **${match.equipe1.name}** 🆚 **${match.equipe2.name}**`)
            .setDescription(`🕐 **Date** : ${match.match_date}\n📝 Faites vos pickems maintenant !`)
            .setColor("Blue")
            .setThumbnail(match.equipe1.image) // Logo équipe 1 en petit

            // Utilisation des champs pour simuler un affichage côte à côte
            .addFields(
                { name: "🏆 **Équipe 1**", value: `**${match.equipe1.name}**`, inline: true },
                { name: "⚔️ **VS**", value: "⠀", inline: true }, // Espace pour aligner
                { name: "🏆 **Équipe 2**", value: `**${match.equipe2.name}**`, inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Voter pour " + match.equipe1.name)
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`vote_${match.id}_${match.equipe1.name}`),
                new ButtonBuilder()
                    .setLabel("Voter pour " + match.equipe2.name)
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`vote_${match.id}_${match.equipe2.name}`)
            );

        let content = "";
        if(everyone)
            content = "📢 Votez pour le match de demain ! || @everyone ||";

        await channel.send({content: content, embeds: [embed], components: [row] });
    }
}

async function sendMatchReminder(everyone = false) {
    const matches = await getUpcomingMatches();
    if (matches.length === 0) return;

    const today = new Date();
    today.setDate(today.getDate() + 1); // On cherche les matchs de demain
    const formattedDate = today.toISOString().split('T')[0];

    const matchesDate = []
    for (const match of matches) {
        if(match.match_date === formattedDate)
            matchesDate.push(match)
    }

    await createMatchVoteMessage(matchesDate, everyone);
}



// Gérer les votes des utilisateurs
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id; // ID Discord de l'utilisateur
    const matchId = interaction.customId.split('_')[1];
    const team = interaction.customId.split('_')[2];

    try {
        // Vérifier si le compte est lié
        const response = await axios.get(`${API_URL}/get/user/discord/${userId}`);
        const userData = response.data;

        if (!userData || !userData.id) {
            return interaction.reply({
                content: "❌ Tu dois d'abord associer ton compte ! Tape `/link` pour le faire.",
                ephemeral: true
            });
        }
        // Envoi du vote à l’API du site
        const rep = await axios.post(`${API_URL}/vote`, {
            user_id: userData.id,
            match_id: matchId,
            team: team
        }, {
            headers: { "Content-Type": "application/json" }
        });

        await interaction.reply({
            content: `✅ Ton vote pour **${team}** a été enregistré !`,
            ephemeral: true
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement du vote :", error);
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
    }
});

// Annonce des résultats après les matchs
async function announceResults(phase = "") {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Salon introuvable.");

    let matches = [];
    if(phase === "")
        matches = await getUpcomingMatches();
    else
        matches = [...((await axios.get(`${API_URL}/get/matchs/${phase}`)).data)];
    if (matches.length === 0) return

    for (const match of matches) {
        if (match.gagnant) {
            let img;
            if(match.equipe1.name === match.gagnant)
                img = match.equipe1.image
            else
                img = match.equipe2.image

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Résultat : ${match.equipe1.name} vs ${match.equipe2.name}`)
                .setDescription(`🎉 **Vainqueur** : ${match.gagnant}\n😢 **Perdant** : ${match.perdant}`)
                .setThumbnail(img)
                .setColor("Green");

            await channel.send({ embeds: [embed] });
        }
    }
}

// Planification des tâches automatiques
cron.schedule("0 8 * * *", () => sendMatchReminder(true), { timezone: "Europe/Paris" }); // Rappel à 8h
cron.schedule("0  * * *", () => sendMatchReminder(true), { timezone: "Europe/Paris" }); // Rappel à 8h

// Fonction pour récupérer les matchs de la semaine pour une ligue spécifique
async function getMatchesForWeek(league) {
    try {
        const response = await axios.get(`${API_URL}/get/matchs/${league}`);
        const allMatches = response.data;

        // Obtenir la date actuelle et la date de fin de semaine
        const today = new Date();
        const endOfWeek = new Date();
        endOfWeek.setDate(today.getDate() + (7 - today.getDay())); // Dimanche de la semaine en cours

        // Filtrer les matchs de cette semaine
        const weeklyMatches = allMatches.filter(match => {
            const matchDate = new Date(match.match_date);
            return matchDate >= today && matchDate <= endOfWeek && match.equipe1.name !== "TBD" && match.equipe2.name !== "TBD";
        });

        return weeklyMatches;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des matchs :", error);
        return [];
    }
}

// Gestion des commandes Slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'matchs') {
        const league = interaction.options.getString('phase');

        await interaction.deferReply(); // Attente de la réponse

        const matches = await getMatchesForWeek(league);
        if (matches.length === 0) {
            return interaction.editReply("❌ Aucun match prévu cette semaine pour cette ligue.");
        }
        await createMatchVoteMessage(matches);
        await interaction.editReply(`📢 Les matchs de la semaine pour la phase **${league}** ont été envoyés !`);
    }

    if (interaction.commandName === 'demain') {
        await interaction.deferReply(); // Indique que le bot traite la commande
        await sendMatchReminder();
        await interaction.editReply("📢 Les matchs de demain ont été envoyés !");
    }

    if (interaction.commandName === 'matchs-results') {
        await interaction.deferReply(); // Indique que le bot traite la commande
        await announceResults(interaction.options.getString('phase'));
        await interaction.editReply("📢 Les résultats ont été envoyés !");
    }
});

// Enregistrement de la commande `/matchs`
client.on('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

    const guild = client.guilds.cache.first(); // Prendre le premier serveur où le bot est présent
    if (!guild) return console.error("❌ Serveur introuvable.");

    // Enregistrement de la commande
    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('matchs')
            .setDescription("📅 Affiche les matchs de la semaine d'une phase")
            .addStringOption(option =>
                option.setName('phase')
                    .setDescription("Choisis la ligue (LEC ou LFL)")
                    .setRequired(true)
                    .addChoices(
                        { name: "LEC Winter Playoff", value: "lec-winter-playoff-2025" },
                        { name: "LFL Winter Playoff", value: "lfl-winter-playoff-2025" }
                    )
            )
    );
    console.log("✅ Commande `/matchs` enregistrée !");


    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('demain')
            .setDescription("📅 Affiche les matchs de demain")
    );
    console.log("✅ Commande `/demain` enregistrée !");


    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('matchs-results')
            .setDescription("📅 Affiche les résulats des match d'une phase")
            .addStringOption(option =>
                option.setName('phase')
                    .setDescription("Choisis la phase de match")
                    .setRequired(true)
                    .addChoices(
                        { name: "LEC Winter Playoff", value: "lec-winter-playoff-2025" },
                        { name: "LFL Winter Playoff", value: "lfl-winter-playoff-2025" }
                    )
            )
    );
    console.log("✅ Commande `/matchs-results` enregistrée !");


});

client.on('ready', async () => {

    const guild = client.guilds.cache.first();
    if (!guild) return console.error("❌ Serveur introuvable.");

    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('link')
            .setDescription("🔗 Associe ton compte Discord à ton compte sur le site")
    );

    console.log("✅ Commande `/link` enregistrée !");
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'link') {
        const userId = interaction.user.id; // ID Discord de l'utilisateur
        const link = `${API_URL}/set/discord/${userId}`;

        await interaction.reply({
            content: `🔗 Clique ici pour associer ton compte : [Lien d'association](${link})`,
            ephemeral: true
        });
    }
});



client.login(process.env.DISCORD_TOKEN);
