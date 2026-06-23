const mongoose= require('mongoose');
const PostSchema = new mongoose.Schema(
    {
        title:{
            type:String,
            required:true,
            trim:true,
            maxLength:[200, "Title cannot exceed 200 characters"]
        },
        slug:{
            type:String,
            unique:true,
            lowercase:true,
            trim:true,
        },
        content:{
            type:String,
            required:true,
        },
        excerpt:{
            type:String,
            trim:true,
            maxLength:[200, "Excerpt cannot exceed 200 characters"]
        },
        author:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        tags:{
            type:[String],
            default:[],
        },
        isPublished:{
            type:Boolean,
            default:false,
        },
        publishedAt:{
            type:Date,
        },
    },
      // 1st argument: field definitions (lines 4-42)
    {                        // 2nd argument: schema OPTIONS (line 44) ← HERE
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

PostSchema.virtual('comments',{
    ref:'Comment',
    localField:'_id',
    foreignField:'post',
})

PostSchema.pre("save", function () {
    // Auto-generate slug from title
    if (this.isModified("title")) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")    // Replace non-alphanumeric with dashes
            .replace(/(^-|-$)/g, "")          // Remove leading/trailing dashes
            + "-" + Date.now();               // Add timestamp for uniqueness
    }

    // Auto-generate excerpt from content
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.substring(0, 200) + "...";
    }

    // Set publishedAt when first published
    if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
});

PostSchema.index({ slug: 1 });
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });


module.exports = mongoose.model("Post",PostSchema);