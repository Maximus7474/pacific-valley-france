import { GenericResponse } from "@types";
import DB from "../utils/database";
import Logger from "../utils/logger";
import { User } from "discord.js";

const logger = new Logger('Group Handler');

interface RawGroup {
    id: number;
    name: string;
    acronym: string;
    emoji: string;
    description: string | null;
    added_by: string;
    added_at: number;
};

type GroupData = Omit<RawGroup, 'id' | 'added_at' | 'added_by'>;

function GetGroups(): RawGroup[] {
    return DB.all<RawGroup>('SELECT * FROM `player_groups`');
}

function EditGroup(groupId: number, data: Partial<GroupData>): GenericResponse {
    const currentData = DB.get<RawGroup>('SELECT * FROM `player_groups` WHERE `id` = ?', [groupId]);

    if (data.acronym && data.acronym.length > 6) return { success: false, error: 'Acronym est trop long' };

    if (!(data.name && data.acronym && data.emoji && data.description)) {
        return {
            success: false,
            error: 'Aucune nouvelle valeure a été transmise.'
        };
    }

    const newData = {
        ...currentData,
        ...data,
    };

    if (newData.description && newData.description.length < 3) newData.description = null;

    try {
        const result = DB.run(
            'UPDATE `player_groups` SET `name` = ?, `acronym` = ?, `emoji` = ?, `description` = ? WHERE `id` = ?',
            [newData.name, newData.acronym, newData.emoji, newData.description, groupId],
        );

        if (result === 1) return { success: true };
        else return { success: false, error: 'Impossible de mettre à jour en BDD' };
    } catch (err) {
        logger.error(`An error occured when updating group (${groupId}):`, (err as Error).message);
        return { success: false, error: "Une erreure c'est produite" };
    }
}

function AddGroup(data: GroupData, user: User): GenericResponse {
    if (data.acronym && data.acronym.length > 6) return { success: false, error: 'Acronym est trop long' };
    if (data.description && data.description.length < 3) data.description = null;

    try {
        const result = DB.run(
            'INSERT INTO `player_groups` (`name`, `acronym`, `emoji`, `description`, `added_by`) VALUES (?, ?, ?, ?, ?)',
            [data.name, data.acronym, data.emoji, data.description, user.id]
        );

        if (result !== 0) return { success: true };
        else return { success: false, error: 'Impossible a créer en BDD' };
    } catch (err) {
        logger.error(`An error occured when creating a group (${data.name}):`, (err as Error).message);
        return { success: false, error: "Une erreure c'est produite" };
    }
}

export default { EditGroup, GetGroups, AddGroup };