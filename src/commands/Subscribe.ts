import Command from "./Command";
import { CommandInteraction, GuildChannel, GuildMember } from "discord.js";
import gql from "graphql-tag";

const query = gql`
    query GetUser($username: String!) {
        user(username: $username) {
            publicationDomain
        }
    }
`;

export default class Subscribe extends Command {
    constructor() {
        super("subscribe", "Subscribe a channel to a blog", (builder) =>
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
                        .setDescription("Channel to subscribe")
                        .setRequired(true),
                ),
        );
    }

    async incoming(i: CommandInteraction): Promise<void | any> {
        await i.deferReply({ ephemeral: true });

        if (!i.channel || !i.channel.isText() || !i.guild || !i.member)
            return await i.editReply(`No guild`);

        let member = i.member;

        if (!(member instanceof GuildMember)) {
            member = await i.guild.members.fetch(member.user.id);
        }

        if (!(member as GuildMember).permissions.has("MANAGE_CHANNELS"))
            return await i.editReply("No permission");

        const name = i.options.getString("name", true);
        const channel = i.options.getChannel("channel", true);

        if (!(channel instanceof GuildChannel))
            return await i.editReply(`Can only be ran in a guild`);
        if (!channel.isText())
            return await i.editReply(`Must be a text based channel`);

        const data = await this.bot.gql.request(query, {
            username: name,
        });

        if (data.error)
            return await i.editReply(
                `There was an error while trying to fetch the command`,
            );

        await this.bot.db.follow.create({
            data: {
                guildId: i.guild.id,
                channelId: i.channel.id,
                username: name.toLowerCase(),
                publicationDomain: data.user.publicationDomain,
            },
        });

        await i.channel.send(
            `This channel will now receive notifications about new posts from ${name} on Hashnode. It should send the first message within a few minutes.`,
        );
        await i.editReply(`Done!`);
    }
}
