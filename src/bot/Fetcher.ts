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

        const justFetched: { [username: string]: any } = {};

        for (const follow of follows) {
            const channel = (await this.bot.channels.fetch(
                follow.channelId,
            )) as TextChannel;

            if (channel) {
                const data =
                    justFetched[follow.username] ??
                    (await this.bot.gql.request(query, {
                        username: follow.username,
                    }));

                if (!(follow.username in justFetched))
                    justFetched[follow.username] = data;

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
                                .setFooter(
                                    `${
                                        post.tags
                                            ? post.tags
                                                  .map((t: any) => t.name)
                                                  .join(", ") + "  •  "
                                            : ""
                                    }${data.user.name} on Hashnode`,
                                )
                                .setAuthor(data.user.name, data.user.photo)
                                .setTimestamp(Date.parse(post.dateAdded))
                                .setDescription(post.brief)
                                .setColor("#3366FF")
                                .setURL(
                                    `https://${data.user.publicationDomain}/${post.slug}-${post.cuid}`,
                                );

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
                        await this.bot.db.follow.update({
                            where: {
                                id: follow.id,
                            },
                            data: {
                                previousCuids:
                                    follow.previousCuids &&
                                    follow.previousCuids.length > 0
                                        ? {
                                              push: update,
                                          }
                                        : {
                                              set: update,
                                          },
                            },
                        });
                    }
                }
            }
        }
    }
}
