import { Controller, Get, Param, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
    private readonly logger = new Logger(UploadsController.name);
    
    constructor(private readonly uploadsService: UploadsService) { }

    /**
     * Proxy endpoint to serve S3 images - bypasses CORS issues
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

            // Use the uploads service to get a signed URL and redirect
            const signedUrl = await this.uploadsService.getSignedUrl(key, 3600);
            
            // Redirect to the signed URL
            return res.redirect(signedUrl);
        } catch (error) {
            this.logger.error(`Proxy error: ${error.message}`, error.stack);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to load image',
                error: error.message,
            });
        }
    }
}
