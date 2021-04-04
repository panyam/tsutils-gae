// Ensure the following are included
// "passport-facebook": "^3.0.0",
// "passport-github": "^1.1.0",
// "passport-google-oauth": "^2.0.0",
// "passport-local": "^1.0.0"
import express = require("express");
import { Channel } from "./models";
import { Datastore } from "./datastore";
import { defaultVerifyCallback, createProviderRouter } from "./utils";
const passport = require("passport");

const FacebookStrategy = require("passport-facebook").Strategy;
export function facebookAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new FacebookStrategy(
      {
        clientID: config.FACEBOOK.APP_ID,
        clientSecret: config.FACEBOOK.APP_SECRET,
        callbackURL: config.FACEBOOK.CALLBACK_URL,
        passReqToCallback: true,
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback({
        profileToId: (profile: any) => ((profile.emails || []).length > 0 ? profile.emails[0].value : profile.id),
      }),
    ),
  );

  return createProviderRouter("facebook", { scope: ["email"] });
}

const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
export function googleAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE.CLIENT_ID,
        clientSecret: config.GOOGLE.CLIENT_SECRET,
        callbackURL: config.GOOGLE.CALLBACK_URL,
        passReqToCallback: true,
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback({
        profileToId: (profile: any) => ((profile.emails || []).length > 0 ? profile.emails[0].value : profile.id),
      }),
    ),
  );

  return createProviderRouter("google", { scope: ["profile", "email"] });
}

const GithubStrategy = require("passport-github").Strategy;
export function githubAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new GithubStrategy(
      {
        clientID: config.GITHUB.CLIENT_ID,
        clientSecret: config.GITHUB.CLIENT_SECRET,
        callbackURL: config.GITHUB.CALLBACK_URL,
        passReqToCallback: true,
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback({
        profileToId: (profile: any) => {
          if (profile.username && profile.username.trim().length > 0) {
            return profile.username.trim();
          } else if ((profile.emails || []).length > 0) {
            return profile.emails[0].value;
          } else {
            return profile.id;
          }
        },
      }),
    ),
  );

  return createProviderRouter("github", { scope: ["email"] });
}

export function authRouter(config: any): any {
  /* GET login page. */
  // Setup passport's user ser/deser functions
  passport.serializeUser(function (user: any, done: any) {
    done(null, (user as Channel).key);
  });

  passport.deserializeUser(async function (channekKey: any, done: any) {
    const channel = await Datastore.getInstance().getChannelByKey(channekKey);
    done(null, channel);
  });

  const router = express.Router();
  router.use("/login(/)?", loginRouter(config));

  // Setup different Auths
  router.use("/github", githubAuthRouter(config, {}));

  router.use("/google", googleAuthRouter(config, {}));

  router.use("/facebook", facebookAuthRouter(config, {}));

  return router;
}

export function loginRouter(config: any): any {
  const router = express.Router();
  /* GET home page. */
  router.get("/", function (req: any, res: any, next: any) {
    const callbackURL = req.query["callbackURL"] || "/";
    // TODO - make this provided by client
    res.render("login/index.html", {
      h1: "Login",
      callbackURL: encodeURIComponent(callbackURL),
    });
  });
  return router;
}
