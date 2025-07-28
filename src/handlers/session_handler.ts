import { ActionRowBuilder, APISelectMenuOption, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Client, ContainerBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextChannel, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import DB from "../utils/database";
import Logger from "../utils/logger";
import { DiscordClient } from "@types";
import Settings from "./setting_handler";
import { GenericContainerResponse } from "../utils/utils";

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
                    .setContent(
                        `Session (${sessionId}) pour le ${parsedDate.toLocaleString('fr-FR')} validée avec les groupes:\n`+
                        `* ${Array.from(selectedGroups).map(id => playerGroups.find(g => g.id === id)?.name || id).join(', ')}.`
                    )
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

            UpdateSessionMessage(interaction.client, sessionId);
        }

        logger.info(`Collector for session ${sessionId} ended. Reason: ${reason}`);
    });
}

interface RawGroup {
        id: number;
        name: string;
        acronym: string;
        emoji: string;
        description: string | null;
};
interface RawGroupCount extends RawGroup {
    count: number;
}

async function UpdateSessionMessage(client: DiscordClient | Client, sessionId: number) {
    const session = DB.get<{
        timestamp: number;
        details: string | null;
        active: 0 | 1;
        message_id: string | null;
        created_by: string;
    }>("SELECT `timestamp`, `details`, `active`, `message_id`, `created_by` FROM `sessions` WHERE `id` = ?", [ sessionId ]);

    if (!session) {
        logger.error('(UpdateSessionMessage) No session data was found for id:', sessionId);
        return;
    }

    const sessionDateObj = new Date(session.timestamp);

    const groups = DB.all<RawGroup>(
        `SELECT G.id, G.name, G.acronym, G.emoji, G.description
        FROM session_groups SG
        LEFT JOIN player_groups G ON G.id = SG.\`group\`
        WHERE SG.session = ?`,
        [ sessionId ]
    );

    const groupSpecialCases = DB.get<{
        absent: number;
        late: number;
    }>(
        'SELECT '+
        'COUNT(CASE WHEN `absent` = 1 THEN 1 ELSE NULL END) as `absent`, '+
        'COUNT(CASE WHEN `late` = 1 THEN 1 ELSE NULL END) as `late` '+
        'FROM `session_participants` WHERE `session` = ?',
        [sessionId]
    );

    const rawGroupParticipants = DB.all<{
        group: number;
    }>("SELECT `group` FROM `session_participants` WHERE `session` = ?", [sessionId]);

    const groupParticipants: {[key: string]: RawGroupCount} = {};
    rawGroupParticipants.forEach(e => {
        const group = groups.find((g) => g.id === e.group);

        if (group) {
            if (groupParticipants[group.id]) {
                groupParticipants[group.id].count++;
            } else {
                groupParticipants[group.id] = {
                    ...group,
                    count: 1
                };
            }
        }
    });

    const sessionDate = sessionDateObj
        .toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const sessionTime = sessionDateObj
        .toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' });

    const group_select_options = groups.map(g => ({
        default: false,
        description: g.description ?? undefined,
        emoji: g.emoji,
        label: g.name,
        value: `${g.id}`,
    })) as APISelectMenuOption[];

    const container = new ContainerBuilder()
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# Session du ${sessionDate} à ${sessionTime}\n`+
                        `> Début dans: <t:${Math.floor(sessionDateObj.getTime() / 1000)}:R>\n`+
                        (session.details ?? '')
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(
                                client.user?.avatarURL({ extension: 'webp', size: 256 })
                            ??  'https://placehold.co/400'
                        )
                )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                Object.keys(groupParticipants).length === 0
                    ? "Aucun participant"
                    : (
                        `Participants:\n`+
                        Object.keys(groupParticipants).map(id => {
                            const group = groupParticipants[id];

                            return `* ${group.emoji} ${group.acronym}: ${group.count} membres`;
                        })
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                .setCustomId(`session-${sessionId}-group-selection`)
                .setMaxValues(1)
                .setMinValues(1)
                .setOptions(group_select_options)
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`session-${sessionId}-absent`)
                    .setLabel(`Absent (${groupSpecialCases.absent})`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`session-${sessionId}-late`)
                    .setLabel(`En retard (${groupSpecialCases.late})`)
                    .setStyle(ButtonStyle.Primary),
            )
        );

    const channelId = Settings.get('session_channel') as string | null;

    if (!channelId) throw new Error(`No channel id is set in the Settings under "session_channel" key !`)

    const channel = await client.channels.fetch(channelId);

    if (!channel) throw new Error(`No channel found for id: "${channelId}"`);
    if (!channel.isTextBased()) throw new Error(`Channel: ${channel.name} (${channelId}) is not a text channel !`);

    let message;
    if (session.message_id) {
        try {
            message = await channel.messages.fetch({ message: session.message_id, cache: true });
        } catch (err) {
            logger.error(`(UpdateSessionMessage) Unable to fetch message (${(err as Error).message}), a new one will be sent.`);
        }
    }

    if (!message) {
        message = await (channel as TextChannel).send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
        
        DB.run('UPDATE `sessions` SET `message_id` = ? WHERE `id` = ?', [ message.id, sessionId ]);
    } else {
        message.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    }
}

