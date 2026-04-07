import dotenv from 'dotenv';

dotenv.config();

export const envConfig = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
  connect: {
    instanceId: process.env.CONNECT_INSTANCE_ID || '',
    videoFlowId: process.env.CONNECT_VIDEO_FLOW_ID || '',
    videoParticipantTimeout: parseInt(process.env.CONNECT_VIDEO_PARTICIPANT_TIMEOUT || '3600'),
  },
  dynamo: {
    tableName: process.env.DYNAMODB_TABLE_NAME || 'Appointments',
  },
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

const requiredEnvVars = [
  'CONNECT_INSTANCE_ID',
  'CONNECT_VIDEO_FLOW_ID',
  'AWS_REGION',
  'DYNAMODB_TABLE_NAME',
];

const missingVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export default envConfig;