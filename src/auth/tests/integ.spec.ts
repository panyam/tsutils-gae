import { AuthFlow, Channel, Identity } from "../models";
import { Authenticator } from "../utils";
const httpMocks = require("node-mocks-http");
import * as inmem from "../inmem";

function newReq(config: any = {}) {
  return httpMocks.createRequest({
    method: "GET",
    session: {},
    query: {},
    ...config,
  });
}
const newRes = httpMocks.createResponse;

function createAuthenticator(config: any = {}): Authenticator {
  const authenticator = new Authenticator("provider", {
    scope: ["email", "name"],
    authFlowStore: new inmem.AuthFlowStore(),
    channelStore: new inmem.ChannelStore(),
    identityStore: new inmem.IdentityStore(),
    ...config,
  });
  return authenticator;
}

describe("Login and Registration Integration Tests", () => {
  test("Basic Login should call the callbacks", async () => {
    const authenticator = createAuthenticator();
    const credentials = {};
    const results = {} as any;
    const req1 = newReq({
      query: {
        callbackURL: "/hello/world",
      },
    });
    const res1 = newRes();
    let currAuthFlow: AuthFlow | null = null;
    authenticator.authFlowStarted = async (authFlow: AuthFlow, req: any, res: any, next: any) => {
      expect(req).toBe(req1);
      expect(res).toBe(res1);
      currAuthFlow = authFlow;
      results.credentials = credentials;
    };

    // Simple credential validation
    let credentialsVerified = false;
    authenticator.authFlowCredentialsReceived = async (req: any, res: any, next: any) => {
      expect(results.credentials).toBe(credentials);
      credentialsVerified = true;
    };

    const req2 = httpMocks.createRequest({
      method: "GET",
    });
    const res2 = httpMocks.createResponse();
    await authenticator.startAuthFlow(req1, res1, null);
    expect(currAuthFlow).not.toBe(null);
    await authenticator.handleAuthFlowCredentials(req2, res2, null);
    expect(credentialsVerified).toBe(true);

    const req3 = httpMocks.createRequest({
      method: "GET",
      session: {},
      query: {
        state: currAuthFlow!.id,
      },
    });
    const res3 = httpMocks.createResponse();
    await authenticator.authFlowCompleted(req3, res3, null);
    expect(res3.statusCode).toEqual(302);
    expect(res3._getRedirectUrl()).toEqual("/");
  });

  test("Should create Identity if does not exist", async () => {
    let currAuthFlow: AuthFlow | null = null;
    let currIdentity: Identity | null = new Identity();
    let currChannel: Channel | null = new Channel();
    const authenticator = createAuthenticator({
      authFlowStarted: async (authFlow: AuthFlow, req: any, res: any, next: any) => {
        currAuthFlow = authFlow;
      },
      identityFromProfile: (profile: any) => {
        return [profile.channelId, profile.type, profile.profileId];
      },
      ensuredIdentity: (channel: Channel, identity: Identity) => {
        currIdentity = identity;
        currChannel = channel;
      },
    });
    await authenticator.startAuthFlow(
      newReq({
        query: {
          callbackURL: "/hello/world",
        },
      }),
      newRes(),
      null,
    );
    await authenticator.handleAuthFlowCredentials(newReq(), newRes(), null);
    await authenticator.authFlowVerified(
      newReq(),
      { a: 1, b: 2, c: 3 },
      { expires_in: 10 },
      { channelId: "testchannel", type: "coolid", profileId: "test@world.com" },
    );
    await authenticator.authFlowCompleted(
      newReq({
        query: {
          state: currAuthFlow!.id,
        },
      }),
      newRes(),
      null,
    );
    expect(currChannel.credentials).toEqual({ a: 1, b: 2, c: 3 });
    expect(currChannel.provider).toEqual("provider");
    expect(currChannel.loginId).toEqual("testchannel");
    expect(currIdentity?.identityType).toEqual("coolid");
    expect(currIdentity?.identityKey).toEqual("test@world.com");
  });

  test("Should NOT create Identity if does exist", async () => {
    let currAuthFlow: AuthFlow | null = null;
    let currIdentity: Identity | null = new Identity();
    let currChannel: Channel | null = new Channel();
    const authenticator = createAuthenticator({
      authFlowStarted: async (authFlow: AuthFlow, req: any, res: any, next: any) => {
        currAuthFlow = authFlow;
      },
      identityFromProfile: (profile: any) => {
        return [profile.channelId, profile.type, profile.profileId];
      },
      ensuredIdentity: (channel: Channel, identity: Identity) => {
        currIdentity = identity;
        currChannel = channel;
      },
    });
    // creating preexisting identity so a new one isnt created
    const identity1: Identity = new Identity({
      identityType: "coolid",
      identityKey: "test@world.com",
    });
    const identity2: Identity = new Identity({
      identityType: "coolid",
      identityKey: "test@world.com",
    });
    expect(identity1).not.toBe(identity2); // sanity check address checks
    const identityStore = authenticator.identityStore as inmem.IdentityStore;
    authenticator.identityStore.saveIdentity(identity1);
    expect(identityStore.allEntities.length).toBe(1);

    // Start flows
    await authenticator.startAuthFlow(
      newReq({
        query: {
          callbackURL: "/hello/world",
        },
      }),
      newRes(),
      null,
    );
    await authenticator.handleAuthFlowCredentials(newReq(), newRes(), null);
    await authenticator.authFlowVerified(
      newReq(),
      { a: 1, b: 2, c: 3 },
      { expires_in: 10 },
      { channelId: "testchannel", type: "coolid", profileId: "test@world.com" },
    );
    await authenticator.authFlowCompleted(
      newReq({
        query: {
          state: currAuthFlow!.id,
        },
      }),
      newRes(),
      null,
    );
    expect(identityStore.allEntities.length).toBe(1);
    expect(currChannel.credentials).toEqual({ a: 1, b: 2, c: 3 });
    expect(currChannel.provider).toEqual("provider");
    expect(currChannel.loginId).toEqual("testchannel");
    expect(currChannel.identityKey).toEqual(identity1.key);
    expect(currIdentity).toBe(identity1);

    // Delete too
    identityStore.deleteByKey(identity1.key);
    expect(identityStore.allEntities.length).toBe(0);
    expect(identityStore.entitiesByKey).toEqual({});
  });
});
