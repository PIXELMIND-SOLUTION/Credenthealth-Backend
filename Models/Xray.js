// models/xray.model.js
import mongoose from "mongoose";

const xraySchema = new mongoose.Schema({
  title: String,
  gender: String,
  price: Number,
  preparation: String,
  reportTime: String,
  image: String,
  diagnostics: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic"
    }
  ]
}, { timestamps: true });

const Xray = mongoose.model("Xray", xraySchema);
export default Xray;
