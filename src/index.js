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

async function getMatchsKeys()
{
    try {
        const keysResponse = await axios.get(`${API_URL}/get/matchs_keys`);
        return keysResponse.data;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des clefs des matchs :", error);
        return [];
    }
}

// Fonction pour récupérer tous les matchs
async function getAllMatchs() {
    try {
        const responses = [];
        const keys = await getMatchsKeys();
        for (const annee of Object.keys(keys)) {
            for (const league of Object.keys(keys[annee])) {
                if(league === "worlds") continue
                responses.push(...((await axios.get(`${API_URL}/get/matchs/${annee}/${league}/0/winter`)).data))
                responses.push(...((await axios.get(`${API_URL}/get/matchs/${annee}/${league}/0/spring`)).data))
                responses.push(...((await axios.get(`${API_URL}/get/matchs/${annee}/${league}/0/summer`)).data))
                responses.push(...((await axios.get(`${API_URL}/get/matchs/${annee}/${league}/0/national`)).data))
            }
        }
        return responses
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
//     const matches = await getAllMatchs();
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
        const match_coming = match.match_date >= new Date().toISOString().split('T')[0];

        let title;
        if(!match_coming)
            title = `📢 Match passé : **${match.equipe1.name}** 🆚 **${match.equipe2.name}**`;
        else
            title = `📢 Match à venir : **${match.equipe1.name}** 🆚 **${match.equipe2.name}**`


        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`🕐 **Date** : ${match.match_date}\n📝 Faites vos pickems maintenant !`)
            .setColor("Blue")
            .setThumbnail(match.equipe1.image) // Logo équipe 1 en petit

            // Utilisation des champs pour simuler un affichage côte à côte
            .addFields(
                { name: "🏆 **Équipe 1**", value: `**${match.equipe1.name}**`, inline: true },
                { name: "⚔️ **VS**", value: "⠀", inline: true }, // Espace pour aligner
                { name: "🏆 **Équipe 2**", value: `**${match.equipe2.name}**`, inline: true }
            );

        let content = "";
        if(everyone)
            content = "📢 Votez pour le match de demain ! || @everyone ||";

        if(match_coming)
        {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Voter pour " + match.equipe1.name)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`vote_${match.id}_${match.equipe1.name}_${match.match_date}`),
                    new ButtonBuilder()
                        .setLabel("Voter pour " + match.equipe2.name)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`vote_${match.id}_${match.equipe2.name}_${match.match_date}`)
                );

            await channel.send({content: content, embeds: [embed], components: [row] });

        }
        else
            await channel.send({content: content, embeds: [embed] });

    }
}

