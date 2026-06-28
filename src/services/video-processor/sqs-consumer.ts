import { SQSHandler } from 'aws-lambda';
import { triggerVideoProcessing } from './worker';

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body);
      await triggerVideoProcessing(payload);
    } catch (error) {
      console.error('[VideoProcessor] Failed to handle job', error);
      throw error;
    }
  }
};
