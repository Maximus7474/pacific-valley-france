import { SlashCommandBuilder } from "discord.js";
import SlashCommand from "../classes/slash_command";
import SessionHandler from "../handlers/session_handler";

export default new SlashCommand({
    name: 'session',
    guildSpecific: true,
    slashcommand: new SlashCommandBuilder()
        .setName('session')
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
        ),
    callback: async (logger, client, interaction) => {
        const subCommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommand();

        logger.info(group, subCommand);

        if (group === 'create' && subCommand === 'create') {
            SessionHandler.CreateSession(interaction);
            return;
        }
    }
});