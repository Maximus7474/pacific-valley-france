import SlashCommand from "../classes/slash_command";
import backup from "./backup";
import ping from "./ping";
import session_manager from "./session_manager";
import settings_manager from "./settings_manager";
import userinfo from "./userinfo";

export default [
    ping,
    session_manager,
    settings_manager,
    userinfo,
    backup,
] as SlashCommand[];