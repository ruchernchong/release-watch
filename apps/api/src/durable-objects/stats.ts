import { DurableObject } from "cloudflare:workers";

export class Stats extends DurableObject {
  async increment(key: string, amount = 1): Promise<number> {
    return await this.ctx.blockConcurrencyWhile(async () => {
      const current = (await this.ctx.storage.get<number>(key)) ?? 0;
      const newValue = current + amount;
      await this.ctx.storage.put(key, newValue);
      return newValue;
    });
  }

  async get(key: string): Promise<number> {
    return (await this.ctx.storage.get<number>(key)) ?? 0;
  }

  async getAll(): Promise<Record<string, number>> {
    const entries = await this.ctx.storage.list<number>();
    return Object.fromEntries(entries);
  }
}
