import Module from "./Module";
import Command from "./Command";
import {Client, Message} from "discord.js";
import {existsSync, lstatSync, mkdirSync, readdirSync} from "fs";
import {resolve} from "path";
import Logger from "../util/Logger";
import {guilddata} from "../modules/Fetch";

const config = require("../../data/config.json")

export default class Bot {
    modules: Map<string, moduleMapInfo>;
    commands: Map<string, commandMapInfo>;

    client: Client;
    log: Logger = new Logger();

    paths: Map<string, string>;

    guilds: Map<string, guilddata>
    links: Map<string, string[]>;

    constructor() {
        this.modules = new Map();
        this.commands = new Map();

        this.guilds = new Map();
        this.links = new Map();

        this.paths = new Map([
            ["cache", resolve(__dirname, '../../data/cache')],
            ["guilds", resolve(__dirname, '../../data/guilds')]
        ]);

        for (let path of this.paths.values()) {
            if (!existsSync(path)) {
                mkdirSync(path);
            }
        }

        this.client = new Client({
            presence: {
                afk: false,
                status: "online",
                activity: {
                    name: `the bot reboot`,
                    type: "WATCHING"
                }
            }
        });

        this.client.on('ready', () => {
            this.ready()
        });

        this.log.info("Bot initialised. Starting...");

        this.start();
    }

    start() {
        this.client.login(config.token);

        setInterval(() => {
            this.client.user?.setPresence({
                afk: false,
                status: "online",
                activity: {
                    name: `${readdirSync(<string>this.paths.get("cache")).length} Hashnode blogs across ${this.client.guilds.cache.size} servers`,
                    type: "WATCHING"
                }
            })
        }, 5000);
    }

    ready() {
        this.log.info(`Logged in as ${this.client.user?.tag}`);
        readdirSync(resolve(__dirname, '../modules')).forEach((p) => {
            if (lstatSync(resolve(__dirname, '../modules', p)).isDirectory()) return false;
            let module = require(resolve(__dirname, '../modules', p)).default,
                Module: Module;
            try {
                Module = new module(this);
            } catch (e) {
                return false;
            }
            if (!Module.info) {
                return false;
            }
            this.modules.set(Module.info.name, {
                name: Module.info.name,
                instance: Module,
                enabled: true,
                commands: []
            });
            Module.ready();
            this.log.info(`Registered module ${Module.info.name}`);

            return true;
        });

        this.eventPass();

        this.client.on('message', (msg) => this.handleCommand(msg));
    }

    eventPass() {
        this.client.on('message', (msg) => {
            this.modules.forEach((v) => {
                if (v.enabled) {
                    v.instance.message(msg);
                }
            });
        });
    }

    registerCommand(module: Module, command: Command) {
        this.commands.set(command.info.name, {
            module: module.info.name,
            instance: command,
        });
        command.info.alias.forEach(alias => {
            this.commands.set(alias, {
                alias: command.info.name
            })
        });
        let emodule = this.modules.get(module.info.name);
        if (emodule !== undefined) {
            emodule.commands.push(command.info.name);
            this.modules.set(module.info.name, emodule);
        }
    }

    handleCommand(msg: Message) {
        if (msg.content.startsWith(config.prefix)) {
            let command = msg.content.split(" ")[0].replace(config.prefix, "").toLowerCase(),
                args = msg.content.replace(`${config.prefix}${command} `, "").split(" ");

            if (msg.content.startsWith(`${config.prefix} `)) {
                command = msg.content.replace(config.prefix + " ", "").split(" ")[0].toLowerCase();
            }

            if (this.commands.has(command)) {
                let cmd: commandMapInfo | undefined = this.commands.get(command);
                if (cmd === undefined) return;
                if (cmd.alias) {
                    cmd = this.commands.get(cmd.alias);
                }
                if (cmd === undefined) return;
                try {
                    cmd.instance?.run(msg, args);
                } catch (e) {
                    msg.reply(`There was an error while executing this command. Message: ${e.message}`);
                    console.error(e);
                }
            }
            // } else {
            //     msg.reply("Sorry, that command does not exist!");
            // }
        }
    }
}

export interface moduleMapInfo {
    name: string,
    instance: Module,
    enabled: boolean,
    commands: string[]
}

export interface commandMapInfo {
    module?: string,
    instance?: Command,
    alias?: string
}
