import "source-map-support/register";
import { Client, Collection, Interaction, TextChannel } from "discord.js";
import { Config } from "../util/config";
import { resolve } from "path";
import { parse, stringify } from "ini";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { GraphQLClient } from "graphql-request";
import { PrismaClient } from "@prisma/client";
import Fetcher from "./Fetcher";
import Command from "../commands/Command";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import chalk from "chalk";
import Subscribe from "../commands/Subscribe";
import { ApplicationCommandTypes } from "../util/enums";
import { parse as jjuParse } from "jju";
import gql from "graphql-tag";
import Unsubscribe from "../commands/Unsubscribe";

const commands: { new (): Command }[] = [Subscribe, Unsubscribe];

export default class Bot extends Client {
    gql: GraphQLClient;
    db: PrismaClient;
    fetcher: Fetcher;
    restClient: REST;

    datapath = resolve(process.cwd(), ".hashnode-bot");
    configpath = resolve(this.datapath, "config.ini");
    config: Config;

    commands: Collection<string, Command> = new Collection();

    constructor() {
        super({
            intents: ["GUILD_MESSAGES", "GUILDS"],
        });
    }

    loadConfig() {
        this.config = parse(readFileSync(this.configpath, "utf-8")) as Config;
    }

    writeConfig() {
        writeFileSync(this.configpath, stringify(this.config));
    }

    async init() {
        this.loadConfig();

        this.db = new PrismaClient();
        this.gql = new GraphQLClient("https://api.hashnode.com/", {});
        this.fetcher = new Fetcher(this);

        for (const cmd of commands) {
            const command = new cmd();
            command.bot = this;
            this.commands.set(command.name, command);
        }

        this.on("ready", () => this.ready());
        this.on("interactionCreate", (i) => this.interaction(i));

        this.restClient = new REST({ version: "9" }).setToken(
            this.config.bot.token,
        );
        await this.login(this.config.bot.token);
    }

    async ready() {
        await this.migrateOld();

        await this.fetcher.start();

        if (!this.application) return;

        await this.restClient.put(
            Routes.applicationCommands(this.application.id),
            {
                body: [
                    ...[...this.commands.values()].map((c) => ({
                        type: ApplicationCommandTypes.CHAT_INPUT,
                        ...c.builder.toJSON(),
                    })),
                    {
                        type: ApplicationCommandTypes.MESSAGE,
                        name: "View blog url",
                    },
                ],
            },
        );

        console.log(chalk`{green Ready}`);

        await this.updatePresence();
        setInterval(() => this.updatePresence(), 1000 * 60);
    }

    async updatePresence() {
        const followcount = await this.db.follow.count();
        const guildcount = await this.guilds.fetch();

        this.user?.setPresence({
            status: "online",
            activities: [
                {
                    type: "WATCHING",
                    name: `${followcount} blogs across ${guildcount.size} servers`,
                },
            ],
        });
    }

    async interaction(i: Interaction): Promise<void | any> {
        if (i.isCommand() && this.commands.has(i.commandName)) {
            const cmd = this.commands.get(i.commandName) as Command;

            cmd.incoming(i);
        } else if (i.isContextMenu()) {
            if (i.commandName === "View blog url") {
                try {
                    await i.deferReply({ ephemeral: true });

                    const msg = i.options.getMessage("message", true);

                    if (!msg.embeds || msg.embeds.length <= 0)
                        return await i.editReply(`No data`);

                    const embed = msg.embeds[0];

                    if (!embed.footer || !embed.footer.text)
                        return await i.editReply(`No data`);

                    const username = (
                        embed.footer.text.includes("  •  ")
                            ? embed.footer.text.split("  •  ")[1]
                            : embed.footer.text
                    )
                        .split(" ")[0]
                        .toLowerCase();

                    const message = await (
                        i.channel as TextChannel
                    ).messages.fetch(msg.id);
                    if (!message.guild)
                        return await i.editReply(`No guild found`);

                    const follow = await this.db.follow.findUnique({
                        where: {
                            guildId_channelId_username: {
                                guildId: message.guild.id,
                                channelId: (i.channel as TextChannel).id,
                                username,
                            },
                        },
                    });

                    if (!follow)
                        return await i.editReply(`No subscription found`);

                    await i.editReply(`https://${follow.publicationDomain}`);
                } catch (e) {
                    await (i.replied ? i.editReply : i.reply)(
                        `Error: \`${e.message}\``,
                    );
                }
            }
        }
    }

    async migrateOld() {
        const migrationdir = resolve(this.datapath, "migrations");

        if (existsSync(migrationdir)) {
            const guilds = resolve(migrationdir, "guilds");
            const cache = resolve(migrationdir, "cache");

            const cached: { [username: string]: string[] } = {};
            const pdomainCache: { [username: string]: string } = {};

            for (const guild of readdirSync(guilds)) {
                const data = jjuParse(
                    readFileSync(resolve(guilds, guild), "utf-8"),
                );

                for (const follow of data.following) {
                    const cuids =
                        cached[follow.name.toLowercase()] ??
                        (() => {
                            const cachedata = jjuParse(
                                readFileSync(
                                    resolve(cache, `${follow.name}.json`),
                                    "utf-8",
                                ),
                            );

                            return (cached[follow.name] = cachedata.posts);
                        })();

                    for (const channel of follow.channels) {
                        const c = (await this.channels.fetch(
                            channel,
                        )) as TextChannel;

                        await c.send(
                            `This blog subscription has been migrated to the new bot. You should use slash commands from now on, which also introduces the new /unsubscribe command!`,
                        );

                        const pdomain =
                            pdomainCache[follow.name] ??
                            (pdomainCache[follow.name] = (
                                await this.gql.request(
                                    gql`
                                        query GetPublicationDomain(
                                            $username: String!
                                        ) {
                                            user(username: $username) {
                                                publicationDomain
                                            }
                                        }
                                    `,
                                    {
                                        username: follow.name,
                                    },
                                )
                            ).user.publicationDomain);

                        await this.db.follow.create({
                            data: {
                                previousCuids: cuids,
                                username: follow.name,
                                channelId: c.id,
                                guildId: c.guildId,
                                publicationDomain: pdomain,
                            },
                        });
                    }
                }
            }
        }
    }
}
