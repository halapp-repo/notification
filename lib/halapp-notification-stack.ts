import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import getConfig from "../config";
import { BuildConfig } from "./build-config";
import { LogLevel, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class HalappNotificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //*****************
    // BUILD CONFIG
    //******************
    const buildConfig = getConfig(scope as cdk.App);
    //************
    // IMPORT EMAIL TEMPLATE BUCKET
    //************
    const importedEmailTemplateBucket = s3.Bucket.fromBucketName(
      this,
      `imported-hal-email-template-${this.account}`,
      `hal-email-template-${this.account}`
    );
    // **************
    // CREATE SQS
    // ****************
    const orderSQS = this.createOrderQueue(buildConfig);
    // **************
    // CREATE LAMBDA
    // ****************
    const orderSQSHandler = this.createOrderSQSHandler(
      buildConfig,
      orderSQS,
      importedEmailTemplateBucket
    );
  }
  createOrderQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const orderCreatedDLQ = new sqs.Queue(this, "Notification-OrderDLQ", {
      queueName: "Notification-OrderDLQ",
      retentionPeriod: cdk.Duration.hours(10),
    });
    const orderQueue = new sqs.Queue(this, "Notification-OrderQueue", {
      queueName: "Notification-OrderQueue",
      visibilityTimeout: cdk.Duration.minutes(2),
      receiveMessageWaitTime: cdk.Duration.seconds(5),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: orderCreatedDLQ,
        maxReceiveCount: 4,
      },
    });
    orderQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("sns.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [orderQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:sns:*:*:${buildConfig.ORDER_SNSOrderTopic}`,
          },
        },
      })
    );
    const importedOrderTopic = sns.Topic.fromTopicArn(
      this,
      "NotificationImportedOrderTopic",
      `arn:aws:sns:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.ORDER_SNSOrderTopic}`
    );
    if (!importedOrderTopic) {
      throw new Error(
        "NotificationImportedOrderTopic needs to come from Order"
      );
    }
    importedOrderTopic.addSubscription(new subs.SqsSubscription(orderQueue));
    return orderQueue;
  }
  createOrderSQSHandler(
    buildConfig: BuildConfig,
    orderSQS: cdk.aws_sqs.Queue,
    importedEmailTemplateBucket: cdk.aws_s3.IBucket
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const orderCreatedHandler = new NodejsFunction(
      this,
      "Notification-SQSOrderHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "Notification-SQSOrderHandler",
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, `/../src/handlers/sqs/orders/index.ts`),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          S3BucketName: importedEmailTemplateBucket.bucketName,
          EmailTemplate: buildConfig.S3OrderCreatedEmailTemplate,
          SESFromEmail: buildConfig.SESFromEmail,
          SESCCEmail: buildConfig.SESCCEmail,
          LAMBDAAccountGetOrganizationHandler:
            buildConfig.LAMBDAAccountGetOrganizationHandler,
          LAMBDAListingGetInventoriesHandler:
            buildConfig.LAMBDAListingGetInventoriesHandler,
        },
      }
    );
    orderCreatedHandler.addEventSource(
      new SqsEventSource(orderSQS, {
        batchSize: 1,
      })
    );
    orderCreatedHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "lambda:InvokeFunction",
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );
    importedEmailTemplateBucket.grantRead(orderCreatedHandler);
    return orderCreatedHandler;
  }
}
