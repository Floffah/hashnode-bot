import Bot from "./Bot";
import gql from "graphql-tag";
import { formatError } from "graphql";
import { MessageEmbed, TextChannel } from "discord.js";

const query = gql`
    query GetPosts($username: String!) {
        user(username: $username) {
            name
            photo
            publicationDomain
            publication {
                posts(page: 0) {
                    dateAdded
                    cuid
                    title
                    tags {
                        name
                    }
                    brief
                    coverImage
                    slug
                }
            }
        }
    }
`;

export default class Fetcher {
    bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    async start() {
        setInterval(() => this.fetch(), 1000 * 60 * 5);
    }

    async fetch() {
        const follows = await this.bot.db.follow.findMany();

        for (const follow of follows) {
            const channel = (await this.bot.channels.fetch(
                follow.channelId,
            )) as TextChannel;

            if (channel) {
                const data = await this.bot.gql.request(query, {
                    username: follow.username,
                });

                if (data.error) {
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setColor("#d32029")
                                .setTitle(
                                    "Error while fetching data from Hashnode's API",
                                )
                                .setDescription(
                                    `\`\`\`\n${formatError(
                                        data.error,
                                    )}\n\`\`\``,
                                ),
                        ],
                    });
                } else if (data.user.publication) {
                    const update: string[] = [];
                    const embeds: MessageEmbed[] = [];

                    for (const post of data.user.publication.posts) {
                        if (!follow.previousCuids.includes(post.cuid)) {
                            update.push(post.cuid);

                            const embed = new MessageEmbed()
                                .setTitle(post.title)
                                .setURL(
                                    `https://${data.user.publicationDomain}/${post.slug}-${post.cuid}${post.user.name} on Hashnode`,
                                )
                                .setFooter(
                                    `${
                                        post.tags
                                            ? post.tags.join(", ") + "  •  "
                                            : ""
                                    }`,
                                )
                                .setAuthor(post.user.name, post.user.photo)
                                .setTimestamp(new Date(post.dateAdded))
                                .setDescription(post.brief)
                                .setColor("#3366FF");

                            if (post.coverImage)
                                embed.setImage(post.coverImage);

                            embeds.push(embed);
                        }
                    }

                    if (embeds.length > 0) {
                        await channel.send({
                            embeds,
                        });
                    }

                    if (update.length > 0) {
                        this.bot.db.follow.update({
                            where: {
                                id: follow.id,
                            },
                            data: {
                                previousCuids: {
                                    push: update,
                                },
                            },
                        });
                    }
                }
            }
        }
    }
}
