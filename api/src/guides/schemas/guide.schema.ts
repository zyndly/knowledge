import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Annotation schema for screenshot overlays
@Schema({ _id: false })
export class Annotation {
    @Prop({ required: true, enum: ['arrow', 'rect', 'text'] })
    type: 'arrow' | 'rect' | 'text';

    @Prop({ required: true })
    x: number;

    @Prop({ required: true })
    y: number;

    @Prop({ default: 0 })
    width: number;

    @Prop({ default: 0 })
    height: number;

    @Prop({ default: '#FF0000' })
    color: string;

    @Prop({ default: '' })
    text: string;

    @Prop({ default: 0 })
    rotation: number;

    @Prop({ default: 2 })
    strokeWidth: number;

    @Prop({ default: 16 })
    fontSize: number;

    // For arrows: end coordinates
    @Prop()
    endX?: number;

    @Prop()
    endY?: number;
}

export const AnnotationSchema = SchemaFactory.createForClass(Annotation);

// Step schema - each recorded action
@Schema({ _id: true })
export class Step {
    @Prop({ type: Types.ObjectId, auto: true })
    _id: Types.ObjectId;

    @Prop({ required: true })
    order: number;

    @Prop({ required: true })
    timestamp: Date;

    @Prop({ required: true })
    url: string;

    @Prop({ default: '' })
    title: string;

    @Prop({ default: '' })
    description: string;

    @Prop({ required: true })
    screenshotUrl: string;

    @Prop({ default: '' })
    elementLabel: string;

    @Prop({ default: '' })
    selector: string;

    @Prop({ default: '' })
    elementTag: string;

    @Prop({ type: [AnnotationSchema], default: [] })
    annotations: Annotation[];

    // Click coordinates on the page
    @Prop()
    clickX?: number;

    @Prop()
    clickY?: number;
}

export const StepSchema = SchemaFactory.createForClass(Step);

// Guide schema - the main document
export type GuideDocument = Guide & Document;

@Schema({ timestamps: true })
export class Guide {
    @Prop({ required: true })
    title: string;

    @Prop({ default: '' })
    description: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, unique: true })
    shareId: string;

    @Prop({ default: false })
    isPublic: boolean;

    @Prop({ default: 'draft', enum: ['draft', 'published', 'archived'] })
    status: 'draft' | 'published' | 'archived';

    @Prop({ type: [StepSchema], default: [] })
    steps: Step[];

    @Prop({ default: null })
    coverImageUrl?: string;

    @Prop({ default: 0 })
    viewCount: number;
}

export const GuideSchema = SchemaFactory.createForClass(Guide);

// Index for efficient queries
GuideSchema.index({ userId: 1, status: 1 });
GuideSchema.index({ shareId: 1 });
GuideSchema.index({ isPublic: 1, status: 1 });

// Virtual for id
GuideSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

GuideSchema.set('toJSON', {
    virtuals: true,
    transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
    },
});
