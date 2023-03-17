import { container } from "tsyringe";
import { OrderToOrderEmailMessageMapper } from "../mappers/order-to-order-email-message.mapper";
import InventoryRepository from "../repositories/inventory.repository";
import { LambdaStore } from "../repositories/lambda-store";
import OrganizationRepository from "../repositories/organization.repository";
import { S3Store } from "../repositories/s3-store";
import { SESStore } from "../repositories/ses-store";
import { S3Service } from "../services/s3.service";
import { SESService } from "../services/ses.service";

container.registerSingleton<S3Store>("S3Store", S3Store);
container.registerSingleton<SESStore>("SESStore", SESStore);
container.registerSingleton<LambdaStore>("LambdaStore", LambdaStore);
container.register("SESService", {
  useClass: SESService,
});
container.register("S3Service", {
  useClass: S3Service,
});
container.register("InventoryRepository", {
  useClass: InventoryRepository,
});
container.register("OrganizationRepository", {
  useClass: OrganizationRepository,
});
container.register("OrderToOrderEmailMessageMapper", {
  useClass: OrderToOrderEmailMessageMapper,
});

export const diContainer = container;
