import { MessageFlags, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";

export default new SlashCommand({
    name: 'help',
    guildSpecific: false,
    hideFromHelp: true,
    slashcommand: new SlashCommandBuilder()
        .setName('help')
        .setNameLocalizations({
            'fr': 'aide'
        })
        .setDescription('Displays a list of all available commands.')
        .setDescriptionLocalizations({
            'fr': 'Afficher les commandes disponibles',
        }),
    callback: async (logger, client, interaction) => {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "This command only works in a server.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const locale = interaction.locale;
        const memberPermissions = interaction.memberPermissions;

        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Commandes disponibles');

        for (const [, cmd] of client.commands) {
            const commandData = cmd.register();

            if (cmd.isHiddenForHelpCommand()) continue;
            
            const requiredPermissions = commandData.default_member_permissions;

            const resolvedPermissions = requiredPermissions !== undefined && requiredPermissions !== null
                ? BigInt(requiredPermissions)
                : null;

            const hasPermission = !resolvedPermissions || memberPermissions.has(resolvedPermissions);

            if (!(commandData.description && hasPermission)) continue;

            const commandName = commandData.name_localizations?.[locale] ?? commandData.name;
            const description = commandData.description_localizations?.[locale] ?? commandData.description;

            helpEmbed.addFields({
                name: `/${commandName}`,
                value: description,
                inline: false,
            });
        }

        await interaction.reply({
            embeds: [helpEmbed],
            flags: MessageFlags.Ephemeral,
        });
    }
});
