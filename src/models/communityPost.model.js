import mongoose, {Schema} from 'mongoose';

const communitypostSchema = new Schema(
    {
        content:{
            type: String,
            required: true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }

    },
    {timestamps:true}
);

export const Communitypost = mongoose.model('Communitypost',communitypostSchema)