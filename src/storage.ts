import { MemorySessionStorage } from "./toolkit/index.js";
import type { StorageAdapter } from "grammy";

export interface ReferralSubmission {
  id: number;
  candidateName: string;
  description: string;
  contact: string;
  tags: string;
  timestamp: string;
  author: number;
}

export interface DestinationConfig {
  chatId: string;
  lastUpdated: string;
}

export interface ReferralTemplate {
  templateText: string;
  version: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStorage<T = any>(): StorageAdapter<T> {
  return new MemorySessionStorage<T>();
}

export class DestinationStore {
  private storage = makeStorage<DestinationConfig>();
  private key = "destination:primary";

  async get(): Promise<DestinationConfig | undefined> {
    return this.storage.read(this.key);
  }

  async set(chatId: string): Promise<void> {
    await this.storage.write(this.key, {
      chatId,
      lastUpdated: new Date().toISOString(),
    });
  }

  async isConfigured(): Promise<boolean> {
    return (await this.storage.read(this.key)) !== undefined;
  }
}

export class TemplateStore {
  private storage = makeStorage<ReferralTemplate>();
  private key = "template:current";

  async get(): Promise<ReferralTemplate> {
    const existing = await this.storage.read(this.key);
    if (existing) return existing;
    const defaultTemplate: ReferralTemplate = {
      templateText:
        "📢 New Referral\n\n" +
        "👤 {name}\n" +
        "{description}\n\n" +
        "📞 {contact}\n" +
        "🏷 {tags}",
      version: 1,
    };
    await this.storage.write(this.key, defaultTemplate);
    return defaultTemplate;
  }

  async set(templateText: string): Promise<void> {
    const existing = await this.get();
    await this.storage.write(this.key, {
      templateText,
      version: existing.version + 1,
    });
  }
}

export class ReferralsStore {
  private referralStorage = makeStorage<ReferralSubmission>();
  private indexStorage = makeStorage<number[]>();
  private counterStorage = makeStorage<number>();

  async getAll(): Promise<ReferralSubmission[]> {
    const ids = await this.indexStorage.read("referrals:ids");
    if (!ids || !Array.isArray(ids)) return [];
    const referrals: ReferralSubmission[] = [];
    for (const id of ids) {
      const ref = await this.referralStorage.read(`referral:${id}`);
      if (ref) referrals.push(ref);
    }
    return referrals;
  }

  async add(submission: Omit<ReferralSubmission, "id">): Promise<ReferralSubmission> {
    const counter = (await this.counterStorage.read("referrals:counter")) ?? 0;
    const id = counter + 1;
    await this.counterStorage.write("referrals:counter", id);

    const existingIds = (await this.indexStorage.read("referrals:ids")) ?? [];
    existingIds.push(id);
    await this.indexStorage.write("referrals:ids", existingIds);

    const referral: ReferralSubmission = { ...submission, id };
    await this.referralStorage.write(`referral:${id}`, referral);
    return referral;
  }

  async get(id: number): Promise<ReferralSubmission | undefined> {
    return this.referralStorage.read(`referral:${id}`);
  }

  async count(): Promise<number> {
    const ids = (await this.indexStorage.read("referrals:ids")) ?? [];
    return ids.length;
  }
}

export const destinationStore = new DestinationStore();
export const templateStore = new TemplateStore();
export const referralsStore = new ReferralsStore();