async function HandleInteraction(client: DiscordClient, interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const { customId } = interaction;

    const match = customId.match(/^session-(\d+)-(group-selection|absent|late)$/);

    if (!match) return;

    const [, rawSessionId, action] = match;
    const sessionId = parseInt(rawSessionId);
    const { user } = interaction;

    const isValid = DB.get<{active: 1 | 0; timestamp: number}>('SELECT `active`, `timestamp` FROM `sessions` WHERE `id` = ?', [ sessionId ]);

    if (!isValid) {
        return interaction.reply({
            components: [GenericContainerResponse({
                title: 'Session inconnu',
                color: [255, 0, 0],
                thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
            })],
        });
    }

    if (isValid.active === 0) {
        return interaction.reply({
            components: [GenericContainerResponse({
                title: 'Session désactivé',
                color: [255, 0, 0],
                thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
            })],
        });
    }

    if (isValid.timestamp < Date.now()) {
        return interaction.reply({
            components: [GenericContainerResponse({
                title: 'Session terminé',
                color: [255, 0, 0],
                thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
            })],
        });
    }

    const userAnswer = DB.get<{
        session: number;
        user: string;
        absent: 0 | 1;
        late: 0 | 1;
        group: number | null;
        updated_at: number;
    } | undefined>('SELECT * FROM `session_participants` WHERE `session` = ? AND `user` = ?', [ sessionId, user.id ]);

    if (!userAnswer) DB.run('INSERT INTO `session_participants` (`session`, `user`) VALUES (?, ?)', [ sessionId, user.id ]);

    if (action === 'absent') {
        DB.run(
            'UPDATE `session_participants` SET `late` = 0, `absent` = 1, `group` = ? WHERE `user` = ? AND `session` = ?',
            [null, user.id, sessionId]
        );

        interaction.reply({
            components: [new ContainerBuilder()
                .setAccentColor([0, 255, 0])
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# Absence noté\n"+
                                "Vous êtes dorénavant marqué en tant qu'absent pour la session."
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(
                                        client.user?.avatarURL({ extension: 'webp', size: 256 })
                                    ??  'https://placehold.co/400'
                                )
                        )
            )],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    } else if (action === 'late') {
        if (userAnswer && !userAnswer.group) {
            return interaction.reply({
                components: [new ContainerBuilder()
                    .setAccentColor([255, 0, 0])
                    .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# Impossible\n"+
                                "Vous n'avez pas signaler votre présence, vous ne pouvez être en retard.\n"+
                                "Signaler votre présence en choissiant un groupe."
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(
                                        client.user?.avatarURL({ extension: 'webp', size: 256 })
                                    ??  'https://placehold.co/400'
                                )
                        )
                )],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        }

        DB.run(
            'UPDATE `session_participants` SET `late` = 1, `absent` = 0 WHERE `user` = ? AND `session` = ?',
            [user.id, sessionId]
        );

        interaction.reply({
            components: [new ContainerBuilder()
                .setAccentColor([0, 255, 0])
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# Présence mis à jour\n"+
                                "Vous êtes marqué comme pouvant avoid du retard pour la session."
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(
                                        client.user?.avatarURL({ extension: 'webp', size: 256 })
                                    ??  'https://placehold.co/400'
                                )
                        )
            )],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    } else if (action === 'group-selection') {
        const groupId = parseInt((interaction as StringSelectMenuInteraction).values[0])

        DB.run(
            'UPDATE `session_participants` SET `absent` = 0, `group` = ? WHERE `user` = ? AND `session` = ?',
            [groupId, user.id, sessionId]
        );

        const groupData = DB.get<{
            acronym: string;
            name: string;
        }>('SELECT `acronym`, `name` FROM `player_groups` WHERE `id` = ?', [groupId])

        interaction.reply({
            components: [new ContainerBuilder()
                .setAccentColor([0, 255, 0])
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# Présence mis à jour\n`+
                                `> Vous êtes noté comme présent dans le groupe: (${groupData.acronym}) ${groupData.name}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(
                                        client.user?.avatarURL({ extension: 'webp', size: 256 })
                                    ??  'https://placehold.co/400'
                                )
                        )
            )],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    } else {
        return interaction.reply({
            components: [new ContainerBuilder()
                .setAccentColor([255, 0, 0])
                .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Impossible")
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL('https://tenor.com/en-GB/view/non-mario-gif-10899016')
                    )
            )],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    }

    UpdateSessionMessage(client, sessionId);
}

export default { CreateSession, UpdateSessionMessage, HandleInteraction };