import { AuthFlow } from "../models";
import { Authenticator } from "../utils";

describe("Login and Registration Integration Tests", () => {
  test("Basic Login", () => {
    const authenticator = new Authenticator(
      "facebook",
      "/auth/facebook",
      "/auth/facebook/callback/",
      "/auth/facebook/fail/",
      ["email", "name"],
    );
    authenticator.authFlowStarted = async (authFlow: AuthFlow, req: any, res: any, next: any) => {
      //
    };

    authenticator.authFlowCredentialsReceived = async (req: any, res: any, next: any) => {
      //
    };

    //
    const authFlow = authenticator.ensureAuthFlow();
    await authenticator.startAuthFlow(authFlow);
  });
});
