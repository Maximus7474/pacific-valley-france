import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { DBConnectionDetails } from '@types';

import Logger from '../logger';
const logger = new Logger('SQLiteHandler');

export default class SQLiteHandler {
    private db: Database.Database;
    private initialized: boolean = false;

    constructor({SQLITE_PATH}: DBConnectionDetails) {
        if (typeof SQLITE_PATH !== 'string') {
            throw new Error(`DB Path for SQLite database is invalid !`);
        }

        this.db = new Database(SQLITE_PATH);
    }

    init(): void {
        const scriptPath = path.join(import.meta.dirname, 'sqlite-base.sql'); // Store path in a variable
        let sqlScript: string;

        if (existsSync(scriptPath)) {
            sqlScript = readFileSync(scriptPath, 'utf8');
        } else {
            logger.warn(`SQLite base script not found at ${scriptPath}. Skipping database initialization.`);
            return;
        }

        this.db.exec(sqlScript);
        this.initialized = true;
    }

    async waitForInitialization() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.initialized) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 100);
        });
    };

    /**
     * Executes a SQL query that does not return any result (e.g., INSERT, UPDATE, DELETE).
     *
     * @param query - The SQL query string to be executed.
     * @param params - An optional array of parameters to bind to the query placeholders.
     *                 Defaults to an empty array if not provided.
     * 
     * @throws {Error} If the query execution fails.
     * @returns {[lastInsertRowid: number | bigint, changes: number]}
     */
    async run(query: string, params: unknown[] = []): Promise<[number | bigint, number]> {
        if (!this.initialized) await this.waitForInitialization();
        const stmt = this.db.prepare(query);
        const result = stmt.run(...params);
        return [result.lastInsertRowid, result.changes];
    }

    /**
     * Executes a SQL query to retrieve a single row from the database.
     *
     * @template T The expected type of the returned data by the query.
     * @param query - The SQL query string to be executed.
     * @param params - An optional array of parameters to bind to the query.
     * @returns The first row of the result set as an object, or `undefined` if no rows are found.
     */
    async get<T>(query: string, params: unknown[] = []): Promise<T | undefined> {
        if (!this.initialized) await this.waitForInitialization();
        const stmt = this.db.prepare(query);
        return stmt.get(...params) as T | undefined;
    }

    /**
     * Executes a SQL query and retrieves all matching rows from the database.
     *
     * @template T The expected type of each row returned by the query.
     * @param query - The SQL query string to execute.
     * @param params - An optional array of parameters to bind to the query. Defaults to an empty array.
     * @returns An array of objects representing the rows returned by the query.
     */
    async all<T>(query: string, params: unknown[] = []): Promise<T[]> {
        if (!this.initialized) await this.waitForInitialization();
        const stmt = this.db.prepare(query);
        return stmt.all(...params) as T[];
    }

    close(): void {
        this.db.close();
    }
}
