import "source-map-support/register";
import { Client, Collection, Interaction, TextChannel } from "discord.js";
import { Config } from "../util/config";
import { resolve } from "path";
import { parse, stringify } from "ini";
import { readFileSync, writeFileSync } from "fs";
import { GraphQLClient } from "graphql-request";
import { PrismaClient } from "@prisma/client";
import Fetcher from "./Fetcher";
import Command from "../commands/Command";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import chalk from "chalk";
import Subscribe from "../commands/Subscribe";
import { ApplicationCommandTypes } from "../util/enums";

const commands: { new (): Command }[] = [Subscribe];

export default class Bot extends Client {
    gql: GraphQLClient;
    db: PrismaClient;
    fetcher: Fetcher;
    restClient: REST;

    configpath = resolve(process.cwd(), ".hashnode-bot", "config.ini");
    config: Config;

    commands: Collection<string, Command> = new Collection();

    constructor() {
        super({
            intents: ["GUILD_MESSAGES"],
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
        this.gql = new GraphQLClient("https://api.hashnode.com/");
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
    }

    async interaction(i: Interaction) {
        if (i.isCommand() && this.commands.has(i.commandName)) {
            const cmd = this.commands.get(i.commandName) as Command;

            cmd.incoming(i);
        } else if (i.isContextMenu()) {
            if (i.commandName === "View blog url") {
                try {
                    await i.deferReply({ ephemeral: true });

                    const msg = i.options.getMessage("message", true);

                    if (!msg.embeds || msg.embeds.length <= 0)
                        return await i.reply(`No data`);

                    const embed = msg.embeds[0];

                    if (!embed.footer || !embed.footer.text)
                        return await i.reply(`No data`);

                    const username = (
                        embed.footer.text.includes("  •  ")
                            ? embed.footer.text.split("  •  ")[1]
                            : embed.footer.text
                    ).split(" ")[0];

                    const message = await (
                        i.channel as TextChannel
                    ).messages.fetch(msg.id);
                    if (!message.guild) return await i.reply(`No guild found`);

                    const follow = await this.db.follow.findUnique({
                        where: {
                            guildId_channelId_username: {
                                guildId: message.guild.id,
                                channelId: (i.channel as TextChannel).id,
                                username,
                            },
                        },
                    });

                    if (!follow) return await i.reply(`No subscription found`);

                    await i.reply(`https://${follow.publicationDomain}`);
                } catch (e) {
                    await (i.replied ? i.editReply : i.reply)(
                        `Error: \`${e.message}\``,
                    );
                }
            }
        }
    }
}
