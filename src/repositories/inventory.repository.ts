import { inject, injectable } from "tsyringe";
import { InventoryVM } from "@halapp/common";
import { LambdaStore } from "./lambda-store";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { plainToInstance } from "class-transformer";
import { APIGatewayEvent } from "aws-lambda";

@injectable()
export default class InventoryRepository {
  constructor(
    @inject("LambdaStore")
    private lambdaStore: LambdaStore
  ) {}
  async fetchAll(): Promise<InventoryVM[]> {
    const { Payload } = await this.lambdaStore.lambdaClient.send(
      new InvokeCommand({
        InvocationType: "RequestResponse",
        FunctionName: process.env["LAMBDAListingGetInventoriesHandler"],
        Payload: Buffer.from(
          JSON.stringify({
            httpMethod: "GET",
          } as APIGatewayEvent),
          "utf-8"
        ),
      })
    );
    if (!Payload) {
      throw new Error("No Inventory found");
    }
    const result = JSON.parse(Buffer.from(Payload).toString());
    console.log(result);

    return plainToInstance(InventoryVM, <any[]>JSON.parse(result.body));
  }
}
