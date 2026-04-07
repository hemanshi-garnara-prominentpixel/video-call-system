import { ConnectClient } from "@aws-sdk/client-connect";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import envConfig from "./env";

const region = envConfig.aws.region;

export const connectClient = new ConnectClient({
  region,
});

const dynamoClient = new DynamoDBClient({
  region,
});

export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);