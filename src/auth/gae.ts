import { Query } from "@google-cloud/datastore";
import { Datastore as BaseDatastore } from "../dal/datastore";
import { UserStore as UserDSInterface } from "./datastore";
import { ChannelStore as ChannelDSInterface } from "./datastore";
import { IdentityStore as IdentityDSInterface } from "./datastore";
import { AuthFlowStore as AuthFlowDSInterface } from "./datastore";
import { AuthFlow, Channel, Identity, User } from "./models";

export class AuthFlowStore extends BaseDatastore<AuthFlow> implements AuthFlowDSInterface {
  readonly kind = "AuthFlow";

  public static readonly INSTANCE: AuthFlowStore = new AuthFlowStore();

  async getAuthFlowById(authFlowId: string): Promise<AuthFlow | null> {
    return await this.getByKey(authFlowId);
  }

  createGetByKeyQuery(key: string): Query {
    return this.gcds.createQuery(this.kind).filter("id", key);
  }

  async deleteAuthFlowById(authFlowId: string): Promise<boolean> {
    return await this.deleteByKey(authFlowId);
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveAuthFlow(authFlow?: AuthFlow): Promise<AuthFlow> {
    return await this.saveEntity(authFlow || new AuthFlow());
  }

  getEntityKey(entity: AuthFlow): string {
    return entity.id;
  }
  setEntityKey(entity: AuthFlow, key: string): void {
    entity.id = key;
  }
  entityHasKey(entity: AuthFlow): boolean {
    return entity.hasKey;
  }

  fromDBValue(dbAuthFlow: any): AuthFlow {
    return new AuthFlow({
      id: dbAuthFlow.id,
      provider: dbAuthFlow.provider,
      handlerName: dbAuthFlow.handlerName,
      handlerParams: dbAuthFlow.handlerParams,
      expiresIn: dbAuthFlow.expiresIn,
    });
  }

  toDBValue(authFlow: AuthFlow): any {
    return {
      id: authFlow.id,
      provider: authFlow.provider,
      handlerName: authFlow.handlerName,
      handlerParams: authFlow.handlerParams,
      expiresIn: authFlow.expiresIn,
    };
  }
}

export class UserStore extends BaseDatastore<User> implements UserDSInterface {
  public static readonly INSTANCE: UserStore = new UserStore();

  readonly kind = "User";

  async getUsers(offset = 0, count = 100): Promise<User[]> {
    return await this.listEntities(offset, count);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.getByKey(userId);
  }

  createGetByKeyQuery(key: string): Query {
    return this.gcds.createQuery(this.kind).filter("id", key);
  }

  async saveUser(user?: User): Promise<User> {
    return await this.saveEntity(user || new User());
  }

  getIndexExcludes(entity: User): string[] {
    return ["profile"];
  }

