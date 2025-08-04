import { EmbedBuilder, InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import DB from "../utils/database";
import SettingsManager from "../handlers/setting_handler";

export default new SlashCommand({
    name: "settings",
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName("settings")
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
        .setDescription("Manage bot settings for this guild.")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("get")
                .setDescription("Get the current value of a specific setting.")
                .addStringOption(o =>
                    o
                        .setName("key")
                        .setDescription("The name of the setting to retrieve.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set a new value for a specific setting.")
                .addStringOption(o =>
                    o
                        .setName("key")
                        .setDescription("The name of the setting to set.")
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o
                        .setName("value")
                        .setDescription("The new value for the setting.")
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName("type")
                    .setDescription("The type of the new value for the setting.")
                    .setRequired(false)
                    .setChoices(
                        { name: 'string', value: 'string' },
                        { name: 'integer', value: 'integer' },
                        { name: 'object', value: 'object' }
                    )
                )
        ),
    callback: async (logger, client, interaction) => {
        if (
            !interaction.inGuild() &&
            interaction.user.id !== client.application?.owner?.id
        ) {
            await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
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
                await interaction.reply({ content: `Setting \`${key}\` not found.`, flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === "set") {
            const key = interaction.options.getString("key", true);
            const rawValue = interaction.options.getString("value", true);
            const type = (interaction.options.getString("type") ?? 'string') as 'string' | 'integer' | 'object';

            let parsedValue: string | number | object = rawValue;
            if (type === 'integer') {
                const numValue = parseInt(rawValue.trim());
                if (isNaN(numValue)) {
                    await interaction.reply({
                        content: `Invalid integer value provided for \`${key}\`. Please enter a valid number.`,
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
                        content: `Invalid JSON object provided for \`${key}\`. Please ensure it's valid JSON.\n> ${(err as Error).message}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            SettingsManager.set(key, parsedValue);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("Setting Updated!")
                .setDescription(`Successfully set \`${key}\` to \`\`\`json\n${JSON.stringify(parsedValue, null, 2)}\n\`\`\``)
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

        if (subcommand === "get" && focusedOption.name === "key") {
            const settings = await DB.all<{ name: string }>('SELECT `name` FROM `settings`');

            const filtered = settings
                .filter(setting =>
                    setting.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                )
                .slice(0, 25);

            await interaction.respond(
                filtered.map(setting => ({ name: setting.name, value: setting.name }))
            );
        }
    },
});
