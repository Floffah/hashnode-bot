import Command from "./Command";
import { CommandInteraction, GuildChannel, GuildMember } from "discord.js";

export default class Unsubscribe extends Command {
    constructor() {
        super("unsubscribe", "Unsubscribe a channel from a blog", (builder) =>
            builder
                .addStringOption((o) =>
                    o
                        .setName("name")
                        .setDescription("The name of the blog")
                        .setRequired(true),
                )
                .addChannelOption((o) =>
                    o
                        .setName("channel")
                        .setDescription("Channel to unsubscribe")
                        .setRequired(false),
                ),
        );
    }

    async incoming(i: CommandInteraction): Promise<void | any> {
        await i.deferReply({ ephemeral: true });

        if (!i.guild || !i.member) return await i.editReply(`No guild`);

        let member = i.member;

        if (!(member instanceof GuildMember)) {
            member = await i.guild.members.fetch(member.user.id);
        }

        if (!(member as GuildMember).permissions.has("MANAGE_CHANNELS"))
            return await i.editReply("No permission");

        const name = i.options.getString("name", true);
        const channel = i.options.getChannel("channel") ?? i.channel;

        if (!channel || !(channel instanceof GuildChannel) || !channel.isText())
            return await i.editReply(
                `Command was not ran in a guild channel or an invalid channel was specified`,
            );

        await this.bot.db.follow.delete({
            where: {
                guildId_channelId_username: {
                    username: name.toLowerCase(),
                    guildId: i.guild.id,
                    channelId: channel.id,
                },
            },
        });

        await i.editReply(
            `Removed ${name.toLowerCase()} from <#${channel.id}>`,
        );
    }
}
