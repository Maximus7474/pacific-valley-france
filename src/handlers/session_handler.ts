import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextDisplayBuilder } from "discord.js";
import DB from "../utils/database";
import Logger from "../utils/logger";

const logger = new Logger('Session Handler');

const sessionCreation = new Map<number, Set<number>>();

async function CreateSession(interaction: ChatInputCommandInteraction) {
    const date = interaction.options.getString('date');
    const time = interaction.options.getString('time');
    const details = interaction.options.getString('details');
    const author = interaction.user;

    const dateRegex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    if (!date || !dateRegex.test(date)) {
        return interaction.reply({
            content: `Paramètre de date invalide. Veuillez utiliser le format JJ/MM/AAAA (ex: 31/12/2023).`,
            flags: MessageFlags.Ephemeral,
        });
    }
    if (!time || !timeRegex.test(time)) {
        return interaction.reply({
            content: `Paramètre d'heure invalide. Veuillez utiliser le format HH:MM (ex: 19:30).`,
            flags: MessageFlags.Ephemeral,
        });
    }

    const [day, month, year] = date.split('/');
    const isoFormattedDate = `${year}-${month}-${day}`;
    const combinedDateTimeString = `${isoFormattedDate}T${time}:00`;
    const parsedDate = new Date(combinedDateTimeString);

    if (isNaN(parsedDate.getTime())) {
        return interaction.reply({
            content: `La date ou l'heure fournie n'est pas une date calendrier valide.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    const sessionId = DB.run(
        'INSERT INTO `sessions` (`timestamp`, `details`, `created_by`) VALUES (?, ?, ?)',
        [ parsedDate.getTime(), details ?? null, author.id ]
    ) as number;

    const playerGroups = DB.all<{
        id: number;
        name: string;
        acronym: string;
        emoji: string;
        description: string | null;
    }>('SELECT * FROM `player_groups`');

    const selectOptions = playerGroups.map((group) => {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(`[${group.acronym}] ${group.name}`)
            .setValue(`${group.id}`);

        if (group.emoji) {
            option.setEmoji({
                name: group.emoji,
            });
        }

        return option;
    });

    logger.info(playerGroups);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`# Organisation de la session du ${date}\n> Sélectionnez les groupes pouvant être jouer sur celle-ci`),
        )
        .addActionRowComponents(o =>
            o.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`collector-session-${sessionId}-addgroup`)
                    .setMaxValues(selectOptions.length)
                    .addOptions(...selectOptions)
                )
        )
        .addActionRowComponents(o => 
            o.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Valider")
                    .setCustomId(`collector-session-${sessionId}-validate`),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Annuler")
                    .setCustomId(`collector-session-${sessionId}-cancel`)
            )
        );

    const replyMessage = await interaction.reply({
        components: [container],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], 
    });

    if (!sessionCreation.has(sessionId)) {
        sessionCreation.set(sessionId, new Set());
    }
    
    const collector = replyMessage.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith(`collector-session-${sessionId}`),
        time: 60_000 * 5,
    });

    function updateContainerContent(text: string) {
        // Create an unlinked copy of the container to use as base
        const updatedContainer = new ContainerBuilder(container.toJSON());

        updatedContainer
        .addSeparatorComponents(
            new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large })
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder()
            .setContent(text)
        );

        return updatedContainer;
    }

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
           return i.reply({ content: "Vous n'êtes pas autorisé à interagir avec ce message.", ephemeral: true });
        }

        await i.deferUpdate();

        if (i.customId === `collector-session-${sessionId}-addgroup`) {
            const selectedGroupIds = (i as StringSelectMenuInteraction).values.map(e => parseInt(e));
            const currentSessionGroups = sessionCreation.get(sessionId) || new Set();

            currentSessionGroups.clear();
            selectedGroupIds.forEach(id => currentSessionGroups.add(id));
            sessionCreation.set(sessionId, currentSessionGroups);

            logger.info(`Session ${sessionId} groups updated:`, Array.from(currentSessionGroups));

            const updatedContainer = updateContainerContent(`Groupes sélectionnés pour la session ${sessionId}:\n${Array.from(currentSessionGroups).map(id => playerGroups.find(g => g.id === id)?.name || id).join(', ')}`);

            await i.editReply({ components: [updatedContainer] });

        } else if (i.customId === `collector-session-${sessionId}-validate`) {
            const selectedGroups = sessionCreation.get(sessionId);
            if (!selectedGroups || selectedGroups.size === 0) {
                
                const updatedContainer = updateContainerContent("Veuillez sélectionner au moins un groupe avant de valider.");
                await i.editReply({ components: [updatedContainer] });
                return;
            }

            logger.info(`Session ${sessionId} validated with groups:`, Array.from(selectedGroups));

            await i.editReply({ components: [
                new ContainerBuilder()
                .setAccentColor([0, 255, 0])
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                    .setContent(`Session (${sessionId}) pour le ${parsedDate.toLocaleString('fr-FR')} validée avec les groupes:\n* ${Array.from(selectedGroups).map(id => playerGroups.find(g => g.id === id)?.name || id).join(', ')}.`)
                )
            ] });

            collector.stop('validated');
        } else if (i.customId === `collector-session-${sessionId}-cancel`) {
            logger.info(`Session ${sessionId} cancelled by ${i.user.id}.`);
            sessionCreation.delete(sessionId);

            await i.editReply({ components: [
                    new ContainerBuilder()
                    .setAccentColor([255, 0, 0])
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                        .setContent(`Création de session pour le ${parsedDate.toLocaleString('fr-FR')} annulée.`)
                    )
                ] });

            collector.stop('cancelled');
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            logger.info(`Collector for session ${sessionId} timed out.`);

            replyMessage.edit({
                components: [
                    new ContainerBuilder()
                    .setAccentColor([255, 0, 0])
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                        .setContent(':x: Temps écoulé, merci de recommencer')
                    )
                ],
            });
        } else if (reason === 'cancelled') {
            DB.run('DELETE FROM `sessions` WHERE `id` = ?', [sessionId ]);
        } else if (reason === 'validated') {
            const selectedGroups = sessionCreation.get(sessionId)!;

            for (const id of selectedGroups) {
                try {
                    DB.run('INSERT INTO `session_groups` (`session`, `group`) VALUES (?, ?)', [sessionId, id]);
                } catch (err) {
                    logger.error(`Unable to insert group ${id} for session ${sessionId}:`, (err as Error).message);
                }
            }
        }

        logger.info(`Collector for session ${sessionId} ended. Reason: ${reason}`);
    });
}

export default { CreateSession };