async function sendMatchReminder(everyone = false) {
    const matches = await getAllMatchs();
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
    const date = interaction.customId.split('_')[3];

    try {

        if(date < new Date().toISOString().split('T')[0]){
            return interaction.reply({
                content: "❌ Tu ne peux pas voter pour un match passé ou qui se joue aujourd'hui, tricheur je te vois.",
                ephemeral: true
            });
        }

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
async function announceResults(annee, league, phase, season) {
    const matches = [...((await axios.get(`${API_URL}/get/matchs/${annee}/${league}/${phase}/${season}`)).data)];
    if (matches.length === 0) return
    await createResults(matches)
}


async function createResults(matches){
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Salon introuvable.");

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

async function votes(matches){
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Salon introuvable.");

    for (const match of matches) {
        let list = []
        for(const vote of match.votes) {
            list = vote.map(vote => `👤 **${vote.pseudo}** a voté pour **${vote.equipe_vote}**`).join("\n");
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Votes pour : ${match.equipe1.name} vs ${match.equipe2.name}`)
            .setDescription(list)
            .setColor("Blue");

        await channel.send({ embeds: [embed] });
    }
}

// Planification des tâches automatiques
cron.schedule("10 8 * * *", () => sendMatchReminder(true), { timezone: "Europe/Paris" }); // Rappel à 8h

// Fonction pour récupérer les matchs de la semaine pour une ligue spécifique
async function getMatchesForWeek(annee, league, phase, season) {
    try {
        const response = await axios.get(`${API_URL}/get/matchs/${annee}/${league}/${phase}/${season}`);
        const allMatches = response.data;

        // Obtenir la date de début de semaine et la date de fin de semaine
        const today = new Date();
        today.setDate((today.getDate() - (today.getDay()-1)))
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

async function getWeekMatches(league){
    const annee = new Date().getFullYear();
    const phase = "0";

    const matches = [];

    matches.push(...await getMatchesForWeek(annee, league, phase, "winter"));
    matches.push(...await getMatchesForWeek(annee, league, phase, "summer"));
    matches.push(...await getMatchesForWeek(annee, league, phase, "spring"));
    matches.push(...await getMatchesForWeek(annee, league, phase, "national"));

    return matches
}

// Gestion des commandes Slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'matchs') {
        const league = interaction.options.getString('league');

        await interaction.deferReply(); // Attente de la réponse
        const matches = await getWeekMatches(league);

        if (matches.length === 0) {
            return interaction.editReply("❌ Aucun match prévu cette semaine pour cette ligue.");
        }
        await createMatchVoteMessage(matches);
        await interaction.editReply(`📢 Les matchs de la semaine pour la ligue **${league}** ont été envoyés !`);
    }

    if (interaction.commandName === 'demain') {
        await interaction.deferReply(); // Indique que le bot traite la commande
        await sendMatchReminder();
        await interaction.editReply("📢 Les matchs de demain ont été envoyés !");
    }

    if (interaction.commandName === 'matchs-results') {
        const annee = interaction.options.getString('annee');
        const league = interaction.options.getString('league');
        const phase = interaction.options.getString('phase');
        const season = interaction.options.getString('season');

        await interaction.deferReply(); // Indique que le bot traite la commande
        await announceResults(annee, league, phase, season);
        await interaction.editReply("📢 Les résultats ont été envoyés !");
    }

    if(interaction.commandName === 'matchs-results-week'){
        const league = interaction.options.getString('league');

        await interaction.deferReply(); // Attente de la réponse
        await createResults(await getWeekMatches(league))
        await interaction.editReply(`📢 Les résultats des matchs de la semaine pour la ligue **${league}** ont été envoyés !`);
    }

    if (interaction.commandName === 'votes') {
        const annee = interaction.options.getString('annee');
        const league = interaction.options.getString('league');
        const phase = interaction.options.getString('phase');
        const season = interaction.options.getString('season');

        await interaction.deferReply(); // Indique que le bot traite la commande
        await votes(annee, league, phase, season);
        await interaction.editReply("📢 Les votes demandés ont été envoyés !");
    }
});

// Enregistrement de la commande `/matchs`
client.on('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

    const guild = client.guilds.cache.first(); // Prendre le premier serveur où le bot est présent
    if (!guild) return console.error("❌ Serveur introuvable.");

    const keys = await getMatchsKeys();
    const annees = [];
    const leagues = [];
    for (const annee of Object.keys(keys)) {
        annees.push({name: annee, value: annee})
        for (const league of Object.keys(keys[annee])) {
            leagues.push({name: league, value: league})
        }
    }

    // Enregistrement de la commande
    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('matchs')
            .setDescription("📅 Affiche les matchs de la semaine d'une phase")
            .addStringOption(option =>
                option.setName('league')
                    .setDescription("Choisis la league'")
                    .setRequired(true)
                    .addChoices(leagues)
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
                option.setName('annee')
                    .setDescription("Choisis l'année'")
                    .setRequired(true)
                    .addChoices(annees)
            )
            .addStringOption(option =>
                option.setName('league')
                    .setDescription("Choisis la league'")
                    .setRequired(true)
                    .addChoices(leagues)
            )
            .addStringOption(option =>
                option.setName('season')
                    .setDescription("Choisis la saison'")
                    .setRequired(true)
                    .addChoices(
                        {name: 'winter', value: 'winter'},
                        {name: 'spring', value: 'spring'},
                        {name: 'summer', value: 'summer'},
                        {name: 'national', value: 'national'},
                    )
            )
            .addStringOption(option =>
                option.setName('phase')
                    .setDescription("Choisis la phase du tournois'")
                    .setRequired(true)
                    .addChoices(
                        {name: 'phase 1', value: '1'},
                        {name: 'phase 2', value: '2'},
                        {name: 'phase 3', value: '3'},
                        {name: 'all', value: '0'},
                    )
            )
    );
    console.log("✅ Commande `/matchs-results` enregistrée !");

    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('votes')
            .setDescription("📅 Affiche les votes des match d'une phase")
            .addStringOption(option =>
                option.setName('annee')
                    .setDescription("Choisis l'année'")
                    .setRequired(true)
                    .addChoices(annees)
            )
            .addStringOption(option =>
                option.setName('league')
                    .setDescription("Choisis la league'")
                    .setRequired(true)
                    .addChoices(leagues)
            )
            .addStringOption(option =>
                option.setName('season')
                    .setDescription("Choisis la saison'")
                    .setRequired(true)
                    .addChoices(
                        {name: 'winter', value: 'winter'},
                        {name: 'spring', value: 'spring'},
                        {name: 'summer', value: 'summer'},
                        {name: 'national', value: 'national'},
                    )
            )
            .addStringOption(option =>
                option.setName('phase')
                    .setDescription("Choisis la phase du tournois'")
                    .setRequired(true)
                    .addChoices(
                        {name: 'phase 1', value: '1'},
                        {name: 'phase 2', value: '2'},
                        {name: 'phase 3', value: '3'},
                        {name: 'all', value: '0'},
                    )
            )
    );
    console.log("✅ Commande `/votes` enregistrée !");

    await guild.commands.create(
        new SlashCommandBuilder()
            .setName('matchs-results-week')
            .setDescription("📅 Affiche les résultats des matchs de la semaine d'une ligue")
            .addStringOption(option =>
                option.setName('league')
                    .setDescription("Choisis la league'")
                    .setRequired(true)
                    .addChoices(leagues)
            )
    );
    console.log("✅ Commande `/matchs-results-week` enregistrée !");

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

const matchWithoutWinner = new Set(); // Stocke les matchs déjà annoncés

async function getMatchesWithoutWinner() {
    try {
        const allMatches = await getAllMatchs(); // Récupère tous les matchs
        return allMatches.filter(match =>
            (match.gagnant === null || match.perdant === null) || matchWithoutWinner.has(match.id)
        );
    } catch (error) {
        console.error("❌ Erreur lors du filtrage des matchs :", error);
        return [];
    }
}

async function lookingForMatch()
{
    const matchs = getMatchesWithoutWinner();
    (await matchs).forEach(match => {
        if(match.gagnant === null || match.perdant === null)
            matchWithoutWinner.add(match.id);
    });

    const finish = [];
    (await matchs).forEach(match => {
        if(match.gagnant !== null && match.perdant !== null)
        {
            finish.push(match)
            matchWithoutWinner.delete(match.id)
        }
    });
    await createResults(finish)
}

const matchsTBD = new Set(); // Stocke les matchs déjà annoncés

async function getMatchesTBD() {
    try {
        const allMatches = await getAllMatchs(); // Récupère tous les matchs
        return allMatches.filter(match =>
            (match.equipe1.name === "TBD" || match.equipe2.name === "TBD") || matchsTBD.has(match.id)
        );
    } catch (error) {
        console.error("❌ Erreur lors du filtrage des matchs :", error);
        return [];
    }
}
async function lookingForMatchTBD()
{
    const matchs = getMatchesTBD();
    (await matchs).forEach(match => {
        if(match.equipe1.name === "TBD" || match.equipe2.name === "TBD")
            matchsTBD.add(match.id);
    });

    const determined = [];
    (await matchs).forEach(match => {
        if(match.equipe1.name !== "TBD" && match.equipe2.name !== "TBD")
        {
            determined.push(match)
            matchsTBD.delete(match.id)
        }

    });

    await createMatchVoteMessage(determined, true)
}

cron.schedule("* * * * *", () => lookingForMatch(), { timezone: "Europe/Paris" }); // Verification toutes les minutes
cron.schedule("* * * * *", () => lookingForMatchTBD(), { timezone: "Europe/Paris" }); // Verification toutes les minutes

client.login(process.env.DISCORD_TOKEN);
