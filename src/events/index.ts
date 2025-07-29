import EventHandler from "../classes/event_handler";
import command_handler from "./command_handler";
import ready from "./ready";
import session_handler from "./session_handler";

export default [
    command_handler,
    ready,
    session_handler,
] as EventHandler[];
