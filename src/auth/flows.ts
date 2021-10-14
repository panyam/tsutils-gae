import { UserStore, IdentityStore } from "./datastore";
import { AuthFlow, Identity } from "./models";
import { AuthFlowCallback } from "./types";

export function loginAuthFlow(userStore: UserStore, identityStore: IdentityStore): AuthFlowCallback {
  return async function (authFlow: AuthFlow, req: any, res: any, next: any): Promise<void> {
    // See if we have a channel
    console.log("Channel:" + req.currChannel);
    // Assert we have an identity verified by the channel
    let identity: Identity | null = null;
    if (req.currChannel.hasIdentity()) {
      identity = await identityStore.getIdentityByKey(req.currChannel.identityKey);
    }
    if (!identity) {
      throw new Error("Channel does not point to a valid identity");
    }
    if (!req.session.loggedInUser) {
      const [user, newCreated] = await datastore.ensureUser(req.currChannel);
      req.session.loggedInUser = user;
      console.log(`Ensured User for channel (newCreated: ${newCreated}): `, user);
    } else {
      // What if user is already logged in?
    }
    res.redirect(authFlow.handlerParams["callbackURL"] || "/");
  };
}

export function registerAuthFlow(): AuthFlowCallback {
  return (authFlow: AuthFlow, req: any, res: any, next: any): void => {
    // See if we have a channel
    res.redirect(authFlow.handlerParams["callbackURL"] || "/");
  };
}
