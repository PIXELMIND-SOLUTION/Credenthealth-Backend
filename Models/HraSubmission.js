import mongoose from "mongoose";

const hraSubmissionSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
  },

  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HraQuestion",
      },
      selectedOption: {
        type: mongoose.Schema.Types.ObjectId,
      },
      points: {
        type: Number,
        default: 0
      },
      hraCategoryName: {
        type: String,
        default: "Uncategorized"
      }
    }
  ],

  totalPoints: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
  },
  riskMessage: {
    type: String,
    default: ""
  },

  categoryPoints: {
    type: Map,
    of: Number,
    default: {}
  },

  prescribedForCategories: {
    type: Map,
    of: String,
    default: {}
  },

  submittedAt: {
    type: Date,
    default: Date.now
  }
});

export const HraSubmission = mongoose.model("HraSubmission", hraSubmissionSchema);
