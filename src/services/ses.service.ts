import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import { SESStore } from "../repositories/ses-store";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { OrderVM, InventoryVM, OrganizationVM } from "@halapp/common";
import { OrderToOrderEmailMessageMapper } from "../mappers/order-to-order-email-message.mapper";
import { S3Service } from "./s3.service";

@injectable()
export class SESService {
  // properties
  fromAddress: string;
  ccAddress: string;
  s3BucketName: string;
  orderCreatedEmailTemplate: string;
  orderCanceledEmailTemplate: string;
  orderDeliveredEmailTemplate: string;
  // constructor
  constructor(
    @inject("SESStore")
    private sesStore: SESStore,
    @inject("S3Service")
    private s3Service: S3Service,
    @inject("OrderToOrderEmailMessageMapper")
    private mapper: OrderToOrderEmailMessageMapper
  ) {
    const {
      SESFromEmail,
      SESCCEmail,
      S3BucketName,
      OrderCreatedEmailTemplate,
      OrderCanceledEmailTemplate,
      OrderDeliveredEmailTemplate,
    } = process.env;
    if (!SESCCEmail) {
      throw new Error("SESCCEmail must come from env");
    }
    if (!SESFromEmail) {
      throw new Error("SESFromEmail must come from env");
    }
    if (!S3BucketName) {
      throw new Error("S3Bucket must come from env");
    }
    if (!OrderCreatedEmailTemplate) {
      throw new Error("OrderCreatedEmailTemplate must come from env");
    }
    if (!OrderCanceledEmailTemplate) {
      throw new Error("OrderCanceledEmailTemplate must come from env");
    }
    if (!OrderDeliveredEmailTemplate) {
      throw new Error("OrderDeliveredEmailTemplate must come from env");
    }
    this.fromAddress = SESFromEmail;
    this.ccAddress = SESCCEmail;
    this.s3BucketName = S3BucketName;
    this.orderCreatedEmailTemplate = OrderCreatedEmailTemplate;
    this.orderCanceledEmailTemplate = OrderCanceledEmailTemplate;
    this.orderDeliveredEmailTemplate = OrderDeliveredEmailTemplate;
  }
  async sendOrderCreatedEmail({
    order,
    inventories,
    organization,
  }: {
    order: OrderVM;
    inventories: InventoryVM[];
    organization: OrganizationVM;
  }): Promise<void> {
    const fileStr = await this.s3Service.getObject(
      this.orderCreatedEmailTemplate
    );

    const body = await ejs.render(
      fileStr,
      this.mapper.toDTO({
        ...order,
        Inventories: inventories,
        Organization: organization,
      })
    );
    const sesCommand = new SendEmailCommand({
      Destination: {
        CcAddresses: [this.ccAddress],
        ToAddresses: [organization.Email],
      },
      Message: {
        Body: {
          Html: {
            Data: body,
          },
        },
        Subject: {
          Data: `Sipariş Verildi (${organization.Name})`,
        },
      },
      Source: this.fromAddress,
    });
    await this.sesStore.sesClient.send(sesCommand);
    console.log("Order Created Message sent");
  }
  async sendOrderCanceledEmail({
    order,
    inventories,
    organization,
  }: {
    order: OrderVM;
    inventories: InventoryVM[];
    organization: OrganizationVM;
  }): Promise<void> {
    const fileStr = await this.s3Service.getObject(
      this.orderCanceledEmailTemplate
    );

    const body = await ejs.render(
      fileStr,
      this.mapper.toDTO({
        ...order,
        Inventories: inventories,
        Organization: organization,
      })
    );
    const sesCommand = new SendEmailCommand({
      Destination: {
        CcAddresses: [this.ccAddress],
        ToAddresses: [organization.Email],
      },
      Message: {
        Body: {
          Html: {
            Data: body,
          },
        },
        Subject: {
          Data: `Sipariş Iptal Edildi (${organization.Name})`,
        },
      },
      Source: this.fromAddress,
    });
    await this.sesStore.sesClient.send(sesCommand);
    console.log("Order Canceled Message sent");
  }
  async sendOrderDeliveredEmail({
    order,
    inventories,
    organization,
  }: {
    order: OrderVM;
    inventories: InventoryVM[];
    organization: OrganizationVM;
  }): Promise<void> {
    const fileStr = await this.s3Service.getObject(
      this.orderDeliveredEmailTemplate
    );

    const body = await ejs.render(
      fileStr,
      this.mapper.toDTO({
        ...order,
        Inventories: inventories,
        Organization: organization,
      })
    );
    const sesCommand = new SendEmailCommand({
      Destination: {
        CcAddresses: [this.ccAddress],
        ToAddresses: [organization.Email],
      },
      Message: {
        Body: {
          Html: {
            Data: body,
          },
        },
        Subject: {
          Data: `Sipariş Teslim Edildi (${organization.Name})`,
        },
      },
      Source: this.fromAddress,
    });
    await this.sesStore.sesClient.send(sesCommand);
    console.log("Order Delivered Message sent");
  }
}
