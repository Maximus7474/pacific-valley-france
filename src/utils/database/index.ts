import { DBConnectionDetails } from '@types';
import Config from '../config';
import DBHandler from './handler';

const connectionDetails: DBConnectionDetails = {
    SQLITE_PATH: Config.SQLITE_PATH,
    SQL_HOST: Config.SQL_HOST,
    SQL_PORT: Config.SQL_PORT,
    SQL_USER: Config.SQL_USER,
    SQL_DATABASE: Config.SQL_DATABASE,
    SQL_PASSWORD: Config.SQL_PASSWORD,
};

const DB = new DBHandler(connectionDetails);

export default DB;
