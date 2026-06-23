const mongoose = require("mongoose");
require("dotenv").config();
const Comment = require("./models/Comment");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await Comment.findById("6a3a6c765f8a4a0dd24f4adc");
  console.log("Found:", doc);
  process.exit(0);
}
check();
