export interface BuildConfig {
  readonly AccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;
  // SNS
  readonly SNSOrderCreatedTopic: string;
  // S3
  readonly S3OrderCreatedEmailTemplate: string;
}
