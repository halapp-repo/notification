import { inject, injectable } from "tsyringe";
import { OrganizationVM } from "@halapp/common";
import { LambdaStore } from "./lambda-store";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { plainToInstance } from "class-transformer";

@injectable()
export default class OrganizationRepository {
  constructor(
    @inject("LambdaStore")
    private lambdaStore: LambdaStore
  ) {}
  async fetch(organizationId: string): Promise<OrganizationVM> {
    const { Payload } = await this.lambdaStore.lambdaClient.send(
      new InvokeCommand({
        InvocationType: "RequestResponse",
        FunctionName: process.env["LAMBDAAccountGetOrganizationHandler"],
        Payload: Buffer.from(
          JSON.stringify({ OrganizationId: organizationId }),
          "utf-8"
        ),
      })
    );
    if (!Payload) {
      throw new Error("No Organization found");
    }
    const result = JSON.parse(Buffer.from(Payload).toString());

    return plainToInstance(OrganizationVM, <any>JSON.parse(result.body));
  }
}
