/* eslint-disable */
import { REST, Routes } from 'discord.js';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ Missing DISCORD_BOT_TOKEN in .env file.');
    process.exit(1);
}

function getUserIdFromToken(base64Str) {
    const decodedStr = Buffer.from(base64Str, 'base64').toString('utf-8');
    
    const number = BigInt(decodedStr);
    
    return number.toString();
}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = getUserIdFromToken(TOKEN.split('.')[0]);
const GUILD_ID = process.env.MAIN_GUILD_ID || null;

const clearCommands = process.argv.includes('--clear-commands');

const commands = {
    public: [],
    guild: [],
};

if (clearCommands) {
    console.log('🗑️  Clearing all commands...');
} else {
    const commandsPath = path.join(import.meta.url, '../dist/commands');

    if (!fs.existsSync(commandsPath)) {
        console.error('❌ Commands directory not found. Please build the project first.');
        process.exit(1);
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file)).default;
        if (typeof command.register === 'function') {
            const commandData = command.register();
            console.log(`📜 Registering command: ${commandData.name}`);
            commands[command.isGuildSpecific() ? 'guild' : 'public'].push(commandData);
        }
    }

    console.log(`📜 Found ${commands.public.length} public commands and ${commands.guild.length} guild-specific commands.`);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        if (!clearCommands) console.log(`🔁 Started refreshing ${commands.public.length + commands.guild.length} application (/) commands.`);

        if (GUILD_ID && (clearCommands || commands.guild.length > 0)) {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands.guild },
            );
            console.log(`✅ Successfully reloaded guild-specific (/) commands.`);
        }
        if (clearCommands || commands.public.length > 0) {
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands.public },
            );
            console.log(`✅ Successfully reloaded global (/) commands.`);
        }

        console.log('✅ Finished command registration.\n');

    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();
