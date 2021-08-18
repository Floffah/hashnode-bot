#!/usr/bin/env node

import { program } from "commander";
import { resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Config, defaultConfig } from "./util/config";
import { parse, stringify } from "ini";
import chalk from "chalk";
import deepmerge from "deepmerge";
import Bot from "./bot/Bot";

program
    .name("hashnode-bot")
    .description("Hashnode bot cli")
    .version(require("../package.json").version);

program
    .command("init")
    .argument("[old]", "Optional relative path to migrate old config", resolve)
    .description("Initialise the default config")
    .option("-n, --no-defaults", "Don't load or migrate defaults")
    .action((old, opts) => {
        const datapath = resolve(process.cwd(), ".hashnode-bot");
        if (!existsSync(datapath)) mkdirSync(datapath, { recursive: true });

        const configpath = resolve(datapath, "config.ini");

        let oldconfig: Partial<Config> | undefined;

        if (old) oldconfig = parse(readFileSync(old, "utf-8"));
        else if (existsSync(configpath))
            oldconfig = parse(readFileSync(configpath, "utf-8"));

        // if (!compareKeys(defaultConfig, oldconfig)) {
        //     writeFileSync(
        //         resolve(datapath, "config-old.ini"),
        //         stringify(oldconfig),
        //     );
        //     console.log(
        //         chalk`{red Old config did not have the same keys as the config type. Moved to .hashnode-bot/config-old.ini}`,
        //     );
        // }

        writeFileSync(
            configpath,
            stringify(
                deepmerge(
                    defaultConfig,
                    opts.defaults && oldconfig ? oldconfig : {},
                ),
            ),
        );
        console.log(chalk`{green Wrote config}`);
    });

program.command("run").action(() => new Bot().init());

program.parse(process.argv);
