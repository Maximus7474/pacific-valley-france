import { ContainerBuilder, InteractionContextType, MessageFlags, PermissionsBitField, SectionBuilder, SlashCommandBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";

export default new SlashCommand({
    name: 'userinfo',
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName('userinfo')
        .setNameLocalizations({
            'fr': 'info_utilisateur'
        })
        .setContexts(InteractionContextType.Guild)
        .setDescription('Get a user\'s information on this server.')
        .setDescriptionLocalizations({
            'fr': 'Récupérer les information sur un membre du serveur'
        })
        .addUserOption(o =>
            o.setName('user')
                .setDescription('The user to get information about (defaults to yourself)')
                .setRequired(false)
        ),
    callback: async (logger, client, interaction) => {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const member = interaction.guild?.members.cache.get(targetUser.id);
        const authorMember = interaction.guild?.members.cache.get(interaction.user.id);

        if (!member) {
            await interaction.reply({
                content: `Could not find information for ${targetUser.tag}. They might not be in this server.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const highestRole = member.roles.highest;

        const permissions = member.permissions;

        let permissionsString
        if (authorMember && authorMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            permissionsString = "No special permissions.";
            if (permissions.bitfield !== 0n) {
                const grantedPermissions = permissions.toArray();
                if (grantedPermissions.length > 0) {
                    permissionsString = grantedPermissions.map(perm =>
                        perm.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
                    ).join(', ');
                }
            }
        }

        const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### ${member.user.tag}\n` +
                                (member.joinedAt
                                    ? `* __Rejoint le serveur:__ <t:${Math.floor(member.joinedAt.getTime() / 1000)}:d> (<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)\n`
                                    : ''
                                ) +
                                `* __Création du Compte:__ <t:${Math.floor(member.user.createdAt.getTime() / 1000)}:d> (<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>)\n` +
                                `* __Role le plus élevé:__ ${highestRole.name} (ID: ${highestRole.id})\n` +
                                (permissionsString ? `* __Permissions:__ ${permissionsString}\n` : '')
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(
                                        member.avatarURL({ extension: 'webp', size: 256 })
                                    ??  member.user.avatarURL({ extension: 'webp', size: 256 })
                                    ??  client.user?.avatarURL({ extension: 'webp', size: 256 })
                                    ??  'https://placehold.co/400'
                                )
                        )
                );

        await interaction.reply({
            components: [container],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
    }
});