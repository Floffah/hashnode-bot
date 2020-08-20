import Module from "../bot/Module";
import Bot from "../bot/Bot";
import Help from "../commands/util/Help";

export default class Util extends Module {
    constructor(bot: Bot) {
        super(bot, {
            name: "util"
        });
    }

    ready() {
        this.bot.registerCommand(this, new Help(this.bot));
    }
}
