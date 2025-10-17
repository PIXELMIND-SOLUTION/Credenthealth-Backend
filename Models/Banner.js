import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  imageUrls: {
    type: [String],  // Array of image URLs
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
