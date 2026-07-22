import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function editMenu(ctx: Ctx) {
  const name = ctx.session.referralName ?? "";
  const description = ctx.session.referralDescription ?? "";
  const contact = ctx.session.referralContact ?? "";
  const tags = ctx.session.referralTags ?? "";

  let text = "✏️ Edit referral\n\n";
  text += `👤 Name: ${name}\n`;
  text += `📝 Description: ${description}\n`;
  text += `📞 Contact: ${contact || "(none)"}\n`;
  text += `🏷 Tags: ${tags || "(none)"}`;

  return {
    text,
    reply_markup: inlineKeyboard([
      [inlineButton("👤 Name", "edit:name"), inlineButton("📝 Description", "edit:description")],
      [inlineButton("📞 Contact", "edit:contact"), inlineButton("🏷 Tags", "edit:tags")],
      [inlineButton("✅ Done", "edit:done")],
    ]),
  };
}

composer.callbackQuery("edit:referral", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "editing";
  const menu = editMenu(ctx);
  await ctx.editMessageText(menu.text, { reply_markup: menu.reply_markup });
});

composer.callbackQuery("edit:done", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "previewing";
  ctx.session.editingField = undefined;

  const name = ctx.session.referralName ?? "";
  const description = ctx.session.referralDescription ?? "";
  const contact = ctx.session.referralContact ?? "";
  const tags = ctx.session.referralTags ?? "";

  let text = "📋 Referral preview\n\n";
  text += `👤 ${name}\n`;
  text += `${description}\n`;
  if (contact) text += `📞 ${contact}\n`;
  if (tags) text += `🏷 ${tags}`;

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("✅ Confirm", "confirm:referral"), inlineButton("✏️ Edit", "edit:referral")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

const FIELD_PROMPTS: Record<string, { prompt: string; placeholder: string }> = {
  name: { prompt: "Enter the new candidate name:", placeholder: "Type the name…" },
  description: { prompt: "Enter the new description:", placeholder: "Type the description…" },
  contact: { prompt: "Enter new contact info (or tap Skip):", placeholder: "Type contact info…" },
  tags: { prompt: "Enter new tags (or tap Skip):", placeholder: "Type tags…" },
};

for (const [field, { prompt, placeholder }] of Object.entries(FIELD_PROMPTS)) {
  composer.callbackQuery(`edit:${field}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = "editing_field";
    ctx.session.editingField = field;
    await ctx.reply(prompt, {
      reply_markup: { force_reply: true, input_field_placeholder: placeholder },
    });
  });
}

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "editing_field") return next();

  const field = ctx.session.editingField;
  if (!field) return next();

  const text = ctx.message.text.trim();
  const fieldMap: Record<string, keyof Pick<Ctx["session"], "referralName" | "referralDescription" | "referralContact" | "referralTags">> = {
    name: "referralName",
    description: "referralDescription",
    contact: "referralContact",
    tags: "referralTags",
  };

  const sessionKey = fieldMap[field];
  if (sessionKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx.session as any)[sessionKey] = text === "Skip" ? "" : text;
  }

  ctx.session.step = "editing";
  ctx.session.editingField = undefined;
  const menu = editMenu(ctx);
  await ctx.reply(menu.text, { reply_markup: menu.reply_markup });
});

export default composer;
