import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuidesService } from './guides.service';
import { GuidesController } from './guides.controller';
import { Guide, GuideSchema } from './schemas/guide.schema';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Guide.name, schema: GuideSchema }]),
        UploadsModule,
    ],
    controllers: [GuidesController],
    providers: [GuidesService],
    exports: [GuidesService],
})
export class GuidesModule { }
