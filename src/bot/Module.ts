import {Message} from 'discord.js'
import Bot from "./Bot";

export default class Module {
    bot: Bot;
    info: moduleInfo;

    constructor(bot: Bot, info: moduleInfo) {
        this.bot = bot;
        this.info = info;
    }

    ready() {}

    message(msg: Message) {}
}

export interface moduleInfo {
    name: string
}
