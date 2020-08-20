import Module from "../bot/Module";
import Bot from "../bot/Bot";
import {existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync} from "fs";
import {resolve} from "path";
import {EventEmitter} from "events";
import {request} from "graphql-request/dist";
import {MessageEmbed, TextChannel} from "discord.js";
import Assign from "../commands/fetch/Assign";

export default class Util extends Module {
    events: EventEmitter;

    constructor(bot: Bot) {
        super(bot, {
            name: "fetch"
        });

        this.events = new EventEmitter();
    }

    ready() {
        this.bot.registerCommand(this, new Assign(this.bot));

        this.bot.log.info(`Checking for updates every 15 seconds`);

        this.guildinit();
        this.fetch();
        setInterval(() => {
            this.guildinit();
            this.fetch()
        }, 15000);
    }

    guildinit() {
        this.bot.guilds.clear();
        this.bot.links.clear();
        let checked: string[] = [];

        readdirSync(resolve(<string>this.bot.paths.get("guilds"))).forEach(file => {
            let guild = this.bot.client.guilds.resolve(file.replace(".json", ""));
            if (guild !== null) {
                let data: guilddata = require(resolve(<string>this.bot.paths.get("guilds"), file));
                if ("following" in data) {
                    let following: Map<string, guildchanneldata> = new Map();
                    data.following.forEach((follow) => {
                        following.set(follow.name, follow);
                        let old = this.bot.links.get(follow.name);
                        if (old !== undefined) {
                            old.push(...follow.channels);
                            this.bot.links.set(follow.name, old);
                        } else {
                            this.bot.links.set(follow.name, [...follow.channels]);
                        }
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
    }

    fetch() {
        for (let l of this.bot.links.keys()) {
            let link = this.bot.links.get(l);
            let query = `query{user(username: "${l}"){_id name publication{posts (page: 0){dateAdded cuid title brief coverImage slug}}}}`
            request('https://api.hashnode.com/', query).then(res => {
                if (!res.error) {
                    res.user.publication.posts.forEach((post: post) => {
                        if (existsSync(resolve(<string>this.bot.paths.get("cache"), `${l}.json`))) {
                            let cache: cache = JSON.parse(readFileSync(resolve(<string>this.bot.paths.get("cache"), `${l}.json`), 'utf8'));
                            if (!cache.posts.includes(post.cuid)) {
                                let embed = new MessageEmbed()
                                    .setTitle(post.title)
                                    .setURL(`https://${l}.hashnode.dev/${post.slug}-${post.cuid}`)
                                    .setImage(post.coverImage)
                                    .setFooter(`${res.user.name} on Hashnode`)
                                    .setTimestamp(new Date(post.dateAdded))
                                    .setDescription(post.brief)
                                    .setColor("#3366FF");
                                if (link !== undefined) {
                                    link.forEach((channel) => {
                                        console.log(`${channel}`);
                                        this.bot.client.channels.fetch(`${channel}`).then((ch) => {
                                            if(ch !== null) {
                                                //@ts-ignore
                                                ch.send(embed);
                                            }
                                        });
                                    });
                                }
                                cache.posts.push(post.cuid);
                                writeFileSync(resolve(<string>this.bot.paths.get("cache"), `${l}.json`), JSON.stringify(cache, null, 4));
                            }
                        }
                    });
                }
            });
        }
    }
}

interface apires {
    error?: any,
    user: {
        publication: {
            posts: post[]
        }
    }
}

export interface guilddata {
    following: Map<string, guildchanneldata>
}

export interface guildchanneldata {
    name: string,
    channels: string[]
}

export interface post {
    cuid: string,
    title: string,
    brief: string,
    coverImage: string,
    slug: string,
    dateAdded: string,
}

export interface cache {
    posts: string[]
}
