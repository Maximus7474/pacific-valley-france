import SlashCommand from "../classes/slash_command";
import ping from "./ping";
import session_manager from "./session_manager";

export default [
    ping,
    session_manager
] as SlashCommand[];