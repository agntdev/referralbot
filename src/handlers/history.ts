import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { referralsStore, destinationStore } from "../storage.js";

const composer = new Composer<Ctx>();

composer.command("history", async (ctx) => {
  await showHistory(ctx);
});

composer.callbackQuery("history:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showHistory(ctx);
});

async function showHistory(ctx: Ctx) {
  const referrals = await referralsStore.getAll();
  if (referrals.length === 0) {
    await ctx.reply("No referrals yet. Tap 📝 New referral to create one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const recent = referrals.slice(-10).reverse();
  const rows = recent.map((r) => [
    inlineButton(`#${r.id} — ${r.candidateName}`, `history:view:${r.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply(`📋 Referrals (${referrals.length} total):`, {
    reply_markup: inlineKeyboard(rows),
  });
}

composer.callbackQuery(/^history:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = Number(ctx.match[1]);
  const referral = await referralsStore.get(id);
  if (!referral) {
    await ctx.reply("Referral not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  let text = `📋 Referral #${referral.id}\n\n`;
  text += `👤 ${referral.candidateName}\n`;
  text += `${referral.description}\n`;
  if (referral.contact) text += `📞 ${referral.contact}\n`;
  if (referral.tags) text += `🏷 ${referral.tags}\n`;
  text += `\n🕐 ${new Date(referral.timestamp).toLocaleString()}`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Re-post", `history:repost:${referral.id}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery(/^history:repost:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = Number(ctx.match[1]);
  const referral = await referralsStore.get(id);
  if (!referral) {
    await ctx.reply("Referral not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  if (!(await destinationStore.isConfigured())) {
    await ctx.reply("⚠️ No destination configured. Set one in Settings first.", {
      reply_markup: inlineKeyboard([[inlineButton("⚙️ Settings", "settings:show")]]),
    });
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

  let message = `📢 Referral #${referral.id}\n\n`;
  message += `👤 ${referral.candidateName}\n`;
  message += `${referral.description}\n`;
  if (referral.contact) message += `📞 ${referral.contact}\n`;
  if (referral.tags) message += `🏷 ${referral.tags}`;

  try {
    await ctx.api.sendMessage(chatIdNum, message);
    await ctx.reply(`✅ Referral #${referral.id} re-posted successfully!`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`❌ Couldn't re-post: ${errMsg}`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

export default composer;
