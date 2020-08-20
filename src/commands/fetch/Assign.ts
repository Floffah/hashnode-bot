import Command from "../../bot/Command";
import Bot from "../../bot/Bot";
import {Message, MessageEmbed} from "discord.js";

export default class extends Command {
    constructor(bot: Bot) {
        super(bot, {
            name: "assign",
            alias: ["setup", "set", "channel"]
        });
    }

    run(msg: Message, args: string[]) {
        if(!msg.member) return;

        if(!args[0] || msg.mentions.channels.size === 0) {
            msg.reply("This command follows the format `?assign <hashnode blog name> #channel`");
            return;
        }

        let blog = args[0],
            channel = msg.mentions.channels.first();


        msg.reply(`Ok! I have set up ${channel} to get notifications about new blog posts from ${blog}`);
    }
}
