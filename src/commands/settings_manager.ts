import { EmbedBuilder, InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import SettingsManager, { type SettingDataType, type SettingDataDisplayTypes } from "../handlers/setting_handler";
import { GetChannelIdFromMention, GetRoleIdFromMention } from "../utils/utils";

function displaySettingValue(value: string | number | object, type: SettingDataDisplayTypes) {
    switch (type) {
        case "object":
            return (
                '```json\n'+
                JSON.stringify(value, null, 2)+
                '\n```'
            );
        case "channel_id":
            return `<#${value}>`;
        case "role_id":
            return `<@&${value}>`;
        default:
            return (
                `\`\`\`json\n${value}\n\`\`\``
            );
    }
}

export default new SlashCommand({
    name: "settings",
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName("settings")
        .setNameLocalizations({
            'fr': 'parametres'
        })
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
        .setDescription("Manage bot settings.")
        .setDescriptionLocalizations({
            'fr': 'Gérer les paramètres du bot.'
        })
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("get")
                .setNameLocalizations({
                    'fr': 'chercher'
                })
                .setDescription("Get the current value of a specific setting.")
                .setDescriptionLocalizations({
                    'fr': 'Obtenir la valeur pour un paramètre spécifique'
                })
                .addStringOption(o =>
                    o
                        .setName("key")
                        .setNameLocalizations({
                            'fr': 'parametre'
                        })
                        .setDescription("The name of the setting to retrieve.")
                        .setDescriptionLocalizations({
                            'fr': 'Le paramètre que vous cherchez'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setNameLocalizations({
                    'fr': 'definir'
                })
                .setDescription("Set a new value for a specific setting.")
                .setDescriptionLocalizations({
                    'fr': 'Définir une nouvelle valeure pour un paramètre'
                })
                .addStringOption(o =>
                    o
                        .setName("key")
                        .setNameLocalizations({
                            'fr': 'parametre'
                        })
                        .setDescription("The name of the setting to set.")
                        .setDescriptionLocalizations({
                            'fr': 'Le paramètre a définir'
                        })
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o
                        .setName("value")
                        .setNameLocalizations({
                            'fr': 'valeur'
                        })
                        .setDescription("The new value for the setting.")
                        .setDescriptionLocalizations({
                            'fr': 'La nouvelle valeure pour le paramètre'
                        })
                        .setRequired(true)
                )
        ),
    callback: async (logger, client, interaction) => {
        if (
            !interaction.inGuild() &&
            interaction.user.id !== client.application?.owner?.id
        ) {
            await interaction.reply({ content: "Cette commande ne peut être utilisée que sur un serveur.", flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "get") {
            const key = interaction.options.getString("key", true);
            const value = SettingsManager.get<SettingDataType>(key);
            const dataType = SettingsManager.getDataType(key);

            if (value !== null && dataType !== null) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`Setting: \`${key}\``)
                    .setDescription(displaySettingValue(value, dataType))
                    .addFields(
                        { name: "Type", value: `\`${dataType}\``, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: `Paramètre \`${key}\` inconnu.`, flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === "set") {
            const key = interaction.options.getString("key", true);
            const rawValue = interaction.options.getString("value", true).trim();

            const currentValue = SettingsManager.get(key);
            const type = SettingsManager.getDataType(key);

            if (!currentValue || !type) {
                await interaction.reply({ content: `Paramètre \`${key}\` inconnu.`, flags: MessageFlags.Ephemeral });
                return;
            }

            let parsedValue: NonNullable<SettingDataType> = rawValue;

            if (type === 'number') {
                const numValue = parseInt(rawValue);

                if (isNaN(numValue)) {
                    await interaction.reply({
                        content: `Valeur entière invalide fournie pour \`${key}\`. Veuillez saisir un numéro valide..`,
                        ephemeral: true
                    });
                    return;
                }

                parsedValue = numValue;
            } else if (type === 'object') {
                try {
                    parsedValue = JSON.parse(rawValue);
                } catch (err) {
                    await interaction.reply({
                        content: `Objet JSON invalide fourni pour \`${key}\`. Veuillez vous assurer qu'il s'agit d'un JSON valide..\n> ${(err as Error).message}`,
                        ephemeral: true
                    });

                    return;
                }
            } else if (type === 'channel_id') {
                try {
                    const channelId = GetChannelIdFromMention(rawValue);
                    console.log('channelId', channelId);

                    if (!channelId) throw new Error('Aucune mention de channel a été trouvé')

                    const channel = await client.channels.fetch(channelId);

                    if (channel) parsedValue = channel.id;
                    else throw new Error('Aucun channel de trouvé');
                } catch (err) {
                    await interaction.reply({
                        content: `Channel fournis pour \`${key}\` est invalid. Veuillez renseigner un channel valide.\n> ${(err as Error).message}`,
                        ephemeral: true
                    });

                    return;
                }
            } else if (type === 'role_id') {
                try {
                    const roleId = GetRoleIdFromMention(rawValue);
                    console.log('roleId', roleId);

                    if (!roleId) throw new Error('Aucune mention de role a été trouvé');

                    const role = await interaction.guild!.roles.fetch(roleId);

                    if (role) parsedValue = role.id;
                    else throw new Error('Aucun rôle de trouvé');
                } catch (err) {
                    await interaction.reply({
                        content: `Rôle fournis pour \`${key}\` est invalid. Veuillez renseigner un rôle valide.\n> ${(err as Error).message}`,
                        ephemeral: true
                    });

                    return;
                }
            }

            SettingsManager.set(key, parsedValue);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("Paramètre mis à jour!")
                .setDescription(`Configuration réussie du paramètre \`${key}\``)
                .addFields(
                    { name: "Donnée", value:displaySettingValue(parsedValue, type), inline: true },
                    { name: "Type", value: `\`${type}\``, inline: true },
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

            logger.info(`Setting '${key}' updated to '${JSON.stringify(parsedValue)}' by ${interaction.user.tag}`);
        }
    },
    autocomplete: async (logger, client, interaction) => {
        const focusedOption = interaction.options.getFocused(true);
        const subcommand = interaction.options.getSubcommand();

        if ((subcommand === "get" || subcommand === "set") && focusedOption.name === "key") {
            const settings = SettingsManager.get_keys();

            const filtered = settings
                .filter(setting =>
                    setting.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                )
                .slice(0, 25);

            await interaction.respond(
                filtered.map(setting => ({ name: setting, value: setting }))
            );
        }
    },
});
