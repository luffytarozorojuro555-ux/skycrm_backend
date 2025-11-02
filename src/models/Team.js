import mongoose from 'mongoose';
const TeamSchema = new mongoose.Schema({
<<<<<<< HEAD
  name: { type: String, required: true, trim:true },
=======
  name: { type: String, required: true },
>>>>>>> 333ee9a41294962eab6c17153fde472d38aeec25
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sales Head
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Team Lead
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  leadsAssigned: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});
<<<<<<< HEAD

TeamSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
=======
>>>>>>> 333ee9a41294962eab6c17153fde472d38aeec25
export default mongoose.model('Team', TeamSchema);
