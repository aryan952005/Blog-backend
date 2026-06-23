const User = require("../models/User");
const jwt=require("jsonwebtoken");
const ApiError = require("../utils/ApiError"); // ← add this
const registerUser = async (req, res, next) => {
    try {
        const {firstName,lastName,email,password} = req.body;
        //validating input field 
        if (!firstName || !lastName || !email || !password) {
            throw new ApiError(400, "All fields are required");
        }
        const isExist = await User.findOne({email});
        if(isExist){
            throw new ApiError(400, "User is already registered");
        } 
        //creating new user
        const user = await User.create({firstName,lastName,email,password});
        //generating the token
        const payload={
            id:user._id,
            email:user.email
        }
        const token=jwt.sign(payload,process.env.JWT_SECRET, { expiresIn: "1h" });
        //returning the response
        res.status(201).json({
            success:true,
            message:"user registered successfully",
            token,
            user:{
                id:user._id,
                email:user.email,
                fullName:user.fullName
            }
            
        })
        
    } catch (error) {
        next(error);
    }
}
const loginUser=async(req,res,next)=>{
    try {
        //deatil
        const {email,password}=req.body;
        //validating input field 
        if (!email || !password) {
            throw new ApiError(400, "All fields are required");
        }
        //finding the user
        const user = await User.findOne({email});
        if(!user){
            throw new ApiError(404, "User not found");
        }
        //comparing the password
        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            throw new ApiError(401, "Invalid password");
        }
        //generating the token
        const payload={
            id:user._id,
            email:user.email
        }
        const token=jwt.sign(payload,process.env.JWT_SECRET, { expiresIn: "1h" });
        //returning the response
        res.status(200).cookie("accessToken",token,{
            httpOnly:true,
            secure:true,
            sameSite:"strict",
            maxAge:60*60*1000   
        }).json({
            success:true,
            message:"user logged in successfully",
            user:{
                id:user._id,
                email:user.email,
                fullName:user.fullName
            }
            
        })
    } catch (error) {
        next(error);
    }
}
const me=async(req,res,next)=>{
    try{
        const userId=req.user._id;
        const user=await User.findById(userId).select("-password");
        if(!user){
            throw new ApiError(404,"User not found");
        }
        return res.status(200).json({
            success:true,
            message:"user found successfully",
            user
        })
    }catch(error){
        next(error);
    }
}
module.exports={registerUser,loginUser,me};