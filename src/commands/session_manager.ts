import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import SessionHandler from "../handlers/session_handler";
import GroupHandler from "../handlers/group_handler";
import { GenericContainerResponse } from "../utils/utils";

export default new SlashCommand({
    name: 'session',
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName('session')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageEvents)
        .setNameLocalizations({
            fr: "session",
        })
        .setDescription("Handle game sessions and it's settings.")
        .setDescriptionLocalizations({
            fr: "Gérer les sessions de jeu et le paramétrage de ceux-ci.",
        })
        // Create subcommand
        .addSubcommand(c =>
            c.setName('create')
            .setNameLocalizations({
                fr: 'créer',
            })
            .setDescription("Create a new session")
            .setDescriptionLocalizations({
                fr: "Créer une nouvelle session de jeu",
            })
            .addStringOption(o =>
                o.setName('date')
                .setNameLocalizations({
                    fr: 'date'
                })
                .setDescription("Date of the game session (DD/MM/YYYY)")
                .setDescriptionLocalizations({
                    fr: "Date de la session (DD/MM/YYYY)"
                })
                .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('time')
                .setNameLocalizations({
                    fr: 'heure'
                })
                .setDescription("Time of the game session start (HH:MM)")
                .setDescriptionLocalizations({
                    fr: "Heure de début de session (HH:MM)"
                })
                .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('details')
                .setNameLocalizations({
                    fr: 'details'
                })
                .setDescription("Détails on the session, specific planning, etc...")
                .setDescriptionLocalizations({
                    fr: "Detail de la session, planning spécifique, etc..."
                })
            )
        )
        // group subcommands
        .addSubcommandGroup(g =>
            g.setName('group')
            .setNameLocalizations({
                fr: 'groupe',
            })
            .setDescription('Manage the player groups for sessions')
            .setDescriptionLocalizations({
                fr: "Gérer les groupes de jeu pour les sessions",
            })
            // Add a group
            .addSubcommand(c =>
                c.setName('add')
                .setNameLocalizations({
                    fr: 'ajouter',
                })
                .setDescription('Add a new playable groupe for the sessions')
                .setDescriptionLocalizations({
                    fr: "Ajouter un groupe jouable pour les sessions",
                })
                .addStringOption(o =>
                    o.setName('name')
                    .setNameLocalizations({
                        fr: 'nom',
                    })
                    .setDescription('Name of the groupe')
                    .setDescriptionLocalizations({
                        fr: "Nom du groupe",
                    })
                    .setRequired(true)
                    .setMinLength(5)
                    .setMaxLength(255)
                )
                .addStringOption(o =>
                    o.setName('acronym')
                    .setNameLocalizations({
                        fr: 'acronym',
                    })
                    .setDescription('Acronym of the groupe')
                    .setDescriptionLocalizations({
                        fr: "Acronyme du groupe",
                    })
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(6)
                )
                .addStringOption(o =>
                    o.setName('emoji')
                    .setNameLocalizations({
                        fr: 'emoji',
                    })
                    .setDescription('Emoji for the display')
                    .setDescriptionLocalizations({
                        fr: "Émoji pour l'affichage",
                    })
                    .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('description')
                    .setNameLocalizations({
                        fr: 'description',
                    })
                    .setDescription('Short groupe description')
                    .setDescriptionLocalizations({
                        fr: "Description courte du groupe",
                    })
                    .setRequired(false)
                    .setMaxLength(255)
                )
            )
            // Edit a group
            .addSubcommand(c =>
                c.setName('edit')
                .setNameLocalizations({
                    fr: 'modifier',
                })
                .setDescription('Edit details for a groupe')
                .setDescriptionLocalizations({
                    fr: "Modifier les détails d'un groupe",
                })
                .addIntegerOption(o =>
                    o.setName('group')
                    .setNameLocalizations({
                        fr: 'groupe',
                    })
                    .setDescription('Groupe to edit')
                    .setDescriptionLocalizations({
                        fr: "Groupe a modifier",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName('name')
                    .setNameLocalizations({
                        fr: 'nom',
                    })
                    .setDescription('Name of the groupe')
                    .setDescriptionLocalizations({
                        fr: "Nom du groupe",
                    })
                    .setRequired(false)
                    .setMinLength(5)
                    .setMaxLength(255)
                )
                .addStringOption(o =>
                    o.setName('acronym')
                    .setNameLocalizations({
                        fr: 'acronym',
                    })
                    .setDescription('Acronym of the groupe')
                    .setDescriptionLocalizations({
                        fr: "Acronyme du groupe",
                    })
                    .setRequired(false)
                    .setMinLength(2)
                    .setMaxLength(6)
                )
                .addStringOption(o =>
                    o.setName('emoji')
                    .setNameLocalizations({
                        fr: 'emoji',
                    })
                    .setDescription('Emoji for the display')
                    .setDescriptionLocalizations({
                        fr: "Émoji pour l'affichage",
                    })
                    .setRequired(false)
                )
                .addStringOption(o =>
                    o.setName('description')
                    .setNameLocalizations({
                        fr: 'description',
                    })
                    .setDescription('Short groupe description')
                    .setDescriptionLocalizations({
                        fr: "Description courte du groupe",
                    })
                    .setRequired(false)
                    .setMaxLength(255)
                )
            )
            // Delete a group
            .addSubcommand(c =>
                c.setName('delete')
                .setNameLocalizations({
                    fr: 'supprimer',
                })
                .setDescription('Delete a groupe')
                .setDescriptionLocalizations({
                    fr: "Supprimer un groupe",
                })
                .addIntegerOption(o =>
                    o.setName('group')
                    .setNameLocalizations({
                        fr: 'groupe',
                    })
                    .setDescription('Groupe to delete')
                    .setDescriptionLocalizations({
                        fr: "Groupe a supprimer",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
        ),
    callback: async (logger, client, interaction) => {
        const subCommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();

        if (group === null && subCommand === 'create') {
            SessionHandler.CreateSession(interaction);
            return;
        } else if (group === 'group') {
            if (subCommand === 'add') {
                const name = interaction.options.getString('name', true);
                const acronym =interaction.options.getString('acronym', true);
                const emoji = interaction.options.getString('emoji', true);
                const description = interaction.options.getString('description');
                
                const response = await GroupHandler.AddGroup({
                    name, acronym, emoji, description
                }, interaction.user);

                if (response.success) {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Création de groupe',
                            description: `Le groupe a été créer avec succès. Détails:\n`+
                                `* Nom: ${name}\n`+
                                `* Acronyme: \`${acronym}\`\n`+
                                `* Émoji: ${emoji}\n`+
                                (description ? `* Description:\n > ${description}\n` : '* Aucune Description'),
                            color: [0, 255, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                } else {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Échec de la création de groupe',
                            description: `Le groupe n'as pas pu être créer:\n> ${response.error}`,
                            color: [255, 0, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                }
                return;
            } else if (subCommand === 'edit') {
                const groupId = interaction.options.getInteger('group', true);
                const name = interaction.options.getString('name');
                const acronym =interaction.options.getString('acronym');
                const emoji = interaction.options.getString('emoji');
                const description = interaction.options.getString('description');

                const response = await GroupHandler.EditGroup(groupId, {
                    name: name ?? undefined,
                    acronym: acronym ?? undefined,
                    emoji: emoji ?? undefined,
                    description: description ?? undefined,
                });

                if (response.success) {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Modification de groupe',
                            description: `Le groupe a été modifier avec succès. Détails mis à jour:\n`+
                                ( name ? `* Nom: ${name}\n` : '' ) +
                                ( acronym ? `* Acronyme: \`${acronym}\`\n` : '' ) +
                                ( emoji ? `* Émoji: ${emoji}\n` : '' ) +
                                ( description ? `* Description:\n > ${description}\n` : ''),
                            color: [0, 255, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                } else {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Échec de la modification',
                            description: `Le groupe n'as pas pu être modifier:\n> ${response.error}`,
                            color: [255, 0, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                }
            } else if (subCommand === 'delete') {
                const groupId = interaction.options.getInteger('group', true);

                const response = await GroupHandler.DeleteGroup(groupId, interaction.user);

                if (response.success) {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Suppression de groupe',
                            description: `Le groupe a été supprimer avec succès.`,
                            color: [0, 255, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                } else {
                    interaction.reply(
                        GenericContainerResponse({
                            title: 'Échec de la modification',
                            description: `Le groupe n'as pas pu être supprimer:\n> ${response.error}`,
                            color: [255, 0, 0],
                            thumbnail: client.user?.avatarURL({ extension: 'webp', size: 256 }) ?? 'https://placehold.co/400'
                        }, true)
                    );
                }
            }
        }
    },
    autocomplete: async (logger, client, interaction) => {
        const focusedValue = interaction.options.getFocused();
        const subCommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommand();

        if (group === 'group' && (subCommand === 'edit' || subCommand === 'delete')) {
            const groupes = await GroupHandler.GetGroups();

            const filtered = groupes.filter(group => 
                    group.name.toLowerCase().startsWith(focusedValue.toLowerCase())
                ||  group.acronym.toLowerCase().startsWith(focusedValue.toLowerCase())
            );

            const responseChoices = filtered.slice(0, 25).map(group => ({ name: group.name, value: group.id }));

            interaction.respond(responseChoices);
        }
    }
});