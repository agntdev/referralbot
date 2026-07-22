import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { referralsStore, destinationStore, templateStore } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("confirm:referral", async (ctx) => {
  await ctx.answerCallbackQuery();

  const name = ctx.session.referralName;
  const description = ctx.session.referralDescription;
  if (!name || !description) {
    await ctx.reply("No referral data found. Tap 📝 New referral to start.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const contact = ctx.session.referralContact ?? "";
  const tags = ctx.session.referralTags ?? "";

  if (!(await destinationStore.isConfigured())) {
    await ctx.reply(
      "⚠️ No destination configured. Set a destination group or channel first.",
      { reply_markup: inlineKeyboard([[inlineButton("⚙️ Settings", "settings:show")]]) },
    );
    return;
  }

  const destination = await destinationStore.get();
  if (!destination) {
    await ctx.reply("⚠️ Destination config error. Please try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const chatIdNum = Number(destination.chatId);
  if (!Number.isFinite(chatIdNum)) {
    await ctx.reply("⚠️ Invalid destination chat ID. Update it in Settings.", {
      reply_markup: inlineKeyboard([[inlineButton("⚙️ Settings", "settings:show")]]),
    });
    return;
  }

  const template = await templateStore.get();
  let message = template.templateText
    .replace(/\{name\}/g, name)
    .replace(/\{description\}/g, description)
    .replace(/\{contact\}/g, contact || "Not provided")
    .replace(/\{tags\}/g, tags || "None");

  try {
    await ctx.api.sendMessage(chatIdNum, message);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`❌ Couldn't post the referral: ${errMsg}`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const submission = await referralsStore.add({
    candidateName: name,
    description,
    contact,
    tags,
    timestamp: new Date().toISOString(),
    author: ctx.from?.id ?? 0,
  });

  ctx.session.step = undefined;
  ctx.session.referralName = undefined;
  ctx.session.referralDescription = undefined;
  ctx.session.referralContact = undefined;
  ctx.session.referralTags = undefined;

  await ctx.editMessageText(
    `✅ Referral #${submission.id} posted successfully!`,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

export default composer;
