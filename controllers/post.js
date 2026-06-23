const User = require("../models/User");
const Post = require("../models/Post");
const ApiError = require("../utils/ApiError");
const Comment=require("../models/Comment");
const createPost=async (req,res,next)=>{
    try{

        const {title,content,tags,isPublished}=req.body;
        if([title,content].some((field)=>field?.trim()==="")){
            throw new ApiError(400,"Please enter title and content ");
        }

      const post=await Post.create({
            title,
            content,
            tags,
            isPublished,
            author:req.user._id
        })

        res.status(201).json({
            success:true,
            message:"Post created successfully",
            post
        })
    }catch(error){
        next(error);
    }
}

const getAllPost=async(req, res, next)=>{
    try{
        const posts =await Post.find(
            {isPublished:true}
        ).sort({ createdAt: -1 }).populate("author" ,"firstName lastName email" );
        if(!posts){
            throw new ApiError(404, "No posts found");
        }
        return res.status(200).json({
            success:true,
            message:"Posts fetched successfully",
            posts
        })
    }catch(error){
        next(error);
    }
}
const getSinglePost=async(req,res,next)=>{
    try{
        const {slug}=req.params;
        const post=await Post.findOne({slug:slug}).populate({
            path:"comments",
            populate:{
                path:"author",
                select:"firstName lastName"
            }
            
        });
        if(!post){
            throw new ApiError(404, "No posts found");
        }
        return res.status(200).json({
            success:true,
            message:"Post fetched successfully",
            post
        })
    }catch(error){
        next(error);
    }
}
const updatePost=async(req,res,next)=>{
    try{
        const {postId}=req.params;
        const originalPost= await Post.findById(postId);
        if(!originalPost){
            throw new ApiError(404,"Post not found");
        }
        const {title,content,tags,isPublished}=req.body;
        let post={};
        if(title) post.title=title;
        if(content) post.content=content;
        if(tags) post.tags=tags;
        if(isPublished!== undefined) post.isPublished=isPublished;
        if(originalPost.author.toString()===req.user._id.toString()){
            post=await Post.findByIdAndUpdate(postId,post,{new:true});
        }
        else{
            throw new ApiError(403,"You are not authorized to update this post");
        }
        return res.status(200).json({
            success:true,
            message:"Post updated successfully",
            post
        })
    }catch(error){
        next(error);
    }
}
const deletePost=async(req,res,next)=>{
    try{
        const {postId}=req.params;
        const post=await Post.findById(postId);
        if(!post){
            throw new ApiError(404,"Post not found");
        }
        if(post.author.toString()===req.user._id.toString()){
            await Comment.deleteMany({post:postId});
            await Post.findByIdAndDelete(postId);
        }
        else{
            throw new ApiError(403,"You are not authorized to delete this post");
        }
        return res.status(200).json({
            success:true,
            message:"Post deleted successfully"
        })
    }catch(error){
        next(error);
    }
}
    
module.exports={createPost,getAllPost,getSinglePost,updatePost,deletePost}