  fromDBValue(dbUser: any): User {
    return new User({
      id: dbUser.id,
      profile: dbUser.profile,
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
  }

  /**
   * Override this to handle customer User types.
   */
  toDBValue(user: User): any {
    return {
      id: user.id,
      profile: user.profile,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getEntityKey(entity: User): string {
    return entity.id;
  }
  setEntityKey(entity: User, key: string): void {
    entity.id = key;
  }
  entityHasKey(entity: User): boolean {
    return entity.hasKey;
  }
}

export class ChannelStore extends BaseDatastore<Channel> implements ChannelDSInterface {
  public static readonly INSTANCE: ChannelStore = new ChannelStore();

  readonly kind = "Channel";

  get autoCreateKey(): boolean {
    return false;
  }
  getEntityKey(entity: Channel): string {
    return entity.key;
  }
  setEntityKey(entity: Channel, key: string): void {
    throw new Error(`Cannot set entity key for ${this.kind}`);
  }
  entityHasKey(entity: Channel): boolean {
    return entity.hasKey;
  }

  createGetByKeyQuery(key: string): Query {
    const [provider, loginId] = key.split(":");
    return this.gcds.createQuery(this.kind).filter("provider", provider).filter("loginId", loginId);
  }

  async getChannels(offset = 0, count = 100): Promise<Channel[]> {
    return await this.listEntities(offset, count);
  }

  async getChannel(provider: string, loginId: string): Promise<Channel | null> {
    const key = provider + ":" + loginId;
    return this.getChannelByKey(key);
  }

  async getChannelByKey(key: string): Promise<Channel | null> {
    return this.getByKey(key);
  }

  async saveChannel(channel: Channel): Promise<Channel> {
    return this.saveEntity(channel);
  }

  getIndexExcludes(entity: Channel): string[] {
    return ["profile"];
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

  fromDBValue(dbChannel: any): Channel {
    return new Channel({
      provider: dbChannel.provider,
      loginId: dbChannel.loginId,
      credentials: dbChannel.credentials,
      profile: dbChannel.profile,
      identityKey: dbChannel.identityKey,
      expiresIn: dbChannel.expiresIn,
      createdAt: dbChannel.createdAt,
      updatedAt: dbChannel.updatedAt,
      isActive: dbChannel.isActive,
    });
  }

  toDBValue(channel: Channel): any {
    return {
      provider: channel.provider,
      loginId: channel.loginId,
      credentials: channel.credentials,
      profile: channel.profile,
      identityKey: channel.identityKey,
      expiresIn: channel.expiresIn,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      isActive: channel.isActive,
    };
  }
}

export class IdentityStore extends BaseDatastore<Identity> implements IdentityDSInterface {
  public static readonly INSTANCE: IdentityStore = new IdentityStore();

  readonly kind = "Identity";
  get autoCreateKey(): boolean {
    return false;
  }
  getEntityKey(entity: Identity): string {
    return entity.key;
  }
  setEntityKey(entity: Identity, key: string): void {
    throw new Error(`Cannot set entity key for ${this.kind}`);
  }
  entityHasKey(entity: Identity): boolean {
    return entity.hasKey;
  }

  createGetByKeyQuery(key: string): Query {
    const [identityType, identityKey] = key.split(":");
    return this.gcds.createQuery(this.kind).filter("identityType", identityType).filter("identityKey", identityKey);
  }

  async getIdentities(offset = 0, count = 100): Promise<Identity[]> {
    return await this.listEntities(offset, count);
  }

  async getIdentity(identityType: string, identityKey: string): Promise<Identity | null> {
    const key = identityType + ":" + identityKey;
    return this.getIdentityByKey(key);
  }

  async getIdentityByKey(key: string): Promise<Identity | null> {
    return this.getByKey(key);
  }

  async saveIdentity(identity: Identity): Promise<Identity> {
    return this.saveEntity(identity);
  }

  async ensureIdentity(identityType: string, identityKey: string, params?: any): Promise<[Identity, boolean]> {
    // get identity if exists
    // See if a identity exist - create if it does not
    let identity: Identity | null = await this.getIdentity(identityType, identityKey);
    const newCreated = identity == null;
    if (identity == null) {
      identity = new Identity(params);
      identity.identityType = identityType;
      identity.identityKey = identityKey;
      identity.createdAt = Date.now();
    }
    identity = await this.saveIdentity(identity);
    return [identity, newCreated];
  }

  fromDBValue(dbIdentity: any): Identity {
    return new Identity({
      identityType: dbIdentity.identityType,
      identityKey: dbIdentity.identityKey,
      primaryUser: dbIdentity.primaryUser,
      createdAt: dbIdentity.createdAt,
      updatedAt: dbIdentity.updatedAt,
      isActive: dbIdentity.isActive,
    });
  }

  toDBValue(identity: Identity): any {
    return {
      identityType: identity.identityType,
      identityKey: identity.identityKey,
      primaryUser: identity.primaryUser,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      isActive: identity.isActive,
    };
  }
}

/*
export class Datastore extends BaseDatastore implements DSInterface {
  private static instance: Datastore = new Datastore();
  static getInstance(): Datastore {
    return Datastore.instance;
  }

  async getUserByChannel(channelKey: string): Promise<User | null> {
    const query = this.gcds.createQuery(USER_KIND).filter("channelKey", channelKey);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const user = results[0][0];
      return this.toUser(user);
    }
    return null;
  }

  async ensureUser(channel: Channel, userParams?: any): Promise<[User, boolean]> {
    userParams = userParams || {};
    let user = await this.getUserByChannel(channel.key);
    const newCreated = user == null;
    if (user == null) {
      user = new User(userParams);
      user.name = channel.profile.displayName || "";
      user.email = channel.profile?.emails[0]?.value || "";
      user.channelKey = channel.key;
      user = await this.saveUser(user);
    }
    return [user, newCreated];
  }
}
 */
