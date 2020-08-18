import Bot from "./Bot";
import {Message} from "discord.js";

export default class Command {
    bot: Bot;
    info: commandInfo;

    constructor(bot: Bot, info: commandInfo) {
        this.bot = bot;
        this.info = info;
    }

    run(msg: Message, args: string[]) {}
}

export interface commandInfo {
    alias: string[],
    name: string
}
