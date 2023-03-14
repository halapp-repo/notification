import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import { SESStore } from "../repositories/ses-store";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Store } from "../repositories/s3-store";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { OrderVM, InventoryVM, OrganizationVM } from "@halapp/common";
import { trMoment } from "../utils/timezone";

@injectable()
export class SESService {
  // properties
  fromAddress: string;
  ccAddress: string;
  s3BucketName: string;
  emailTemplate: string;
  // constructor
  constructor(
    @inject("SESStore")
    private sesStore: SESStore,
    @inject("S3Store")
    private s3Store: S3Store
  ) {
    const { SESFromEmail, SESCCEmail, S3BucketName, EmailTemplate } =
      process.env;
    if (!SESCCEmail) {
      throw new Error("SESCCEmail must come from env");
    }
    if (!SESFromEmail) {
      throw new Error("SESFromEmail must come from env");
    }
    if (!S3BucketName) {
      throw new Error("S3Bucket must come from env");
    }
    if (!EmailTemplate) {
      throw new Error("EmailTemplate must come from env");
    }
    this.fromAddress = SESFromEmail;
    this.ccAddress = SESCCEmail;
    this.s3BucketName = S3BucketName;
    this.emailTemplate = EmailTemplate;
  }
  async sendNewOrderCreatedEmail({
    order,
    inventories,
    organization,
  }: {
    order: OrderVM;
    inventories: InventoryVM[];
    organization: OrganizationVM;
  }): Promise<void> {
    const { Body } = await this.s3Store.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: this.emailTemplate,
      })
    );
    // Convert the ReadableStream to a string.
    const fileStr: string | undefined = await Body?.transformToString();
    if (!fileStr) {
      throw new Error("fileStr is undefined");
    }

    const body = await ejs.render(fileStr, {
      orderId: order.Id,
      orderUrl: `https://halapp.io/orders/${order.Id}`,
      createdDate: trMoment(order.CreatedDate).format("DD.MM.YYYY HH:mm"),
      organizationName: organization.Name,
      note: order.Note || "",
      address: {
        addressline: order.DeliveryAddress.AddressLine,
        county: order.DeliveryAddress.County,
        city: order.DeliveryAddress.City,
        zipcode: order.DeliveryAddress.ZipCode,
        country: order.DeliveryAddress.Country,
      },
      paymentType: order.PaymentMethodType,
      deliveryTime: trMoment(order.DeliveryTime).format("DD.MM.YYYY HH:mm"),
      totalPrice: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(
        order.Items.reduce((acc, curr) => {
          return acc + curr.Price * curr.Count;
        }, 0)
      ),
      deliveryPrice: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(0),
      items: order.Items.map((i) => ({
        name:
          inventories.find((inv) => inv.ProductId === i.ProductId)?.Name ||
          i.ProductId,
        count: i.Count,
        unit: i.Unit,
        price: new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
        }).format(i.Price),
        totalprice: new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
        }).format(i.Price * i.Count),
      })),
    });
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
    console.log("Message sent");
  }
}
