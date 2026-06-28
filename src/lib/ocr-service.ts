import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { RekognitionClient, DetectTextCommand } from '@aws-sdk/client-rekognition';

// OCR Service for YouTube Extension
export class OCRService {
  private textractClient: TextractClient;
  private rekognitionClient: RekognitionClient;

  constructor() {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
    
    this.rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
  }

  // Extract text from image using Textract (for documents)
  async extractTextFromImage(imageBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
    blocks: any[];
  }> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: imageBuffer,
        },
      });

      const response = await this.textractClient.send(command);
      
      let extractedText = '';
      let totalConfidence = 0;
      let blockCount = 0;

      if (response.Blocks) {
        for (const block of response.Blocks) {
          if (block.BlockType === 'LINE' && block.Text) {
            extractedText += block.Text + '\n';
            if (block.Confidence) {
              totalConfidence += block.Confidence;
              blockCount++;
            }
          }
        }
      }

      const averageConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;

      return {
        text: extractedText.trim(),
        confidence: averageConfidence,
        blocks: response.Blocks || []
      };
    } catch (error) {
      console.error('Textract error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  // Extract text from image using Rekognition (for simple text)
  async extractTextFromImageRekognition(imageBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
    detections: any[];
  }> {
    try {
      const command = new DetectTextCommand({
        Image: {
          Bytes: imageBuffer,
        },
      });

      const response = await this.rekognitionClient.send(command);
      
      let extractedText = '';
      let totalConfidence = 0;
      let detectionCount = 0;

      if (response.TextDetections) {
        for (const detection of response.TextDetections) {
          if (detection.Type === 'LINE' && detection.DetectedText) {
            extractedText += detection.DetectedText + '\n';
            if (detection.Confidence) {
              totalConfidence += detection.Confidence;
              detectionCount++;
            }
          }
        }
      }

      const averageConfidence = detectionCount > 0 ? totalConfidence / detectionCount : 0;

      return {
        text: extractedText.trim(),
        confidence: averageConfidence,
        detections: response.TextDetections || []
      };
    } catch (error) {
      console.error('Rekognition error:', error);
      throw new Error('Failed to extract text from image using Rekognition');
    }
  }

  // Smart OCR selection based on image type
  async extractTextSmart(imageBuffer: Buffer, imageType: 'screenshot' | 'document' | 'video_frame' = 'screenshot'): Promise<{
    text: string;
    confidence: number;
    method: 'textract' | 'rekognition';
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      let result;
      let method: 'textract' | 'rekognition';

      // Choose OCR method based on image type
      if (imageType === 'document') {
        // Use Textract for documents (better for structured text)
        result = await this.extractTextFromImage(imageBuffer);
        method = 'textract';
      } else {
        // Use Rekognition for screenshots and video frames (faster, better for UI text)
        result = await this.extractTextFromImageRekognition(imageBuffer);
        method = 'rekognition';
      }

      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        confidence: result.confidence,
        method,
        processingTime
      };
    } catch (error) {
      console.error('Smart OCR error:', error);
      
      // Fallback to Rekognition if Textract fails
      try {
        const fallbackResult = await this.extractTextFromImageRekognition(imageBuffer);
        const processingTime = Date.now() - startTime;
        
        return {
          text: fallbackResult.text,
          confidence: fallbackResult.confidence,
          method: 'rekognition',
          processingTime
        };
      } catch (fallbackError) {
        console.error('Fallback OCR error:', fallbackError);
        throw new Error('All OCR methods failed');
      }
    }
  }

  // Extract text from video frame (optimized for YouTube)
  async extractTextFromVideoFrame(imageBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
    timestamp?: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Use Rekognition for video frames (faster, better for UI text)
      const result = await this.extractTextFromImageRekognition(imageBuffer);
      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        confidence: result.confidence,
        processingTime
      };
    } catch (error) {
      console.error('Video frame OCR error:', error);
      throw new Error('Failed to extract text from video frame');
    }
  }

  // Process multiple images in batch
  async extractTextBatch(images: Array<{
    buffer: Buffer;
    type: 'screenshot' | 'document' | 'video_frame';
    metadata?: any;
  }>): Promise<Array<{
    text: string;
    confidence: number;
    method: 'textract' | 'rekognition';
    processingTime: number;
    metadata?: any;
  }>> {
    const results = await Promise.allSettled(
      images.map(async (image) => {
        const result = await this.extractTextSmart(image.buffer, image.type);
        return {
          ...result,
          metadata: image.metadata
        };
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }
}

// Client-side OCR using Tesseract.js (for extension)
export class ClientSideOCR {
  // This would be used in the browser extension
  static async extractTextFromCanvas(canvas: HTMLCanvasElement): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const processingTime = Date.now() - startTime;

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime
      };
    } catch (error) {
      console.error('Client-side OCR error:', error);
      throw new Error('Failed to extract text using Tesseract.js');
    }
  }

  // Extract text from image element
  static async extractTextFromImage(imageElement: HTMLImageElement): Promise<{
    text: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(imageElement, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const processingTime = Date.now() - startTime;

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime
      };
    } catch (error) {
      console.error('Client-side OCR error:', error);
      throw new Error('Failed to extract text using Tesseract.js');
    }
  }
}

// OCR API endpoint for extension
export async function processOCRRequest(imageBuffer: Buffer, imageType: 'screenshot' | 'document' | 'video_frame' = 'screenshot'): Promise<{
  text: string;
  confidence: number;
  method: 'textract' | 'rekognition';
  processingTime: number;
}> {
  const ocrService = new OCRService();
  return await ocrService.extractTextSmart(imageBuffer, imageType);
}

// Export the service
export const ocrService = new OCRService();
