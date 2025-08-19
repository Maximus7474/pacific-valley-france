import { MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import SettingsManager from "../handlers/setting_handler";

export default new SlashCommand({
    name: 'media-reposter',
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName('repost')
        .setDescription('Poster une image dans le channel officiel')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addAttachmentOption(o => 
            o.setName('image')
            .setDescription('L\'image a republier.')
            .setRequired(true)
        ),
    callback: async (logger, client, interaction) => {
        const image = interaction.options.getAttachment('image', true);
        
        const targetChannelId = SettingsManager.get('media-reposter-channel') as string;
        const channel = await client.channels.fetch(targetChannelId);

        if (!channel) {
            logger.error(`Unable to find channel with id: ${targetChannelId}`);
            interaction.reply({
                content: `Envois impossible, le channel: ${targetChannelId} est introuvable.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!channel.isTextBased() || channel.isDMBased()) {
            logger.error(`Channel ${targetChannelId} is not a text channel !`);
            interaction.reply({
                content: `Le channel: ${targetChannelId} n'est pas un salon textuel.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const msg = await channel.send({
            files: [image.url]
        });

        interaction.reply({
            content: `Image envoyé: ${msg.url}`,
        });
    }
});
