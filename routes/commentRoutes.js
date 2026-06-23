const express=require("express");
const router=express.Router();
const auth=require("../middlewares/auth");
const {addComment,getAllComments,deleteComment}=require("../controllers/Comment");

router.post("/add",auth,addComment);
router.get("/getAll/:postId",getAllComments);
router.delete("/delete/:commentId",auth,deleteComment);
module.exports=router;