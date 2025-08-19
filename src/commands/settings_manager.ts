import { EmbedBuilder, InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import SettingsManager from "../handlers/setting_handler";

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
            const value = SettingsManager.get(key);

            if (value !== null) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`Setting: \`${key}\``)
                    .setDescription(`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``)
                    .addFields(
                        { name: "Type", value: `\`${typeof value}\``, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: `Paramètre \`${key}\` inconnu.`, flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === "set") {
            const key = interaction.options.getString("key", true);
            const rawValue = interaction.options.getString("value", true);

            const currentValue = SettingsManager.get(key);
            const type = typeof currentValue;

            if (!currentValue) {
                await interaction.reply({ content: `Paramètre \`${key}\` inconnu.`, flags: MessageFlags.Ephemeral });
                return;
            }

            let parsedValue: string | number | object = rawValue;
            if (type === 'number') {
                const numValue = parseInt(rawValue.trim());
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
                    parsedValue = JSON.parse(rawValue.trim());
                } catch (err) {
                    await interaction.reply({
                        content: `Objet JSON invalide fourni pour \`${key}\`. Veuillez vous assurer qu'il s'agit d'un JSON valide..\n> ${(err as Error).message}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            SettingsManager.set(key, parsedValue);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("Paramètre mis à jour!")
                .setDescription(`Configuration réussie du paramètre \`${key}\` avec:\n\`\`\`json\n${JSON.stringify(parsedValue, null, 2)}\n\`\`\``)
                .addFields(
                    { name: "Type", value: `\`${typeof parsedValue}\``, inline: true }
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
