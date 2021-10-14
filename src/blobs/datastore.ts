import { Query } from "@google-cloud/datastore";
import { Datastore as BaseDatastore } from "../dal/datastore";
import { Blob } from "./models";

export class Datastore extends BaseDatastore<Blob> {
  private static instance: Datastore = new Datastore();

  static getInstance(): Datastore {
    return Datastore.instance;
  }

  get kind(): string {
    return "Blobs";
  }

  createGetByKeyQuery(key: string): Query {
    return this.gcds.createQuery(this.kind).filter("id", key);
  }

  async getBlobById(blobId: string): Promise<Blob | null> {
    return await this.getByKey(blobId);
  }

  async deleteBlobById(blobId: string): Promise<boolean> {
    return await this.deleteByKey(blobId);
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveBlob(blob?: Blob): Promise<Blob> {
    // TODO - use an ID gen if id is not provided?
    blob = blob || new Blob();
    let dbBlob = this.toDBValue(blob);
    if (blob.parentType.trim().length == 0) {
      throw new Error("Blobs must have a valid parent type");
    }
    if (blob.parentId.trim().length == 0) {
      throw new Error("Blobs must have a valid parent ID");
    }
    if (blob.userId.trim().length == 0) {
      throw new Error("Blobs must have a valid userId");
    }
    let newKey = this.gcds.key(this.kind);
    if (!blob.hasKey) {
      await this.gcds.save({
        key: newKey,
        data: dbBlob,
        excludeFromIndexes: ["contents"],
      });
      if (!newKey.id) {
        throw new Error("Blob key is invalid.  Save failed.");
      }
      blob.id = newKey.id;
      dbBlob = this.toDBValue(blob);
    } else {
      newKey = this.gcds.key([this.kind, blob.id]);
    }

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbBlob,
      excludeFromIndexes: ["contents", "contents/main"],
    });
    return blob;
  }

  fromDBValue(dbBlob: any): Blob {
    return new Blob({
      id: dbBlob.id,
      parentType: dbBlob.parentType,
      parentId: dbBlob.parentId,
      userId: dbBlob.userId,
      contents: JSON.parse(dbBlob.contents),
    });
  }

  toDBValue(blob: Blob): any {
    return {
      id: blob.id,
      parentId: blob.parentId,
      parentType: blob.parentType,
      userId: blob.userId,
      contents: JSON.stringify(blob.contents),
    };
  }
}
