import { container } from "tsyringe";
import { S3Store } from "../repositories/s3-store";

container.registerSingleton<S3Store>("S3Store", S3Store);

export const diContainer = container;
