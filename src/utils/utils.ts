import { ComponentEmojiResolvable, ContainerBuilder, InteractionReplyOptions, MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from 'discord.js';
import * as fs from 'fs';
import path from 'path';
import { red, yellow } from './colours';
import Logger from './logger';

const logger = new Logger('Utils');

export const getFilesFromDir = (dirPath: string): string[] => {
    const files: string[] = [];

    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            files.push(...getFilesFromDir(itemPath));
        } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
            files.push(itemPath);
        }
    });

    return files;
}

type GenericContainerResponseData = {
    title: string;
    description?: string;
    color?: [number, number, number];
    thumbnail?: string;
}

export const GenericContainerResponse = (data: GenericContainerResponseData, ephemeral: boolean): InteractionReplyOptions => {
    const container = new ContainerBuilder();

    if (data.color) container.setAccentColor(data.color);

    const mainSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${data.title}`+
                (data.description ? `\n${data.description}` : '')
            )
        );

    if (data.thumbnail) {
        try {
            new URL(data.thumbnail);
            mainSection.setThumbnailAccessory(new ThumbnailBuilder()
                .setURL(data.thumbnail));
        } catch (err) {
            logger.error(`Invalid thumbnail URL was passed to ${yellow('GenericContainerResponse')}: ${red(data.thumbnail)}`, (err as Error).message);
        }
    }

    container.addSectionComponents(mainSection);

    return {
        components: [container],
        flags: ephemeral ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] : [MessageFlags.IsComponentsV2],
    };
}

export const GetEmojiResolvable = (emoji: string): ComponentEmojiResolvable => {
    const match = emoji.match(/<a?:\w+:(\d+)>/);

    if (match) return {
        id: match[1]
    }

    if ([...emoji].length === 1) {
        return { name: emoji };
    }

    return { name: '❓' };
}

const idRegex = /(\d+)/;

const channelMentionRegex = /<#(\d+)>/;
const channelLinkRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)/;

export const GetChannelIdFromMention = (mention: string): string | null => {
    const idMatch = mention.match(idRegex);
    if (idMatch) {
        return idMatch[1];
    }

    const mentionMatch = mention.match(channelMentionRegex);
    if (mentionMatch) {
        return mentionMatch[1];
    }

    const linkMatch = mention.match(channelLinkRegex);
    if (linkMatch) {
        return linkMatch[1];
    }

    return null;
}

const roleMentionRegex = /<@&(\d+)>/;

export const GetRoleIdFromMention = (mention: string): string | null => {
    const idMatch = mention.match(idRegex);
    if (idMatch) {
        return idMatch[1];
    }

    const mentionMatch = mention.match(roleMentionRegex);
    if (mentionMatch) {
        return mentionMatch[1];
    }

    return null;
}
