import SlashCommand from "../classes/slash_command";
import ping from "./ping";
import session_manager from "./session_manager";
import settings_manager from "./settings_manager";

export default [
    ping,
    session_manager,
    settings_manager,
] as SlashCommand[];