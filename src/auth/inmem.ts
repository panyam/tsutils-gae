import * as TSU from "@panyam/tsutils";
import { UserStore as UserDSInterface } from "./datastore";
import { ChannelStore as ChannelDSInterface } from "./datastore";
import { IdentityStore as IdentityDSInterface } from "./datastore";
import { AuthFlowStore as AuthFlowDSInterface } from "./datastore";
import { AuthFlow, Channel, Identity, User } from "./models";

abstract class BaseDatastore<T> {
  entitiesByKey: TSU.StringMap<T> = {};
  allEntities: T[] = [];
  getByKey(key: string): T | null {
    return this.entitiesByKey[key] || null;
  }

  deleteByKey(key: string): boolean {
    delete this.entitiesByKey[key];
    for (let i = 0; i < this.allEntities.length; i++) {
      if (this.getEntityKey(this.allEntities[i]) == key) {
        this.allEntities.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  listEntities(offset = 0, count = 100): T[] {
    return this.allEntities.slice(offset, offset + count);
  }

  abstract getEntityKey(entity: T): string | null;
  abstract setEntityKey(entity: T, key: string): void;

  static idCounter = 0;
  newKey(): string {
    return "" + ++BaseDatastore.idCounter;
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  saveEntity(entity: T): T {
    let key = this.getEntityKey(entity);
    if (!key) {
      key = this.newKey();
      // new entity - so create it
      this.setEntityKey(entity, key);
    }
    this.entitiesByKey[key] = entity;
    let updated = false;
    for (let i = 0; i < this.allEntities.length; i++) {
      if (this.getEntityKey(this.allEntities[i]) == key) {
        this.allEntities[i] = entity;
        updated = true;
        break;
      }
    }
    if (!updated) {
      this.allEntities.push(entity);
    }

    // try getting it to verify
    return entity;
  }
}

export class AuthFlowStore extends BaseDatastore<AuthFlow> implements AuthFlowDSInterface {
  async getAuthFlowById(authFlowId: string): Promise<AuthFlow | null> {
    return this.getByKey(authFlowId);
  }

  async deleteAuthFlowById(authFlowId: string): Promise<boolean> {
    return this.deleteByKey(authFlowId);
  }

  /**
   * Returns the key of a given entity.
   */
  getEntityKey(entity: AuthFlow): string | null {
    return entity.hasKey ? entity.id : null;
  }

  setEntityKey(entity: AuthFlow, key: string): void {
    entity.id = key;
  }

  async saveAuthFlow(authFlow?: AuthFlow): Promise<AuthFlow> {
    return this.saveEntity(authFlow || new AuthFlow());
  }
}

export class UserStore extends BaseDatastore<User> implements UserDSInterface {
  async getUsers(offset = 0, count = 100): Promise<User[]> {
    return this.listEntities(offset, count);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.getByKey(userId);
  }

  async saveUser(user?: User): Promise<User> {
    return this.saveEntity(user || new User());
  }

  /**
   * Returns the key of a given entity.
   */
  getEntityKey(entity: User): string | null {
    return entity.hasKey ? entity.id : null;
  }

  setEntityKey(entity: User, key: string): void {
    entity.id = key;
  }
}

export class ChannelStore extends BaseDatastore<Channel> implements ChannelDSInterface {
  async getChannel(provider: string, loginId: string): Promise<Channel | null> {
    const key = provider + ":" + loginId;
    return this.getChannelByKey(key);
  }

  async getChannelByKey(key: string): Promise<Channel | null> {
    return this.getByKey(key);
  }

  /**
   * Returns the key of a given entity.
   */
  getEntityKey(entity: Channel): string | null {
    return entity.hasKey ? entity.key : null;
  }

  setEntityKey(entity: Channel, key: string): void {
    throw new Error(`Cannot set entity key for Channel`);
  }

  newKey(): string {
    throw new Error("Cannot auto create key for Channel");
  }

  async saveChannel(channel: Channel): Promise<Channel> {
    return this.saveEntity(channel);
  }

  async ensureChannel(provider: string, loginId: string, params?: any): Promise<[Channel, boolean]> {
    // get channel if exists
    // See if a channel exist - create if it does not
    let channel: Channel | null = await this.getChannel(provider, loginId);
    const newCreated = channel == null;
    if (channel == null) {
      channel = new Channel(params);
      channel.provider = provider;
      channel.loginId = loginId;
      channel.createdAt = Date.now();
    }
    channel.credentials = params.credentials;
    channel.profile = params.profile;
    channel = await this.saveChannel(channel);
    return [channel, newCreated];
  }
}

export class IdentityStore extends BaseDatastore<Identity> implements IdentityDSInterface {
  async getIdentity(identityType: string, identityKey: string): Promise<Identity | null> {
    const key = identityType + ":" + identityKey;
    return this.getIdentityByKey(key);
  }

  async getIdentityByKey(key: string): Promise<Identity | null> {
    return this.getByKey(key);
  }

  /**
   * Returns the key of a given entity.
   */
  getEntityKey(entity: Identity): string | null {
    return entity.hasKey ? entity.key : null;
  }

  setEntityKey(entity: Identity, key: string): void {
    throw new Error(`Cannot set entity key for Identity`);
  }

  newKey(): string {
    throw new Error("Cannot auto create key for Identity");
  }

  async saveIdentity(channel: Identity): Promise<Identity> {
    return this.saveEntity(channel);
  }

  async ensureIdentity(identityType: string, identityKey: string, params?: any): Promise<[Identity, boolean]> {
    // get channel if exists
    // See if a channel exist - create if it does not
    let channel: Identity | null = await this.getIdentity(identityType, identityKey);
    const newCreated = channel == null;
    if (channel == null) {
      channel = new Identity(params);
      channel.identityType = identityType;
      channel.identityKey = identityKey;
      channel.createdAt = Date.now();
    }
    channel = await this.saveIdentity(channel);
    return [channel, newCreated];
  }
}
