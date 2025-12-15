import mongoose from 'mongoose';

const simpleQuestionSchema = new mongoose.Schema(
  {
    // The question being asked
    question: {
      type: String,
    },

    // Array to store submitted answers
    submittedAnswers: [
      {
        questionId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'SimpleQuestion',  // Reference to SimpleQuestion model
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Staff',  // Reference to User model
        },
        answer: {
          type: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,  // Timestamp for each answer
        },
      }
    ],
  },
  { timestamps: true }  // Automatically adds createdAt and updatedAt
);

const SimpleQuestion = mongoose.model('SimpleQuestion', simpleQuestionSchema);

export default SimpleQuestion;
