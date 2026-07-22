import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { destinationStore, templateStore } from "../storage.js";

const composer = new Composer<Ctx>();

function settingsMenu() {
  return {
    text: "⚙️ Settings",
    reply_markup: inlineKeyboard([
      [inlineButton("📍 Set destination", "settings:destination")],
      [inlineButton("📝 Edit template", "settings:template")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  };
}

composer.callbackQuery("settings:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const menu = settingsMenu();
  const dest = await destinationStore.get();
  let text = menu.text + "\n\n";
  text += dest ? `📍 Destination: ${dest.chatId}` : "📍 Destination: not set";
  await ctx.reply(text, { reply_markup: menu.reply_markup });
});

composer.callbackQuery("settings:destination", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_destination";
  await ctx.reply("Send the destination group or channel chat ID:", {
    reply_markup: { force_reply: true, input_field_placeholder: "e.g. -1001234567890…" },
  });
});

composer.callbackQuery("settings:template", async (ctx) => {
  await ctx.answerCallbackQuery();
  const template = await templateStore.get();
  ctx.session.step = "awaiting_template";
  await ctx.reply(
    `Current template:\n\n${template.templateText}\n\nSend a new template. Use {name}, {description}, {contact}, {tags} as placeholders.`,
    {
      reply_markup: { force_reply: true, input_field_placeholder: "Type the new template…" },
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (step !== "awaiting_destination" && step !== "awaiting_template") return next();

  const text = ctx.message.text.trim();

  if (step === "awaiting_destination") {
    const chatIdNum = Number(text);
    if (!Number.isFinite(chatIdNum)) {
      await ctx.reply("That doesn't look like a valid chat ID. It should be a number like -1001234567890.", {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
      return;
    }
    await destinationStore.set(text);
    ctx.session.step = undefined;
    await ctx.reply("✅ Destination saved!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  if (step === "awaiting_template") {
    if (text.length < 10) {
      await ctx.reply("Template is too short. Include placeholders like {name}, {description}, {contact}, {tags}.");
      return;
    }
    await templateStore.set(text);
    ctx.session.step = undefined;
    await ctx.reply("✅ Template updated!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  return next();
});

export default composer;
