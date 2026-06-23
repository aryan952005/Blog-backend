const mongoose = require('mongoose');
const CommentSchema= new mongoose.Schema(
    {
        author:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        post:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Post',
            required:true
        },
        
        content:{
            type:String,
            required:true
        }
    },
    {                        // 2nd argument: schema OPTIONS (line 44) ← HERE
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }

)
CommentSchema.index({post:1,createdAt:-1});
module.exports = mongoose.model("Comment", CommentSchema);
