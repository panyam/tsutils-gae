import { AuthFlow } from "../models";
import { Authenticator } from "../utils";
const httpMocks = require("node-mocks-http");
import * as inmem from "../inmem";

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

async function simulateLogin(authenticator: Authenticator, credentials: any): Promise<void> {
  const results = {} as any;
  const req1 = httpMocks.createRequest({
    method: "GET",
    session: {},
    query: {
      callbackURL: "/hello/world",
    },
  });
  const res1 = httpMocks.createResponse();
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
}

describe("Login and Registration Integration Tests", () => {
  test("Basic Login", async () => {
    await simulateLogin(createAuthenticator(), {});
  });
});
