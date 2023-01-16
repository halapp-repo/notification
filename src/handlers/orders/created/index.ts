import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { plainToInstance } from "class-transformer";
import { OrderVM } from "@halapp/common";
import { diContainer } from "../../../core/di-registry";
import { SESService } from "../../../services/ses.service";
import InventoryRepository from "../../../repositories/inventory.repository";
import OrganizationRepository from "../../../repositories/organization.repository";

export async function handler(event: SQSEvent) {
  const sesService = diContainer.resolve(SESService);
  const inventoryRepository = diContainer.resolve(InventoryRepository);
  const organizationRepository = diContainer.resolve(OrganizationRepository);
  const inventories = await inventoryRepository.fetchAll();
  console.log(JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const { body } = record;
    const rawMessage = JSON.parse(body) as SNSMessage;
    // Add Record to Signup DB
    console.log(rawMessage.Message);
    const order = plainToInstance(OrderVM, JSON.parse(rawMessage.Message));
    const organization = await organizationRepository.fetch(
      order.OrganizationId
    );
    await sesService.sendNewOrderCreatedEmail({
      order,
      inventories,
      organization,
    });
  }
}
