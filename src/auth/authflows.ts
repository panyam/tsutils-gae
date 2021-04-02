import TSU from "@panyam/tsutils";
import express = require("express");
import { Datastore } from "./datastore";
import { AuthFlow } from "./models";
import { AuthFlowCallback } from "./types";

export function initAuth2App(app: express.Application): void {
  const authFlows = {} as TSU.StringMap<AuthFlowCallback>;
  app.set("authFlows", authFlows);
  authFlows["login"] = loginAuthFlowHandler;
  authFlows["redirect"] = redirectAuthFlowHandler;
}

async function loginAuthFlowHandler(authFlow: AuthFlow, req: any, res: any, next: any): Promise<void> {
  // See if we have a channel
  const datastore = Datastore.getInstance();
  console.log("Channel:" + req.currChannel);
  if (!req.session.loggedInUser) {
    const [user, newCreated] = await datastore.ensureUser(req.currChannel);
    req.session.loggedInUser = user;
    console.log(`Ensured User for channel (newCreated: ${newCreated}): `, user);
  } else {
    // What if user is already logged in?
  }
  res.redirect(authFlow.handlerParams["callbackURL"] || "/");
}

function redirectAuthFlowHandler(authFlow: AuthFlow, req: any, res: any, next: any): void {
  // See if we have a channel
  res.redirect(authFlow.handlerParams["callbackURL"] || "/");
}
