import mongoose from 'mongoose';

const hraSchema = new mongoose.Schema({
  hraName: {
    type: String,
  },
  hraImage: {
    type: String,
  },
  prescribed: {
  type: String,
  default: ''
},
}, { timestamps: true });

const Hra = mongoose.model('Hra', hraSchema);
export default Hra;
