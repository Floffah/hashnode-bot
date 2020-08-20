import Command from "../../bot/Command";
import Bot from "../../bot/Bot";
import {Message} from "discord.js";
import {request} from "graphql-request/dist";
import {existsSync, writeFileSync} from "fs";
import {resolve} from "path";

export default class extends Command {
    constructor(bot: Bot) {
        super(bot, {
            name: "assign",
            alias: ["setup", "set", "channel"]
        });
    }

    run(msg: Message, args: string[]) {
        if (!msg.member) return;

        if (!args[0] || msg.mentions.channels.size === 0) {
            msg.reply("This command follows the format `?assign <hashnode blog name> #channel`");
            return;
        }

        let blog = args[0],
            channel = msg.mentions.channels.first();

        let query = `query{user(username: "${blog}"){publication {posts(page:0){cuid}}}}`

        request("https://api.hashnode.com/", query).then(value => {
            if (channel !== undefined) {
                if(value.user.publication) {
                    channel.send(`This channel will now recieve notifications about new posts from ${blog} on hashnode`).then(() => {
                        if (!existsSync(resolve(<string>this.bot.paths.get("guilds"), `${msg.guild?.id}.json`))) {
                            writeFileSync(resolve(<string>this.bot.paths.get("guilds"), `${msg.guild?.id}.json`), JSON.stringify({
                                following: [{
                                    name: blog,
                                    channels: [channel?.id]
                                }]
                            }, null, 4));
                        } else {
                            let guildfile: any = require(resolve(<string>this.bot.paths.get("guilds"), `${msg.guild?.id}.json`)),
                                had: boolean = false;
                            for (let i in guildfile.following) {
                                let follow = guildfile.following[i];
                                if (follow.name.toLowerCase() === blog.toLowerCase() && !follow.channels.includes(channel?.id)) {
                                    guildfile.following[i].channels.push(channel?.id);
                                    had = true;
                                }
                            }
                            if (!had) {
                                guildfile.following.push({
                                    name: blog,
                                    channels: [channel?.id]
                                });
                            }
                            writeFileSync(resolve(<string>this.bot.paths.get("guilds"), `${msg.guild?.id}.json`), JSON.stringify(guildfile, null, 4));
                        }
                        msg.reply("Done!");
                    });
                } else {
                    msg.reply(`The Hashnode api didn't return any posts from the blog ${blog}.`);
                }
            }
        }).catch(() => {
            msg.reply(`There was an error while fetching information about the blog "${blog}". Maybe that blog doesn't exist?`);
        });
    }
}
