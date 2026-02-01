import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsEnum,
} from 'class-validator';

export class CreateGuideDto {
    @ApiProperty({ example: 'How to use the dashboard' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'A step-by-step guide for new users', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}

export class UpdateGuideDto {
    @ApiProperty({ example: 'Updated Guide Title', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 'Updated description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @ApiProperty({ enum: ['draft', 'published', 'archived'], required: false })
    @IsEnum(['draft', 'published', 'archived'])
    @IsOptional()
    status?: 'draft' | 'published' | 'archived';
}
