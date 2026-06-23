const User=require("../models/User")
const Post=require("../models/Post")
const Comment=require("../models/Comment")
const ApiError=require("../utils/ApiError")

const addComment=async(req,res,next)=>{
    try{
        const {postId,content}=req.body;
        if(!postId){
            throw new ApiError(400,"Post ID is required");
        }
        if(!content){
            throw new ApiError(400,"Comment content is required");
        }
        
        const comment = await Comment.create({
            post:postId,
            author:req.user._id,
            content,
            
        });
        res.status(201).json({
            success:true,
            message:"Comment added successfully",
            comment
        });
        
    }catch(error){
        next(error);
    }
}

const getAllComments=async(req,res,next)=>{
    try{
        const {postId}=req.params;
        if(!postId){
            throw new ApiError(400,"Post ID is required");
        }
        const comments=await Comment.find({post:postId});
        res.status(200).json({
            success:true,
            message:"Comments fetched successfully",
            comments,
            
        });
    }catch(error){
        next(error);
    }
}
const deleteComment=async(req,res,next)=>{
    try{
        const {commentId}=req.params;
        if(!commentId){
            throw new ApiError(400,"Comment ID is required");
        }
        const comment = await Comment.findById(commentId);
        
        // 1. Check if comment exists at all
        if(!comment){
            throw new ApiError(404,"Comment not found");
        }

        // 2. Check if the comment has an author before calling .toString()
        // (Some old or manually created comments might be missing the author field)
        if (!comment.author) {
            throw new ApiError(400, "This comment has no author and cannot be verified for deletion");
        }

        if(comment.author.toString() !== req.user._id.toString()){
            throw new ApiError(403,"You are not authorized to delete this comment");
        }
        await Comment.findByIdAndDelete(commentId);
        res.status(200).json({
            success:true,
            message:"Comment deleted successfully"
        });
    }catch(error){
        next(error);
    }
}
module.exports={addComment,getAllComments,deleteComment}    