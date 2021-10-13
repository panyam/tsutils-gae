import { User, Channel, AuthFlow } from "./models";

export interface Datastore {
  getUsers(offset: number, count: number): Promise<User[]>;
  getChannelByKey(key: string): Promise<Channel | null>;
  getChannel(provider: string, loginId: string): Promise<Channel | null>;
  getUserByChannel(channelKey: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  getAuthFlowById(authFlowId: string): Promise<AuthFlow | null>;
  deleteAuthFlowById(authFlowId: string): Promise<boolean>;
  saveChannel(channel: Channel): Promise<Channel>;
  saveUser(user?: User): Promise<User>;
  /**
   * Creates a new auth session object to track a login request.
   */
  saveAuthFlow(authFlow?: AuthFlow): Promise<AuthFlow>;
  // Helper methods
  ensureChannel(provider: string, loginId: string, params?: any): Promise<[Channel, boolean]>;
  ensureUser(channel: Channel, userParams?: any): Promise<[User, boolean]>;
}
