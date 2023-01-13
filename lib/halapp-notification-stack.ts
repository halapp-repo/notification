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
    const orderCreatedSQS = this.createOrderCreatedQueue(buildConfig);
    // **************
    // CREATE LAMBDA
    // ****************
    const orderCreatedHandler = this.createOrderCreatedHandler(
      buildConfig,
      orderCreatedSQS,
      importedEmailTemplateBucket
    );
  }
  createOrderCreatedQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const orderCreatedDLQ = new sqs.Queue(
      this,
      "Notification-OrderCreatedDLQ",
      {
        queueName: "Notification-OrderCreatedDLQ",
        retentionPeriod: cdk.Duration.hours(10),
      }
    );
    const orderCreatedQueue = new sqs.Queue(
      this,
      "Notification-OrderCreatedQueue",
      {
        queueName: "Notification-OrderCreatedQueue",
        visibilityTimeout: cdk.Duration.minutes(2),
        retentionPeriod: cdk.Duration.days(1),
        deadLetterQueue: {
          queue: orderCreatedDLQ,
          maxReceiveCount: 4,
        },
      }
    );
    orderCreatedQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("sns.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [orderCreatedQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:sns:*:*:${buildConfig.SNSOrderCreatedTopic}`,
          },
        },
      })
    );
    const importedOrderCreatedTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedUserCreatedTopic",
      `arn:aws:sns:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.SNSOrderCreatedTopic}`
    );
    if (!importedOrderCreatedTopic) {
      throw new Error("importedOrderCreatedTopic needs to come from Order");
    }
    importedOrderCreatedTopic.addSubscription(
      new subs.SqsSubscription(orderCreatedQueue)
    );
    return orderCreatedQueue;
  }
  createOrderCreatedHandler(
    buildConfig: BuildConfig,
    orderCreatedSQS: cdk.aws_sqs.Queue,
    importedEmailTemplateBucket: cdk.aws_s3.IBucket
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const orderCreatedHandler = new NodejsFunction(
      this,
      "Notification-SQSOrderCreatedHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "Notification-SQSOrderCreatedHandler",
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, `/../src/handlers/orders/created/index.ts`),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          Region: buildConfig.Region,
          S3BucketName: importedEmailTemplateBucket.bucketName,
          EmailTemplate: buildConfig.S3OrderCreatedEmailTemplate,
        },
      }
    );
    orderCreatedHandler.addEventSource(
      new SqsEventSource(orderCreatedSQS, {
        batchSize: 1,
      })
    );
    orderCreatedHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );
    importedEmailTemplateBucket.grantRead(orderCreatedHandler);
    return orderCreatedHandler;
  }
}
