import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { referralsStore, destinationStore, templateStore } from "../storage.js";

const composer = new Composer<Ctx>();

function formatPreview(name: string, description: string, contact: string, tags: string): string {
  let text = "📋 Referral preview\n\n";
  text += `👤 ${name}\n`;
  text += `${description}\n`;
  if (contact) text += `📞 ${contact}\n`;
  if (tags) text += `🏷 ${tags}`;
  return text;
}

function renderPreview(name: string, description: string, contact: string, tags: string) {
  return {
    text: formatPreview(name, description, contact, tags),
    reply_markup: inlineKeyboard([
      [inlineButton("✅ Confirm", "confirm:referral"), inlineButton("✏️ Edit", "edit:referral")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  };
}

function sendStep(ctx: Ctx, text: string, placeholder: string) {
  return ctx.reply(text, {
    reply_markup: { force_reply: true, input_field_placeholder: placeholder },
  });
}

composer.command("new", async (ctx) => {
  ctx.session.step = "awaiting_name";
  ctx.session.referralName = undefined;
  ctx.session.referralDescription = undefined;
  ctx.session.referralContact = undefined;
  ctx.session.referralTags = undefined;
  await sendStep(ctx, "What is the candidate's name?", "Type the name…");
});

composer.callbackQuery("new:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_name";
  ctx.session.referralName = undefined;
  ctx.session.referralDescription = undefined;
  ctx.session.referralContact = undefined;
  ctx.session.referralTags = undefined;
  await sendStep(ctx, "What is the candidate's name?", "Type the name…");
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (!step || !step.startsWith("awaiting_")) return next();

  const text = ctx.message.text.trim();

  if (step === "awaiting_name") {
    if (text.length < 1) {
      await ctx.reply("Name can't be empty — try again.");
      return;
    }
    ctx.session.referralName = text;
    ctx.session.step = "awaiting_description";
    await sendStep(ctx, "What is the reason or description for this referral?", "Type the description…");
    return;
  }

  if (step === "awaiting_description") {
    if (text.length < 1) {
      await ctx.reply("Description can't be empty — try again.");
      return;
    }
    ctx.session.referralDescription = text;
    ctx.session.step = "awaiting_contact";
    await sendStep(ctx, "Contact info or link? (tap Skip to skip)", "Type contact info or tap Skip…");
    return;
  }

  if (step === "awaiting_contact") {
    ctx.session.referralContact = text === "Skip" ? "" : text;
    ctx.session.step = "awaiting_tags";
    await sendStep(ctx, "Tags or role? (tap Skip to skip)", "Type tags or tap Skip…");
    return;
  }

  if (step === "awaiting_tags") {
    ctx.session.referralTags = text === "Skip" ? "" : text;
    ctx.session.step = "previewing";

    const name = ctx.session.referralName ?? "";
    const description = ctx.session.referralDescription ?? "";
    const contact = ctx.session.referralContact ?? "";
    const tags = ctx.session.referralTags ?? "";

    await ctx.reply(renderPreview(name, description, contact, tags).text, {
      reply_markup: renderPreview(name, description, contact, tags).reply_markup,
    });
    return;
  }

  return next();
});

export default composer;
