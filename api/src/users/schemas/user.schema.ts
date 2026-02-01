import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ default: null })
    avatar?: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for id
UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    },
});
