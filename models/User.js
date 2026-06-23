const mongoose=require("mongoose");
const bcrypt=require("bcryptjs");
const UserSchema=new mongoose.Schema(
    {
        firstName:{
            type:String,
            required:true,
            trim:true,
            maxLength:[50, "name cannot exceed 50 characters"]
        },
        lastName:{
            type:String,
            required:true,
            trim:true,
            maxLength:[50, "name cannot exceed 50 characters"]
        },
        email:{
            unique:true,
            type:String,
            required:true,
            trim:true,
            maxLength:[50, "name cannot exceed 50 characters"]
        },
        password:{
            type:String,
            required:true,
            trim:true,
            minLength:[6, "password must be at least 6 characters"]
        },
        bio:{
            type:String,
            default:""
        }
    }, 
    {                        // 2nd argument: schema OPTIONS 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
          
)
// creating a virtual fields
UserSchema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`;
});
UserSchema.virtual("posts",{
    ref:'Post',
    localField:'_id',
    foreignField:'author',
})
//using the pre hook inside this model
UserSchema.pre("save", async function(){
    if(!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})

//creating a method to compare the password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};


module.exports=mongoose.model("User",UserSchema);