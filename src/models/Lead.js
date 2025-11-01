import mongoose from 'mongoose';
const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true ,unique: true},
  email: { type: String ,unique: true, sparse: true},
  city: { type: String },
  source: { type: String },
  college: { type: String },               
  yearOfPassout: { type: Date },   

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true },

  history: [{
    status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],

  comments: [
    {
      text: { type: String, required: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
      at: { type: Date, default: Date.now }
    }
  ],

  notes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Lead', LeadSchema);
