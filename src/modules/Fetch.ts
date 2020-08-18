import Module from "../bot/Module";
import Bot from "../bot/Bot";
import {readdirSync, unlinkSync} from "fs";
import {resolve} from "path";

export default class Util extends Module {
    constructor(bot: Bot) {
        super(bot, {
            name: "util"
        });
    }

    ready() {

        this.bot.logger.info(`Checking for updates every 15 seconds`);

        this.guildinit();
        setInterval(() => this.guildinit(), 15000);
    }

    guildinit() {
        let checked: string[] = [];

        readdirSync(resolve(<string>this.bot.paths.get("guilds"))).forEach(file => {
            let guild = this.bot.client.guilds.resolve(file.replace(".json", ""));
            if(guild !== null) {
                let data:guilddata = require(resolve(<string>this.bot.paths.get("guilds"), file));
                if("following" in data) {
                    let following: Map<string, guildchanneldata> = new Map();
                    data.following.forEach((follow) => {
                        following.set(follow.name, follow);
                    });
                    this.bot.guilds.set(guild.id, {
                        following
                    });
                } else {
                    unlinkSync(resolve(__dirname, <string>this.bot.paths.get("guilds"), file));
                }
            } else {
                unlinkSync(resolve(__dirname, <string>this.bot.paths.get("guilds"), file));
            }
        });
        console.log(this.bot.guilds);
    }
}

export interface guilddata {
    following: Map<string, guildchanneldata>
}

export interface guildchanneldata {
    name: string,
    channels: string[]
}
