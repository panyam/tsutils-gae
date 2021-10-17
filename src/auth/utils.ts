import * as TSU from "@panyam/tsutils";
import { AuthFlowStore, ChannelStore, IdentityStore } from "./datastore";
import { AuthFlow, Channel, Identity } from "./models";
import * as express from "express";

type Request = any;
type Response = any;
type RequestHandler = (req: Request, res: Response, next: any) => void;
export type AuthFlowCallback = (authFlow: AuthFlow, req: Request, res: Response, next: any) => Promise<void>;

const wrapAsync =
  (fn: any) =>
  (...args: any[]) =>
    Promise.resolve(fn(...args)).catch(args[2]);

/**
 * Redirects users to login screen of they are not logged in
 * @param req Request object
 * @param res Response object
 * @param next next function
 */
export function ensureLogin(config?: any): RequestHandler {
  config = config || {};
  const redirectURL: (req: Request) => string | string = config.redirectURL || null;
  const userParamName = config.userParamName || "loggedInUser";
  return wrapAsync(async (req: Request, res: Response, next: any) => {
    if (!req.session[userParamName]) {
      // Redirect to a login if user not logged in
      let redirUrl = `/${config.redirectURLPrefix || "auth"}/login?callbackURL=${encodeURIComponent(req.originalUrl)}`;
      if (redirectURL) {
        if (typeof redirectURL == "string") redirUrl = redirectURL;
        else redirUrl = redirectURL(req);
      }
      res.redirect(redirUrl);
    } else {
      next();
    }
  });
}

/**
 * Registers endpoints required for OAuth under a given router.
 */
export function registerOAuthRouter(
  authn: Authenticator,
  startPrefix = "/",
  successCallbackPrefix = "/callback",
  failureCallbackPrefix = "/fail",
): any {
  const router = express.Router();

  /*
   * Registers a starting endpoint for the auth.
   *
   * This is usually a get request that kicks off the auth.  This can also
   * be overridden to handle other reuqests (eg post requests).
   */
  router.get(startPrefix, wrapAsync(authn.startAuthFlow.bind(authn)));

  /**
   * Registers an endpoint for handling any processing of credentials either by the
   * user (eg username/password) or by auth providers (via success callbacks).
   */
  router.get(
    successCallbackPrefix,
    wrapAsync(async (req: Request, res: Response, next: any): Promise<void> => {
      if (authn.authFlowCredentialsReceived) {
        return await authn.authFlowCredentialsReceived(req, res, next);
      } else {
        // Not implemented
        res.sendStatus(501);
      }
    }),
    wrapAsync(async (req: Request, res: Response, next: any): Promise<void> => {
      // Successful authentication, redirect success.
      const authFlowId = req.query["state"].trim();
      const authFlow = await authn.authFlowStore.getAuthFlowById(authFlowId);

      // We are done with the AuthFlow so clean it up
      req.session.authFlowId = null;

      if (authFlow && authn.continueAuthFlow) {
        await authn.continueAuthFlow(authFlow, req, res, next);
      } else {
        res.redirect("/");
      }
    }),
  );

  /**
   * Registers the failure endpoint handler.
   */
  router.get(failureCallbackPrefix, (req: Request, res: Response, next: any) => {
    if (req.authFlowFailed) {
      res.send("Login Failed for Provider: " + authn.provider);
    } else {
      req.authFlowFailed(req, res, next);
    }
  });

  return router;
}

/*
export async function kickOffAuth(datastore: AuthFlowStore, authFlow: AuthFlow): Promise<string> {
  authFlow = await datastore.saveAuthFlow(authFlow);
  return `/auth/${authFlow.provider}/?authFlow=${authFlow.id}`;
}
*/

/**
 * A class that handles the multi step auth flow for verifying (and identifying) an identity.
 *
 * The general workflow is as follows:
 *
 * 1. A user tries to access a resource at url ResourceUrl
 * 2. The request handler for ResourceUrl decides user is either not authenticated or not authorized
 *    - A user can be logged in but may require a different Agent or Role to be handy to authorize access.
 *    - The Authorizer will be redirected to at this point - getAuthorizer(ResourceUrl).startAuth(this);
 * 3. The Authorizer here may perform the auth without any control of "us".
 * 4. If Auth fails, the Authorizer will call back our failure endpoint.
 * 5. If AUth succeeds, the Authorizer will call our callback endpoint;
 */
/**
 *
 * General flow goes as follows:
 *
 * 1. User Visits  /xyz
 * 2. Request handler for /xyz kicks off an auth if not logged in (more in step 10).
 * 3. Handler(/xyz) redirects to /auth/login?callbackURL=<callbackURL>
 * 4. User selects one of the login types /auth/<provider>/login?callbackURL=<callbackURL>
 * 5. Login handler creates a new authFlow instance and saves it in the
 *    session.  This will be used later.  In (3) instead of a callbackURL
 *    an authFlow can also be provided in which a new AuthFlow wont be
 *    created.
 * 6. Here passport forwards off to the provider login callback to
 *    perform all manner of logins.
 * 7. After login is completed the callback URL is called with credentials
 *    (or failures in which case failure redirect is called).
 * 8. Here continueAuthFlow is called with a successful auth flow.
 * 9. Here we have the chance to handle the channel that was created
 *      - saved as req.currChannel
 * 10. Now is a chance to create req.loggedInUser so it is available for
 *     other requests going forward.
 */
