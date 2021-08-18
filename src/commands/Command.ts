import { SlashCommandBuilder } from "@discordjs/builders";
import { APIApplicationCommandOption } from "discord-api-types/v9";
import Bot from "../bot/Bot";
import { CommandInteraction } from "discord.js";

export default abstract class Command {
    builder: SlashCommandBuilder;
    options: APIApplicationCommandOption[];
    name: string;
    description: string;
    bot: Bot;

    protected constructor(
        name: string,
        description: string,
        build?: (builder: SlashCommandBuilder) => void,
    ) {
        this.name = name;
        this.description = description;

        const builder = new SlashCommandBuilder()
            .setName(name)
            .setDescription(description);

        if (build) build(builder);

        this.builder = builder;
        this.options = builder.toJSON().options;
    }

    abstract incoming(i: CommandInteraction): void | Promise<void>;
}
