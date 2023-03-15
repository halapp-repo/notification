export interface BuildConfig {
  readonly AccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;
  // SNS
  readonly ORDER_SNSOrderTopic: string;
  // S3
  readonly S3OrderCreatedEmailTemplate: string;
  readonly S3OrderCanceledEmailTemplate: string;
  readonly S3OrderDeliveredEmailTemplate: string;
  // SES
  readonly SESFromEmail: string;
  readonly SESCCEmail: string;
  // LAMBDA
  readonly LAMBDAAccountGetOrganizationHandler: string;
  readonly LAMBDAListingGetInventoriesHandler: string;
}
