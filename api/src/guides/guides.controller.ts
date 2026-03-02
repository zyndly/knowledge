import puppeteer from 'puppeteer';
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Res,
    Header,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { GuidesService } from './guides.service';
import { CreateGuideDto, UpdateGuideDto } from './dto/guide.dto';
import {
    CreateStepDto,
    UpdateStepDto,
    ReorderStepsDto,
    BulkCreateStepsDto,
} from './dto/step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Guides')
@Controller('guides')
export class GuidesController {
    constructor(private readonly guidesService: GuidesService) { }

    // ============ GUIDE ROUTES ============

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new guide' })
    async create(
        @CurrentUser() user: CurrentUserPayload,
        @Body() createGuideDto: CreateGuideDto,
    ) {
        return this.guidesService.create(user.userId, createGuideDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all guides for current user' })
    async findAll(@CurrentUser() user: CurrentUserPayload) {
        return this.guidesService.findAllByUser(user.userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a guide by ID' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.guidesService.findById(id, user.userId);
    }

    @Get('share/:shareId')
    @ApiOperation({ summary: 'Get a guide by share ID (public access or owner)' })
    @ApiParam({ name: 'shareId', description: 'Share ID' })
    async findByShareId(
        @Param('shareId') shareId: string,
        @CurrentUser() user?: CurrentUserPayload,
    ) {
        return this.guidesService.findByShareId(shareId, user?.userId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a guide' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async update(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() updateGuideDto: UpdateGuideDto,
    ) {
        return this.guidesService.update(id, user.userId, updateGuideDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a guide' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        await this.guidesService.delete(id, user.userId);
        return { message: 'Guide deleted successfully' };
    }

    // ============ STEP ROUTES ============

    @Post(':id/steps')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add a step to a guide' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async addStep(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() createStepDto: CreateStepDto,
    ) {
        return this.guidesService.addStep(id, user.userId, createStepDto);
    }

    @Post(':id/steps/bulk')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add multiple steps to a guide' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async addBulkSteps(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() bulkDto: BulkCreateStepsDto,
    ) {
        return this.guidesService.addBulkSteps(id, user.userId, bulkDto);
    }

    @Put(':id/steps/reorder')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reorder steps in a guide' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    async reorderSteps(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() reorderDto: ReorderStepsDto,
    ) {
        console.log('Reorder request received:', JSON.stringify(reorderDto, null, 2));
        return this.guidesService.reorderSteps(id, user.userId, reorderDto);
    }

    @Put(':id/steps/:stepId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a step' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    @ApiParam({ name: 'stepId', description: 'Step ID' })
    async updateStep(
        @Param('id') id: string,
        @Param('stepId') stepId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() updateStepDto: UpdateStepDto,
    ) {
        return this.guidesService.updateStep(id, stepId, user.userId, updateStepDto);
    }

    @Delete(':id/steps/:stepId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a step' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    @ApiParam({ name: 'stepId', description: 'Step ID' })
    async deleteStep(
        @Param('id') id: string,
        @Param('stepId') stepId: string,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.guidesService.deleteStep(id, stepId, user.userId);
    }

    // ============ EXPORT ROUTES ============

    @Get(':id/export/html')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Export guide as standalone HTML' })
    @ApiParam({ name: 'id', description: 'Guide ID' })
    @Header('Content-Type', 'text/html')
    async exportHtml(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Res() res: Response,
    ) {
        const html = await this.guidesService.exportAsHtml(id, user.userId);
        res.send(html);
    }

    @Get('share/:shareId/export/html')
    @ApiOperation({ summary: 'Export public guide as standalone HTML' })
    @ApiParam({ name: 'shareId', description: 'Share ID' })
    @Header('Content-Type', 'text/html')
    async exportPublicHtml(
        @Param('shareId') shareId: string,
        @Res() res: Response,
    ) {
        const guide = await this.guidesService.findByShareId(shareId);
        if (!guide.isPublic) {
            res.status(403).send('This guide is not public');
            return;
        }
        const html = await this.guidesService.exportAsHtml(guide._id.toString());
        res.send(html);
    }

    @Post(':id/export-pdf')
    async exportGuidePDF(
        @Param('id') id: string,
        @Body() body: { images: string[] },
        @Res() res: Response
    ) {
        try {
            // Generate PDF from images using the service
            const pdfBuffer = await this.guidesService.generatePDFFromImages(body.images);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="guide-${id}.pdf"`,
                'Content-Length': pdfBuffer.length
            });

            res.end(pdfBuffer);
            console.log("PDF size:", pdfBuffer.length);
        } catch (error) {
            console.error("PDF generation error:", error);
            res.status(500).send('Failed to generate PDF');
        }
    }
}
