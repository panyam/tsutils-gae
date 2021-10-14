import { AuthFlow, Channel, Identity, User } from "./models";

export interface UserStore {
  getUsers(offset: number, count: number): Promise<User[]>;
  getUserById(userId: string): Promise<User | null>;
  saveUser(user?: User): Promise<User>;
}

export interface ChannelStore {
  getChannelByKey(key: string): Promise<Channel | null>;
  getChannel(provider: string, loginId: string): Promise<Channel | null>;
  saveChannel(channel: Channel): Promise<Channel>;
  ensureChannel(provider: string, loginId: string, params?: any): Promise<[Channel, boolean]>;
}

export interface AuthFlowStore {
  getAuthFlowById(authFlowId: string): Promise<AuthFlow | null>;
  deleteAuthFlowById(authFlowId: string): Promise<boolean>;
  /**
   * Creates a new auth session object to track a login request.
   */
  saveAuthFlow(authFlow?: AuthFlow): Promise<AuthFlow>;
}

export interface IdentityStore {
  getIdentityByKey(key: string): Promise<Identity | null>;
  getIdentity(identityType: string, identityKey: string): Promise<Identity | null>;
  saveIdentity(identity: Identity): Promise<Identity>;
  ensureIdentity(identityType: string, identityKey: string, params?: any): Promise<[Identity, boolean]>;
}
