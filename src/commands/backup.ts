import { AttachmentBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import env from "../utils/config";
import fs from 'fs';
import path from 'path';

export default new SlashCommand({
    name: 'ping',
    guildSpecific: false,
    hideFromHelp: true,
    slashcommand: new SlashCommandBuilder()
        .setName('backup')
        .setContexts(InteractionContextType.BotDM)
        .setDescription('Download the database'),
    callback: async (logger, client, interaction) => {
        if (interaction.user.id !== client.application?.owner?.id) {
            interaction.reply('Access Denied');
            return;
        }

        const filePath = env.SQLITE_PATH;

        if (!filePath) {
            interaction.reply('No exportable SQLITE database');
            logger.error('SQLITE_PATH is not defined in environment variables.');
            return;
        }

        const absoluteFilePath = path.resolve(filePath);
        const fileName = path.basename(absoluteFilePath);

        try {
            const fileContent = fs.readFileSync(absoluteFilePath);

            const attachment = new AttachmentBuilder(fileContent, { name: fileName });

            await interaction.reply({
                content: 'Here is your database backup:',
                files: [attachment],
            });
            logger.success(`Successfully sent database backup to ${interaction.user.tag}`);

        } catch (error) {
            logger.error(`Failed to read or send database file from ${absoluteFilePath}: ${error}`);
            await interaction.reply({
                content: `Failed to create backup. Please check the bot's logs for more details. Error: ${(error as Error).message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
});