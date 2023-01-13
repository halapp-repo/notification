import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";

export async function handler(event: SQSEvent) {
  console.log(JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const { body } = record;
    const rawMessage = JSON.parse(body) as SNSMessage;
    // Add Record to Signup DB
    console.log(rawMessage.Message);
    const message = JSON.parse(rawMessage.Message || "{}");

    const { OrderId } = message;
  }
}
