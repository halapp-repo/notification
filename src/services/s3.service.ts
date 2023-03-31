import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import { SESStore } from "../repositories/ses-store";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Store } from "../repositories/s3-store";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  OrderVM,
  InventoryVM,
  OrganizationVM,
  ExtraChargeType,
} from "@halapp/common";
import { trMoment } from "../utils/timezone";
import { OrderToOrderEmailMessageMapper } from "../mappers/order-to-order-email-message.mapper";

@injectable()
export class S3Service {
  s3BucketName: string;
  // constructor
  constructor(
    @inject("S3Store")
    private s3Store: S3Store
  ) {
    const { S3BucketName } = process.env;
    if (!S3BucketName) {
      throw new Error("S3Bucket must come from env");
    }
    this.s3BucketName = S3BucketName;
  }
  async getObject(keyName: string): Promise<string> {
    const { Body } = await this.s3Store.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: keyName,
      })
    );
    // Convert the ReadableStream to a string.
    const fileStr: string | undefined = await Body?.transformToString();
    if (!fileStr) {
      throw new Error("fileStr is undefined");
    }
    return fileStr;
  }
}
