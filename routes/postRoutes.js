const express=require("express");
const router=express.Router();
const auth=require("../middlewares/auth");
const {createPost,getAllPost,getSinglePost,updatePost,deletePost}=require("../controllers/Post");

router.post("/create",auth,createPost);
router.get("/getAll",getAllPost);
router.get("/getSingle/:slug",auth,getSinglePost);
router.put("/update/:postId",auth,updatePost);
router.delete("/delete/:postId",auth,deletePost);
module.exports=router;

