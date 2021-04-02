import { AuthFlow } from "./models";

export type AuthFlowCallback = (authFlow: AuthFlow, req: any, res: any, next: any) => void;
export type ProfileToIdFunc = (profile: any) => string;
