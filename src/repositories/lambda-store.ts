import { LambdaClient } from "@aws-sdk/client-lambda";
import { Store } from "./store";

export class LambdaStore implements Store {
  readonly lambdaClient: LambdaClient;

  constructor() {
    const { Region } = process.env;
    const lambdaClient = new LambdaClient({
      region: Region,
    });
    this.lambdaClient = lambdaClient;
  }
}
