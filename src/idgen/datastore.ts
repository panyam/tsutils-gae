import { Query } from "@google-cloud/datastore";
import { Datastore as BaseDatastore } from "../dal/datastore";
import { ID } from "./models";

export class Datastore extends BaseDatastore<ID> {
  readonly namespace: string;
  readonly generator: () => string;

  constructor(namespace: string, generator: () => string) {
    super();
    this.namespace = namespace;
    this.generator = generator;
  }

  get kind(): string {
    return "IDGen_" + this.namespace;
  }

  async nextID(ownerId: string, expiresAt = -1): Promise<ID> {
    let id = "";
    while (true) {
      id = this.generator();
      const query = this.gcds.createQuery(this.kind).filter("id", id);
      const results = await this.gcds.runQuery(query);
      if (!results || (results.length > 0 && results[0].length == 0)) break;
    }
    // Found one
    const res = new ID({
      id: id,
      ownerId: ownerId,
      expiresAt: expiresAt,
    });
    return await this.saveId(res);
  }

  createGetByKeyQuery(key: string): Query {
    return this.gcds.createQuery(this.kind).filter("id", key);
  }

  async getID(id: string): Promise<ID | null> {
    return this.getByKey(id);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.deleteByKey(id);
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveId(id: ID): Promise<ID> {
    // TODO - use an ID gen if id is not provided?
    const dbId = this.toDBValue(id);
    if (id.id.trim().length == 0) {
      throw new Error("ID objects must have a valid id");
    }
    if (id.ownerId.trim().length == 0) {
      throw new Error("IDs must have a valid ownerId");
    }
    const newKey = this.gcds.key([this.kind, id.id]);

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbId,
      excludeFromIndexes: [],
    });
    return id;
  }

  fromDBValue(dbId: any): ID {
    return new ID({
      id: dbId.id,
      ownerId: dbId.ownerId,
      createdAt: dbId.createdAt,
      updatedAt: dbId.updatedAt,
      expiresAt: dbId.expiresAt,
    });
  }

  toDBValue(id: ID): any {
    return {
      id: id.id,
      ownerId: id.ownerId,
      createdAt: id.createdAt,
      updatedAt: id.updatedAt,
      expiresAt: id.expiresAt,
    };
  }
}
