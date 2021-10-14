import { Datastore as GCDatastore, Query, Key } from "@google-cloud/datastore";

export abstract class Datastore<T> {
  protected gcds: GCDatastore;
  protected apiEndpoint: string;

  constructor(apiEndpoint = "") {
    this.apiEndpoint = apiEndpoint.trim();
    if (this.apiEndpoint.length == 0) {
      this.gcds = new GCDatastore();
    } else {
      this.gcds = new GCDatastore({
        apiEndpoint: this.apiEndpoint,
      });
    }
  }

  get autoCreateKey(): boolean {
    return true;
  }
  abstract get kind(): string;
  getEntityKey(entity: T): string | null {
    return null;
  }
  setEntityKey(entity: T, key: string): void {
    if (this.autoCreateKey) {
      throw new Error("setEntityKey must be set when keys can be auto created");
    }
  }
  abstract createGetByKeyQuery(key: string): Query;
  abstract fromDBValue(dbValue: any): T;
  abstract toDBValue(value: T): any;

  getIndexExcludes(entity: T): string[] {
    return [];
  }

  async getByKey(key: string): Promise<T | null> {
    const query = this.createGetByKeyQuery(key);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      return this.fromDBValue(results[0][0]);
    }
    return null;
  }

  async deleteByKey(key: string): Promise<boolean> {
    await this.gcds.delete({
      key: this.gcds.key([this.kind, key]),
    });
    return true;
  }

  async saveEntity(entity: T): Promise<T> {
    let dbValue = this.toDBValue(entity);
    let newKey = this.gcds.key(this.kind);
    const entityKey = this.getEntityKey(entity);
    if (!entityKey) {
      if (!this.autoCreateKey) {
        throw new Error(`Key cannot be autocreated for ${this.kind}`);
      } else {
        await this.gcds.save({
          key: newKey,
          data: dbValue,
        });
        if (!newKey.id) {
          throw new Error(`Key (${this.kind}) is invalid.  Save failed.`);
        }
        this.setEntityKey(entity, newKey.id);
        dbValue = this.toDBValue(entity);
      }
    } else if (this.autoCreateKey) {
      newKey.id = entityKey;
    } else {
      // key is already set
      newKey = this.gcds.key([this.kind, entityKey]);
    }

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbValue,
      excludeFromIndexes: this.getIndexExcludes(entity),
    });

    // TODO? try getting it to verify
    return entity;
  }

  async listEntities(offset = 0, count = 100): Promise<T[]> {
    let query = this.gcds.createQuery(this.kind);
    query = query.offset(offset);
    query = query.limit(count);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      return results[0].map(this.fromDBValue);
    }
    return [];
  }
}
