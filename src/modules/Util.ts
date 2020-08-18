import Module from "../bot/Module";
import Bot from "../bot/Bot";

export default class Util extends Module {
    constructor(bot: Bot) {
        super(bot, {
            name: "util"
        });
    }

    ready() {
        this.bot.logger.info(`Logged in as ${this.bot.client.user?.tag}`);
    }
}
