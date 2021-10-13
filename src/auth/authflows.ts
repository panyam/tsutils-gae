import { Datastore } from "./datastore";
import { AuthFlow } from "./models";
import { AuthFlowCallback } from "./types";

export function loginAuthFlow(datastore: Datastore): AuthFlowCallback {
  return async function (authFlow: AuthFlow, req: any, res: any, next: any): Promise<void> {
    // See if we have a channel
    console.log("Channel:" + req.currChannel);
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

export function registerAuthFlow(datastore: Datastore): AuthFlowCallback {
  return (authFlow: AuthFlow, req: any, res: any, next: any): void => {
    // See if we have a channel
    res.redirect(authFlow.handlerParams["callbackURL"] || "/");
  };
}
