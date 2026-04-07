import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/aws";
import envConfig from "../config/env";

export class AppointmentService {
  private tableName: string;

  constructor() {
    this.tableName = envConfig.dynamo.tableName;
  }

  async getAppointmentById(appointmentId: string) {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          appointmentId: appointmentId,
        },
      });

      const response = await dynamoDocClient.send(command);
      
      if (response.Item) {
        console.log(`Found booking: ${JSON.stringify(response.Item)}`);
      } else {
        console.log(`No booking found for ID: ${appointmentId}`);
      }
      
      return response.Item;
    } catch (error) {
      console.error(`DynamoDB get error: ${error}`);
      return null;
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string) {
    try {
      const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          appointmentId: appointmentId,
        },
        UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":updatedAt": new Date().toISOString(),
        },
      });

      await dynamoDocClient.send(command);
      console.log(`Updated appointment ${appointmentId} status to ${status}`);
      return true;
    } catch (error) {
      console.error(`DynamoDB update error: ${error}`);
      return false;
    }
  }
}

export const appointmentService = new AppointmentService();
