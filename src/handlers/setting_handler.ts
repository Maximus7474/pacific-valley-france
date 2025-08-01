import DB from "../utils/database";
import Logger from "../utils/logger";

const logger = new Logger('Settings Manager');

class SettingsManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private settings: Map<string, any> = new Map();

    constructor() {
        DB.all<{
            name: string;
            data_type: 'number' | 'string' | 'object',
            value: string;
        }>('SELECT * FROM `settings`')
        .then((rawSettings) => {
            for (const { name, data_type, value } of rawSettings) {
                let parsedData

                if (data_type === 'number') {
                    parsedData = parseInt(value);
                } else if (data_type === 'object') {
                    parsedData = JSON.parse(value);
                } else if (data_type === 'string') {
                    parsedData = value;
                } else {
                    logger.error('Invalid "data_type" found in settings table !');
                    logger.error('Setting:', name, data_type, value);
                }
                
                if (parsedData) {
                    this.settings.set(name, parsedData);
                }
            }

            logger.success(`Loaded ${this.settings.size}/${rawSettings.length} settings from database.`);
        })
        .catch(err => {
            logger.error('Unable to load settings from database:', err.message)
        });
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