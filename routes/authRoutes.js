const express=require("express");
const router=express.Router();
const {registerUser,loginUser,me}=require("../controllers/Auth");
const auth=require("../middlewares/auth");
router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/me",auth,me);
module.exports=router;