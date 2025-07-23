import DB from "../utils/database";
import Logger from "../utils/logger";

const logger = new Logger('Settings Manager');

class SettingsManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private settings: Map<string, any> = new Map();

    constructor() {
        const rawSettings = DB.all<{
            name: string;
            data_type: 'number' | 'string' | 'object',
            value: string;
        }>('SELECT * FROM `settings`');

        for (const setting of rawSettings) {
            let parsedData

            if (setting.data_type === 'number') {
                parsedData = parseInt(setting.value);
            } else if (setting.data_type === 'object') {
                parsedData = JSON.parse(setting.value);
            } else if (setting.data_type === 'string') {
                parsedData = setting.value;
            } else {
                logger.error('Invalid "data_type" found in settings table !');
                logger.error('Setting:', setting);
            }
            
            if (parsedData) {
                this.settings.set(setting.name, parsedData);
            }
        }
    }

    get<T>(key: string): T | null {
        return this.settings.get(key) as T ?? null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(key: string, value: any) {
        if (this.settings.has(key)) {
            DB.run(
                'UPDATE `settings` SET `value` = ? WHERE `name` = ?',
                [ value, key ]
            );
        } else {
            DB.run(
                'INSERT INTO `settings` (`name`, `value`, `data_type`) VALUES (?, ?, ?)',
                [ key, JSON.stringify(value), typeof value ]
            );
        }

        this.settings.set(key, value);
    }
}

export default new SettingsManager();