import { Controller, Get, Param, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Controller('uploads')
export class UploadsController {
    private readonly logger = new Logger(UploadsController.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    
    constructor(
        private readonly uploadsService: UploadsService,
        private readonly configService: ConfigService,
    ) {
        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
            },
        });
        this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || 'guidescribe-screenshots';
    }

    /**
     * Proxy endpoint to serve S3 images - bypasses CORS issues
     * Streams the image directly from S3 with CORS headers
     * Usage: /api/uploads/proxy/:encodedUrl
     */
    @Get('proxy/:encodedUrl')
    async proxyImage(
        @Param('encodedUrl') encodedUrl: string,
        @Res() res: Response,
    ) {
        try {
            // Single decode - the URL param is already decoded once by Express
            const url = decodeURIComponent(encodedUrl);
            this.logger.log(`Proxying image from: ${url}`);

            // Validate it's an S3 URL from our bucket
            if (!url.includes('s3.') || !url.includes('amazonaws.com')) {
                this.logger.warn(`Invalid URL attempted: ${url}`);
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Invalid image URL',
                });
            }

            // Extract the S3 key from the URL
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1); // Remove leading slash

            // Get object from S3
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            const data = await this.s3Client.send(command);

            // Set CORS headers
            res.set({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': data.ContentType || 'image/png',
                'Cache-Control': 'max-age=31536000',
            });

            // Stream the image body
            if (data.Body) {
                const stream = data.Body as Readable;
                stream.pipe(res);
            } else {
                res.status(HttpStatus.NOT_FOUND).json({ message: 'Image not found' });
            }
        } catch (error) {
            this.logger.error(`Proxy error: ${error.message}`, error.stack);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to load image',
                error: error.message,
            });
        }
    }
}
