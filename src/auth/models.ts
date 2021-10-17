import * as TSU from "@panyam/tsutils";

/**
 * An identify is a unique global "address" corresponding to a user.
 * For example the identify abc@example.com is a unique identify regardless
 * of which Channel is verifying it.  Multiple channels can verify the same
 * entity, eg open auth by github, FB or Google can verify the same email
 * address.
 */
export class Identity extends TSU.DAL.BaseEntity {
  // Type of identity being verified (eg email, phone etc).
  identityType: string;

  // The key specific to the identity (eg an email address or a phone number etc).
  //
  // type + key should be unique through out the system.
  identityKey: string;

  // The primary user that this identity can be associated with.
  // Identities do not need to be explicitly associted with a user especially
  // in systems where a single Identity can be used to front several users
  primaryUser: string;

  constructor(config?: any) {
    super((config = config || {}));
    this.identityType = config.identityType || "";
    this.identityKey = config.identityKey || "";
    this.primaryUser = config.primaryUser || "";
  }

  get hasUser(): boolean {
    return this.primaryUser.trim().length > 0;
  }

  get hasKey(): boolean {
    return this.identityType.trim().length > 0 && this.identityKey.trim().length > 0;
  }

  get key(): string {
    return this.identityType + ":" + this.identityKey;
  }
}

/**
 * Once a channel has verified an Identity, the end result is a mapping to
 * a local user object that is the entry for authenticated actions within
 * the system.  The User can also mean a user profile and can be extended
 * to be customized by the user of this library in their own specific app.
 */
export class User extends TSU.DAL.BaseEntity {
  // A globally unique user ID.  This User ID cannot be used as a login key.
  // Login's need to happen via the Identiites above and a username could be
  // one of the identities (which can be verified say via login/password mechanism)
  // Alternatively an email can be used as an identity that can also map to
  // a particular user.
  id: string;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}

export class AuthFlow extends TSU.DAL.BaseEntity {
  // A unique Auth Session ID
  id: string;

  // Kind of login being done
  provider: string;

  // When this Auth session expires;
  expiresIn: TSU.Timestamp;

  // Call back URL for where the session needs to endup on success
  // callback: CallbackRequest;

  // Handler that will continue the flow after a successful AuthFlow.
  handlerName: string;

  // Parameters for the handler to continue with.
  handlerParams: any;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.provider = config.provider || "";
    // this.callback = new CallbackRequest(config.callback || null);
    // Expires in 5 mins by default
    this.expiresIn = config.expiresIn || 300;
    this.handlerName = config.handlerName || "login";
    this.handlerParams = config.handlerParams || {};
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}

/**
 * Channel's represented federated verification objects.  For example a Google
 * Signin would ensure that the user that goes through this flow will end up with
 * a Google signin Channel - which would verify a particular identity type.
 */
export class Channel extends TSU.DAL.BaseEntity {
  provider: string;
  loginId: string;

  /**
   * Credentials for this channel (like access tokens, passwords etc).
   */
  credentials: any;

  /**
   * Profile as passed by the provider of the channel.
   */
  profile: any;

  /**
   * When does this channel expire and needs another login/auth.
   */
  expiresIn: TSU.Timestamp | null;

  // The identity that this channel is verifying.
  identityKey: string;

  constructor(config?: any) {
    super((config = config || {}));
    this.provider = config.provider || "";
    this.loginId = config.loginId || "";
    this.credentials = config.credentials || {};
    this.expiresIn = config.expiresIn || null;
    this.identityKey = config.identityKey || "";
  }

  get hasKey(): boolean {
    return this.provider.trim().length > 0 && this.loginId.trim().length > 0;
  }

  get key(): string {
    return this.provider + ":" + this.loginId;
  }

  get hasIdentity(): boolean {
    return this.identityKey.trim().length > 0;
  }
}

export class CallbackRequest {
  hostname: string;

  path: string;

  // Method to call the callback URL on
  method: string;

  // For POST/PUT methods
  rawBody: string;

  // Headers for this request
  headers: any;

  constructor(config: any) {
    config = config || {};
    this.hostname = config.hostname;
    this.path = config.path || "/";
    if (config.url && config.url.length > 0) {
      // parse hostnamea and path from url
      if (config.url.indexOf("://") < 0) {
        throw new Error("Invalid URL: " + config.url + ".  Please use hostname and path instead.");
      }
      const u = new URL(config.url);
      console.log("Parsed URL: ", u);
    }
    this.method = config.method || "GET";
    this.headers = config.headers || {};
    this.rawBody = config.rawBody || "";
  }

  get fullURL(): string {
    if (!this.hostname.endsWith("/") && !this.path.startsWith("/")) {
      return this.hostname + "/" + this.path;
    } else {
      return this.hostname + this.path;
    }
  }
}
