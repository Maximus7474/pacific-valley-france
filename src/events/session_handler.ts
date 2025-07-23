import { Events } from "discord.js";
import EventHandler from "../classes/event_handler";
import session_handler from "../handlers/session_handler";

export default new EventHandler({
    name: 'SESSION',
    eventName: Events.InteractionCreate,
    type: "on",
    callback: (logger, client, interaction) => {
        session_handler.HandleInteraction(client, interaction);
    }
});