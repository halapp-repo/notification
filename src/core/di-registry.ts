import { container } from "tsyringe";
import InventoryRepository from "../repositories/inventory.repository";
import { LambdaStore } from "../repositories/lambda-store";
import OrganizationRepository from "../repositories/organization.repository";
import { S3Store } from "../repositories/s3-store";
import { SESStore } from "../repositories/ses-store";
import { SESService } from "../services/ses.service";

container.registerSingleton<S3Store>("S3Store", S3Store);
container.registerSingleton<SESStore>("SESStore", SESStore);
container.registerSingleton<LambdaStore>("LambdaStore", LambdaStore);
container.register("SESService", {
  useClass: SESService,
});
container.register("InventoryRepository", {
  useClass: InventoryRepository,
});
container.register("OrganizationRepository", {
  useClass: OrganizationRepository,
});

export const diContainer = container;
