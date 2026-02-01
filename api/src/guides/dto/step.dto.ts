import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    IsEnum,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnnotationDto {
    @ApiProperty({ enum: ['arrow', 'rect', 'text'] })
    @IsEnum(['arrow', 'rect', 'text'])
    type: 'arrow' | 'rect' | 'text';

    @ApiProperty({ example: 100 })
    @IsNumber()
    x: number;

    @ApiProperty({ example: 200 })
    @IsNumber()
    y: number;

    @ApiProperty({ example: 150, required: false })
    @IsNumber()
    @IsOptional()
    width?: number;

    @ApiProperty({ example: 50, required: false })
    @IsNumber()
    @IsOptional()
    height?: number;

    @ApiProperty({ example: '#FF0000', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ example: 'Click here', required: false })
    @IsString()
    @IsOptional()
    text?: string;

    @ApiProperty({ example: 0, required: false })
    @IsNumber()
    @IsOptional()
    rotation?: number;

    @ApiProperty({ example: 2, required: false })
    @IsNumber()
    @IsOptional()
    strokeWidth?: number;

    @ApiProperty({ example: 16, required: false })
    @IsNumber()
    @IsOptional()
    fontSize?: number;

    @ApiProperty({ example: 250, required: false })
    @IsNumber()
    @IsOptional()
    endX?: number;

    @ApiProperty({ example: 300, required: false })
    @IsNumber()
    @IsOptional()
    endY?: number;
}

export class CreateStepDto {
    @ApiProperty({ example: 'https://example.com/dashboard' })
    @IsString()
    @IsNotEmpty()
    url: string;

    @ApiProperty({ example: 'Click the Settings button' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 'Navigate to settings to configure your preferences' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'data:image/png;base64,...' })
    @IsString()
    @IsNotEmpty()
    screenshotData: string; // Base64 or URL

    @ApiProperty({ example: 'Settings' })
    @IsString()
    @IsOptional()
    elementLabel?: string;

    @ApiProperty({ example: 'button#settings-btn' })
    @IsString()
    @IsOptional()
    selector?: string;

    @ApiProperty({ example: 'button' })
    @IsString()
    @IsOptional()
    elementTag?: string;

    @ApiProperty({ example: 150 })
    @IsNumber()
    @IsOptional()
    clickX?: number;

    @ApiProperty({ example: 200 })
    @IsNumber()
    @IsOptional()
    clickY?: number;

    @ApiProperty()
    @IsDateString()
    @IsOptional()
    timestamp?: string;
}

export class UpdateStepDto {
    @ApiProperty({ example: 'Updated step title', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 'Updated description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ type: [AnnotationDto], required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnnotationDto)
    @IsOptional()
    annotations?: AnnotationDto[];
}

export class ReorderStepsDto {
    @ApiProperty({
        example: ['step-id-1', 'step-id-2', 'step-id-3'],
        description: 'Array of step IDs in the desired order',
    })
    @IsArray()
    @IsString({ each: true })
    stepIds: string[];
}

export class BulkCreateStepsDto {
    @ApiProperty({ type: [CreateStepDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepDto)
    steps: CreateStepDto[];
}