export class Authenticator {
  authFlowStore: AuthFlowStore;
  channelStore: ChannelStore;
  identityStore: IdentityStore;
  handlerFactory: TSU.StringMap<AuthFlowCallback> = {};

  /**
   * Step 1. This kicks off the actual auth where credentials can be
   * extracted from the user.
   */
  authFlowStarted?: AuthFlowCallback;

  /**
   * Step 2.  Once the auth flow is started (eg via a redirect to the provider),
   * the provider can either redirect to the callback URL (or the user can submit
   * credentials resulting in a post to this handler).  This gives us a chance to
   * verify the credentials (and the caller/provider) and redirect success or
   * failure as necessary.
   */
  authFlowCredentialsReceived?: (req: Request, res: Response, next: any) => Promise<void>;

  /**
   * Step 3. If credential verification was a success then the provider returns
   * valid tokens and profile information for us to use/extract.  This method
   * allows us to extract the channel and identity information from this payload.
   * This channel ID could be just the user's identity ID too (email, phone etc).
   */
  identityFromProfile: (profile: any) => [channelId: string, identityType: string, identityKey: string];

  /**
   * Step 4. In the previous step the channel and identity information that is
   * extracted can be processed here by creating new User objects or associating
   * with existing User objects as is fit within the logic of the application.
   */
  ensuredIdentity?: (channel: Channel, identity: Identity) => Promise<void>;

  /**
   * Step 5. Finally after all auth is complete and successful, the continueAuthFlow
   * callback allows the user to resume the original purpose of the auth flow.
   * If this method is not provided then a simple redirect to "/" is performed.
   */
  continueAuthFlow?: (authFlow: AuthFlow, req: any, res: any, next: any) => Promise<void>;

  constructor(public readonly provider: string, public scope: string[] = ["email"]) {}

  async startAuthFlow(req: Request, res: Response, next: any): Promise<void> {
    const authFlowId = req.query["authFlow"] || null;
    const callbackURL = req.query["callbackURL"] || "/";
    const authFlow = await this.ensureAuthFlow(authFlowId, callbackURL);
    if (authFlow == null) {
      // Invalid request as auth session is invalid or
      // does not match provider
      res.sendStatus(403);
    } else {
      // Save the auth flow so we can associate all requests together
      req.session.authFlowId = authFlow.id;

      // Kick off an auth we can have different kinds of auth
      if (this.authFlowStarted) {
        await this.authFlowStarted(authFlow, req, res, next);
      } else {
        // Not implemented
        res.sendStatus(501);
      }
    }
  }

  /**
   * Method called after a successful auth.
   *
   * Here a channel is created along from the succeeded auth flow and is an
   * opportunity to extract identities and create users from this flow.
   *
   * This method is called after authFlowCredentialsReceived by the entity
   * verifying the auth flow credentials.
   */
  async authFlowVerified(
    req: Request,
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: any,
  ): Promise<void> {
    try {
      console.log("Verify Callback, Profile: ", req, profile, params);
      // the ID here is specific to what is returned by the channel provider
      const [channelId, identityType, identityKey] = this.identityFromProfile(profile);
      // const authFlow = await datastore.getAuthFlowById(authFlowId);
      // TODO - Use the authFlow.purpose to ensure loginUser is not lost
      // ensure channel is created
      const [identity] = await this.identityStore.ensureIdentity(identityType, identityKey);

      const [channel] = await this.channelStore.ensureChannel(profile.provider, channelId, {
        credentials: {
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        expiresIn: params["expires_in"] || 0,
        profile: profile,
        identityKey: identity.key,
      });
      if (!channel.hasIdentity) {
        channel.identityKey = identity.key;
        await this.channelStore.saveChannel(channel);
      }

      if (this.ensuredIdentity) {
        await this.ensuredIdentity(channel, identity);
      }

      // Now ensure we also ensure an Identity entry here
      return done(null, channel);
    } catch (err) {
      return done(err, null);
    }
  }

  /**
   * Ensures that an auth flow exists and that it matches that for this
   * given provider.
   */
  async ensureAuthFlow(authFlowId: string | null = null, callbackURL = "/"): Promise<AuthFlow | null> {
    let authFlow: null | AuthFlow = null;
    if (authFlowId == null) {
      // create a new session if it was not provided
      authFlow = await this.authFlowStore.saveAuthFlow(
        new AuthFlow({
          provider: this.provider,
          handlerName: "login",
          handlerParams: { callbackURL: callbackURL },
        }),
      );
    } else {
      authFlow = await this.authFlowStore.getAuthFlowById(authFlowId);
    }
    if (authFlow == null || authFlow.provider != this.provider) {
      return null;
    }
    // session.authFlowId = authFlow.id;
    return authFlow;
  }
}
