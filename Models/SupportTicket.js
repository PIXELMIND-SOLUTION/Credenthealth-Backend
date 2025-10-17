import mongoose from 'mongoose';

// Support Schema
const supportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
  reason: { type: String, enum: ['Payment Issues', 'Booking Issues', 'Technical Issues', 'Account Issue', 'Consultation Issue', 'App Bug', 'Other'], required: true },
  description: { type: String, },
  status: { type: String, default: 'Open' }, // Open, In Progress, Closed
  attachment: { type: String }, // File path for uploaded attachments
  createdAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
