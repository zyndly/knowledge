import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly logger = new Logger(UploadsService.name);

    constructor(private configService: ConfigService) {
        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey:
                    this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
            },
        });
        this.bucketName =
            this.configService.get<string>('AWS_S3_BUCKET') || 'guidescribe-screenshots';
    }

    /**
     * Upload a base64 encoded image to S3
     */
    async uploadBase64Image(
        base64Data: string,
        folder: string = 'screenshots',
    ): Promise<string> {
        try {
            // Handle both data URL and raw base64
            let buffer: Buffer;
            let contentType = 'image/png';

            if (base64Data.startsWith('data:')) {
                const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
                if (matches) {
                    contentType = matches[1];
                    buffer = Buffer.from(matches[2], 'base64');
                } else {
                    throw new Error('Invalid data URL format');
                }
            } else {
                buffer = Buffer.from(base64Data, 'base64');
            }

            // Generate unique filename
            const extension = contentType.split('/')[1] || 'png';
            const filename = `${uuidv4()}.${extension}`;
            const key = `${folder}/${filename}`;

            // Upload to S3
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                    CacheControl: 'max-age=31536000', // Cache for 1 year
                }),
            );

            // Return the public URL
            return this.getPublicUrl(key);
        } catch (error) {
            this.logger.error('Failed to upload image to S3', error);
            throw error;
        }
    }

    /**
     * Upload a file buffer to S3
     */
    async uploadBuffer(
        buffer: Buffer,
        filename: string,
        contentType: string,
        folder: string = 'uploads',
    ): Promise<string> {
        try {
            const key = `${folder}/${uuidv4()}-${filename}`;

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                }),
            );

            return this.getPublicUrl(key);
        } catch (error) {
            this.logger.error('Failed to upload buffer to S3', error);
            throw error;
        }
    }

    /**
     * Delete a file from S3
     */
    async deleteFile(url: string): Promise<void> {
        try {
            const key = this.getKeyFromUrl(url);
            if (!key) return;

            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            );
        } catch (error) {
            this.logger.error('Failed to delete file from S3', error);
            // Don't throw - deletion failures shouldn't break the flow
        }
    }

    /**
     * Get a signed URL for temporary access
     */
    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    /**
     * Get public URL for an S3 object
     */
    private getPublicUrl(key: string): string {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    }

    /**
     * Extract S3 key from URL
     */
    private getKeyFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            // Remove leading slash
            return urlObj.pathname.substring(1);
        } catch {
            return null;
        }
    }
}
