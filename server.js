require("dotenv").config()
const express=require("express")
const cookieParser=require("cookie-parser")
const app=express();

app.use(express.json())
app.use(cookieParser())


//routes
const authRoutes=require("./routes/authRoutes")
app.use("/api/auth",authRoutes)
const postRoutes=require("./routes/postRoutes")
app.use("/api/post",postRoutes)
const commentRoutes=require("./routes/commentRoutes")
app.use("/api/comment",commentRoutes)

//error handler middleware
const errorHandler=require("./middlewares/errorHandler")
app.use(errorHandler)


//db connection
const connectDB=require("./config/db")
connectDB().then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`Server is running on port ${process.env.PORT}`)
    })
})
