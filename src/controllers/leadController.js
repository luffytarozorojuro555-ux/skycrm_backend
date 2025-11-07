import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Status from "../models/Status.js";
import Note from "../models/Note.js";
import FollowUp from "../models/FollowUp.js";
import Attachment from "../models/Attachment.js";
import csv from "csv-parser";
import { Readable } from "stream";
import { clearRedisCache as clearCache } from "../middleware/redisCache.js";
import { populate } from "dotenv";
import validateFields from "../utils/validateFields.js";

const canSeeLead = (req, lead) => {
  const role = req.user.roleName;
  if (role === "Admin" || role === "Sales Manager" || role === "Sales Manager")
    return true;
  if (role === "Sales Team Lead") {
    // Grant permission to view any lead when Team Lead is logged in
    return true;
  }
  if (role === "Sales Representatives") {
    // Allow Sales Representatives to update any lead's status
    return true;
  }
  return false;
};

// export const listLeads = async (req, res) => {
//   const role = req.user.roleName;
//   const { status, q, assignedTo } = req.query;
//   const filter = {};
//   if (status) {
//     const st = await Status.findOne({ name: status });
//     if (st) filter.status = st._id;
//   }
//   if (q) {
//     filter.$or = [
//       { name: new RegExp(q, 'i') },
//       { phone: new RegExp(q, 'i') },
//       { email: new RegExp(q, 'i') }
//     ];
//   }
//   // Team Lead and Sales Rep should see all leads, same as Manager
// // Helper to get Sales Manager userId
// async function getSalesManagerUserId() {
//   const salesManager = await (await import('../models/User.js')).default.findOne({ roleName: 'Sales Manager' });
//   return salesManager?._id;
// }
//   if (assignedTo === 'me') filter.assignedTo = req.user.userId;

//   const leads = await Lead.find(filter).populate('status').populate('assignedTo','name email').populate('teamId','name lead');
//   // No filtering: all roles see all leads
//   res.json(leads);
// };

export const listLeads = async (req, res) => {
  try {
    const role = req.user.roleName;
    const currentRoute = req.route.path;
    console.log(currentRoute);
    const { status, q, assignedTo, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) {
      const st = await Status.findOne({ name: status });
      if (st) filter.status = st._id;
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }
    // Team Lead and Sales Rep should see all leads, same as Manager
    // Helper to get Sales Manager userId
    async function getSalesManagerUserId() {
      const salesManager = await (
        await import("../models/User.js")
      ).default.findOne({ roleName: "Sales Manager" });
      return salesManager?._id;
    }
    if (assignedTo === "me") filter.assignedTo = req.user.userId;

    if (currentRoute === "/") {
      const leads = await Lead.find(filter)
        .populate("status")
        .populate("assignedTo", "name email")
        .populate("teamId", "name lead");
      // No filtering: all roles see all leads
      res.json({leads,curUser:req.user?.userId});
    } else {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const totalLeads = await Lead.countDocuments(filter);
      const leads = await Lead.find(filter)
        .populate("status")
        .populate("assignedTo", "name email")
        .populate("teamId", "name lead")
        .skip(skip)
        .limit(parseInt(limit));

      res.json({
        leads,
        curUser:req.user.userId,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalLeads / limit),
        totalLeads,
      });
    }
  } catch (err) {}
};

export const getLead = async (req, res) => {
  // Populate teamId and its lead field for permission check
  const lead = await Lead.findById(req.params.id)
    .populate("status")
    .populate("assignedTo", "name email")
    .populate({
      path: "teamId",
      populate: { path: "lead", select: "name email" },
    })
    .populate({
      path: "history",
      populate: [
        { path: "status", select: "name" },
        { path: "by", select: "name email" },
      ],
    })
    .populate({
      path: "comments",
      populate: [{ path: "by", select: "name" }],
    });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canSeeLead(req, lead))
    return res.status(403).json({ error: "Forbidden" });
  res.json(lead);
};

export const createLead = async (req, res) => {
  req.shouldLog = true;
  const { name, phone, email, city, source, assignedTo, teamId, statusName } =
    req.body;
  // Check for duplicate by BOTH email and phone
  // let duplicate = null;
  // if (email || phone) {
  //   duplicate = await Lead.findOne({ email: email, phone: phone });
  // }
  // if (duplicate) {
  //   return res.status(400).json({
  //     error: "Lead creation unsuccessful. Lead already existed",
  //     target: email,
  //   });
  // }
  const errorMessage = validateFields({ name, email, phone });
  if (errorMessage != "") {
    return res.status(400).json({ error: errorMessage });
  }
  let duplicate = null;
  if (phone) {
    duplicate = await Lead.findOne({ phone });
  }
  if (!duplicate && email) {
    duplicate = await Lead.findOne({ email });
  }
  if (duplicate) {
    return res.status(400).json({ error: "Lead already existed" });
  }

  // Always use 'New' status if not provided
  let status = null;
  if (statusName) {
    status = await Status.findOne({ name: statusName });
  }
  if (!status) {
    status = await Status.findOne({ name: "New" });
  }
  if (!status) return res.status(400).json({ error: "Invalid status" });
  // Set createdBy to Sales Head's userId if creator is Sales Head
  let createdBy = undefined;
  if (req.user.roleName === "Sales Manager") {
    createdBy = req.user.userId;
  }
  const doc = await Lead.create({
    name,
    phone,
    email,
    city,
    source,
    assignedTo: assignedTo || undefined,
    teamId: teamId || undefined,
    status: status._id,
    uploadedBy: req.user.userId,
    history: [{ status: status._id, by: req.user.userId, at: new Date() }],
    ...(createdBy && { createdBy }),
  });
  // Invalidate the cache for the list of leads
  clearCache("/api/leads");

  // Return the populated lead for frontend
  const populated = await Lead.findById(doc._id)
    .populate("status")
    .populate("assignedTo", "name email")
    .populate("teamId", "name lead");
  res
    .status(201)
    .json({ populated, message: "Lead " + email + " created successfully" });
};

export const updateLead = async (req, res) => {
  req.shouldLog = true;
  const role = req.user.roleName;
  let updates = { ...req.body };
  const errorMessage = validateFields({
    name: updates.name,
    phone: updates.phone,
    email: updates.email,
  });

  if (errorMessage != "") {
    return res.status(400).json({ error: errorMessage });
  }
  delete updates.history;
  delete updates.status;
  if (
    !(
      role === "Admin" ||
      role === "Sales Manager" ||
      role === "Sales Representatives" ||
      role === "Sales Team Lead"
    )
  ) {
    // Only allow city update for other roles
    updates = { city: req.body.city };
  }
  const lead = await Lead.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  }).populate([
    { path: "assignedTo", select: "name" },
    { path: "teamId", select: "name" },
    { path: "status", select: "name" },
  ]);
  if (!lead)
    return res.status(404).json({
      error: "Lead updation failed. Lead " + updates.email + " not found",
    });
  // Invalidate caches
  clearCache("/api/leads"); // Clear list cache
  res.json({
    lead,
    message: `Lead ${lead.email} updated successfully. Updated details: 
    Name: ${lead?.name}
    Phone: ${lead?.phone} 
    City: ${lead?.city}
    Source: ${lead?.source}
    College: ${lead?.college.length==0 ? "N/A": lead?.college}
    Year Of Passout: ${lead?.yearOfPassout?.getFullYear() || "N/A"}
    Status: ${lead?.status?.name}
    Assigned to: ${lead.assignedTo?.name || "Not Assigned"}
    Team: ${lead.teamId?.name || "No Team"}`,
    target: lead.email,
  });
};

export const changeStatus = async (req, res) => {
  req.shouldLog = true;
  console.log("changeStatus called by user:", req.user);
  const { statusName, note } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res
      .status(404)
      .json({ error: "Lead with given id not found", target: req.params.id });
  }
  // permission: allow Admin, Sales Head, Sales Head Manager, Sales Team Lead, Sales Representative
  const role = req.user.roleName;
  if (
    ![
      "Admin",
      "Sales Manager",
      "Sales Team Lead",
      "Sales Representatives",
    ].includes(role)
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const status = await Status.findOne({ name: statusName });
  if (!status) return res.status(400).json({ error: "Invalid status" });
  lead.status = status._id;
  lead.history.push({
    status: status._id,
    by: req.user.userId,
    at: new Date(),
  });
  if (note) lead.notes.push(note);
  await lead.save();
  // Invalidate caches
  clearCache("/api/leads"); // Clear list cache
  clearCache(`/api/leads/${lead._id}`);
  clearCache("/api/leads?assignedTo=me");
  clearCache("/api/team/my-team");
  const populated = await Lead.findById(lead._id).populate("status");
  res.json({
    populated,
    message: `Lead ${lead.email} status changed successfully to ${populated.status.name}`,
  });
};

export const addNote = async (req, res) => {
  const { text } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  lead.notes.push(text);
  await lead.save();
  res.status(201).json({ ok: true });
};

export const createFollowUp = async (req, res) => {
  const { dueAt, notes, assignedTo } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const fu = await FollowUp.create({
    lead: lead._id,
    assignedTo: assignedTo || req.user.userId,
    dueAt,
    notes,
  });
  clearCache("/api/leads");
  res.status(201).json(fu);
};

export const listFollowUps = async (req, res) => {
  const items = await (
    await FollowUp.find({ lead: req.params.id }).populate(
      "assignedTo",
      "name email"
    )
  ).sort({ dueAt: 1 });
  res.json(items);
};

export const uploadAttachment = async (req, res) => {
  req.shouldLog = true;
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = `/uploads/${req.file.filename}`;
  const doc = await (
    await import("../models/Attachment.js")
  ).default.create({
    lead: req.params.id,
    fileUrl: url,
    fileName: req.file.originalname,
    uploadedBy: req.user.userId,
  });
  res.status(201).json({
    doc,
    message: "Attachment" + req.file.originalname + " uploaded successfully",
  });
};
export const importLeads = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const source = req.body?.source?.toString().trim();
    if (!source) return res.status(400).json({ error: "Source is required" });

    let statusDoc = await Status.findOne({ name: "New" });
    if (!statusDoc) {
      statusDoc = await Status.create({ name: "New", color: "#10b981" });
    }

    const rows = [];
    const errors = [];
    const toLeadDoc = (row) => {
      const name = (row.name || row.Name || row.fullname || "")
        .toString()
        .trim();
      const phone = (row.phone || row.Phone || row.mobile || "")
        .toString()
        .trim();
      const email =
        (row.email || row.Email || "").toString().trim() || undefined;
      const city = (row.city || row.City || "").toString().trim() || undefined;

      if (!name) return { error: "Missing name" };
      if (!phone) return { error: "Missing phone" };
      // basic phone validation: 7-15 digits allowing +, space, -
      const normalized = phone.replace(/[^0-9]/g, "");
      if (normalized.length < 7 || normalized.length > 15)
        return { error: "Invalid phone" };

      return {
        name,
        phone,
        email,
        city,
        source,
        status: statusDoc._id,
        uploadedBy: req.user.userId,
        history: [
          { status: statusDoc._id, by: req.user.userId, at: new Date() },
        ],
      };
    };

    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer);
      stream
        .pipe(csv())
        .on("data", (row) => {
          const doc = toLeadDoc(row);
          if (doc.error) {
            errors.push({ row, error: doc.error });
          } else {
            rows.push(doc);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) {
      return res
        .status(200)
        .json({ inserted: 0, skipped: errors.length, errors });
    }
    // ✅ Check for duplicates before insertion
    const validRows = [];
    for (const row of rows) {
      let duplicate = null;
      if (row.phone) {
        duplicate = await Lead.findOne({ phone: row.phone });
      }
      if (!duplicate && row.email) {
        duplicate = await Lead.findOne({ email: row.email });
      }
      if (duplicate) {
        errors.push({ row, error: "Lead already existed" });
        continue;
      }
      validRows.push(row);
    }

    if (validRows.length === 0) {
      return res
        .status(200)
        .json({ inserted: 0, skipped: errors.length, errors });
    }

    const inserted = await Lead.insertMany(validRows);
    req.logInfo = {
      message: "Leads imported successfully from " + req.file.originalname,
    };
    clearCache("/api/leads");
    res
      .status(201)
      .json({ inserted: inserted.length, skipped: errors.length, errors });
  } catch (e) {
    console.error("Import failed:", e);
    req.logInfo = {
      error: "Leads import failed from " + req.file.originalname,
    };
    res.status(500).json({ error: "Import failed" });
  }
};

// export const importLeads = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
//     const source = req.body?.source?.toString().trim();
//     if (!source) return res.status(400).json({ error: 'Source is required' });

//     let statusDoc = await Status.findOne({ name: 'New' });
//     if (!statusDoc) {
//       statusDoc = await Status.create({ name: 'New', color: '#10b981' });
//     }

//     const rows = [];
//     const errors = [];
//     const toLeadDoc = (row) => {
//       const name = (row.name || row.Name || row.fullname || '').toString().trim();
//       const phone = (row.phone || row.Phone || row.mobile || '').toString().trim();
//       const email = (row.email || row.Email || '').toString().trim() || undefined;
//       const city = (row.city || row.City || '').toString().trim() || undefined;

//       if (!name) return { error: 'Missing name' };
//       if (!phone) return { error: 'Missing phone' };
//       // basic phone validation: 7-15 digits allowing +, space, -
//       const normalized = phone.replace(/[^0-9]/g, '');
//       if (normalized.length < 7 || normalized.length > 15) return { error: 'Invalid phone' };

//       return {
//         name,
//         phone,
//         email,
//         city,
//         source,
//         status: statusDoc._id,
//         history: [{ status: statusDoc._id, by: req.user.userId, at: new Date() }]
//       };
//     };

//     await new Promise((resolve, reject) => {
//       const stream = Readable.from(req.file.buffer);
//       stream
//         .pipe(csv())
//         .on('data', (row) => {
//           const doc = toLeadDoc(row);
//           if (doc.error) {
//             errors.push({ row, error: doc.error });
//           } else {
//             rows.push(doc);
//           }
//         })
//         .on('end', resolve)
//         .on('error', reject);
//     });

//     if (rows.length === 0) {
//       return res.status(200).json({ inserted: 0, skipped: errors.length, errors });
//     }

//     // Check for duplicates before insertion
//     const validRows = [];
//     for (const row of rows) {
//       // Check for duplicate by either phone or email
//       let duplicate = null;
//       if (row.phone) {
//         duplicate = await Lead.findOne({ phone: row.phone });
//       }
//       if (!duplicate && row.email) {
//         duplicate = await Lead.findOne({ email: row.email });
//       }
//       if (duplicate) {
//         errors.push({ row, error: 'Lead already existed' });
//         continue;
//       }
//       validRows.push(row);
//     }

//     if (validRows.length === 0) {
//       return res.status(200).json({ inserted: 0, skipped: errors.length, errors });
//     }

//     const inserted = await Lead.insertMany(validRows);
//     res.status(201).json({ inserted: inserted.length, skipped: errors.length, errors });
//   } catch (e) {
//     console.error('Import failed:', e);
//     res.status(500).json({ error: 'Import failed' });
//   }

//     const inserted = await Lead.insertMany(rows, { ordered: false });
//     req.logInfo = {
//       message:
//         "Leads imported successfully from the file:" + req.file.originalname,
//     };
//     clearCache('/api/leads');
//     res.status(201).json({ inserted: inserted.length, skipped: errors.length, errors });
//   } catch (e) {
//     console.error('Import failed:', e);
//     req.logInfo = {
//       error: "Leads import failed from the file:" + req.file.originalname,
//     };
//     res.status(500).json({ error: 'Import failed' });
//   }
// };
// export const importLeads = async (req, res) => {
//   try {
//     // ✅ Step 1: Validate file and source
//     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
//     const source = req.body?.source?.toString().trim();
//     if (!source) return res.status(400).json({ error: 'Source is required' });

//     // ✅ Step 2: Ensure "New" status exists
//     let statusDoc = await Status.findOne({ name: 'New' });
//     if (!statusDoc) {
//       statusDoc = await Status.create({ name: 'New', color: '#10b981' });
//     }

//     // ✅ Step 3: Parse CSV rows
//     const rows = [];
//     const errors = [];

//     const toLeadDoc = (row) => {
//       const name = (row.name || row.Name || row.fullname || '').toString().trim();
//       const phone = (row.phone || row.Phone || row.mobile || '').toString().trim();
//       const email = (row.email || row.Email || '').toString().trim() || undefined;
//       const city = (row.city || row.City || '').toString().trim() || undefined;

//       if (!name) return { error: 'Missing name' };
//       if (!phone) return { error: 'Missing phone' };

//       const normalized = phone.replace(/[^0-9]/g, '');
//       if (normalized.length < 7 || normalized.length > 15)
//         return { error: 'Invalid phone number' };

//       return {
//         name,
//         phone,
//         email,
//         city,
//         source,
//         status: statusDoc._id,
//         history: [{ status: statusDoc._id, by: req.user.userId, at: new Date() }]
//       };
//     };

//     await new Promise((resolve, reject) => {
//       const stream = Readable.from(req.file.buffer);
//       stream
//         .pipe(csv())
//         .on('data', (row) => {
//           const doc = toLeadDoc(row);
//           if (doc.error) {
//             errors.push({ row, error: doc.error });
//           } else {
//             rows.push(doc);
//           }
//         })
//         .on('end', resolve)
//         .on('error', reject);
//     });

//     if (rows.length === 0) {
//       return res.status(200).json({ inserted: 0, skipped: errors.length, errors });
//     }

//     // ✅ Step 4: Remove duplicates (existing leads)
//     const validRows = [];
//     for (const row of rows) {
//       let duplicate = await Lead.findOne({
//         $or: [{ phone: row.phone }, { email: row.email }]
//       });
//       if (duplicate) {
//         errors.push({ row, error: 'Lead already exists' });
//       } else {
//         validRows.push(row);
//       }
//     }

//     if (validRows.length === 0) {
//       return res.status(200).json({ inserted: 0, skipped: errors.length, errors });
//     }

//     // ✅ Step 5: Bulk insert valid leads
//     const inserted = await Lead.insertMany(validRows, { ordered: false });

//     // ✅ Optional logging and cache clearing
//     req.logInfo = {
//       message: `Leads imported successfully from file: ${req.file.originalname}`
//     };
//     clearCache('/api/leads');

//     // ✅ Step 6: Return summary
//     return res.status(201).json({
//       inserted: inserted.length,
//       skipped: errors.length,
//       errors
//     });
//   } catch (e) {
//     console.error('Import failed:', e);
//     req.logInfo = {
//       error: `Leads import failed from file: ${req.file?.originalname || 'unknown'}`
//     };
//     return res.status(500).json({ error: 'Import failed' });
//   }
// };

export const bulkAssignLeads = async (req, res) => {
  console.log("bulk upload function ............", req.body);
  try {
    const { leadIds, teamId } = req.body;

    // ✅ Validate input
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: "Lead IDs are required" });
    }
    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }

    // ✅ Check if team exists and get team members
    const Team = (await import("../models/Team.js")).default;
    const team = await Team.findById(teamId).populate("members");
    if (!team) return res.status(404).json({ error: "Team not found" });

    const teamMembers = team.members || [];
    if (teamMembers.length === 0) {
      return res
        .status(400)
        .json({ error: "Team has no members. Please add members first." });
    }

    // ✅ Verify leads exist and are unassigned
    const leads = await Lead.find({
      _id: { $in: leadIds },
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { teamId: { $exists: false } },
        { teamId: null },
      ],
    });

    if (leads.length !== leadIds.length) {
      return res.status(400).json({
        error: `Some leads are already assigned or don't exist. Found ${leads.length} unassigned leads out of ${leadIds.length} requested.`,
      });
    }

    // ✅ Calculate fair distribution
    const leadCount = leads.length;
    const memberCount = teamMembers.length;
    const baseLeadsPerMember = Math.floor(leadCount / memberCount);
    const extraLeads = leadCount % memberCount;

    // ✅ Assignment plan
    const assignments = [];
    let leadIndex = 0;
    teamMembers.forEach((member, memberIndex) => {
      const leadsForThisMember =
        baseLeadsPerMember + (memberIndex < extraLeads ? 1 : 0);
      for (let i = 0; i < leadsForThisMember; i++) {
        if (leadIndex < leadCount) {
          assignments.push({
            leadId: leads[leadIndex]._id,
            assignedTo: member._id,
            teamId,
          });
          leadIndex++;
        }
      }
    });

    // ✅ Update leads in DB
    const updatePromises = assignments.map((assignment) =>
      Lead.findByIdAndUpdate(
        assignment.leadId,
        {
          assignedTo: assignment.assignedTo,
          teamId: assignment.teamId,
          $push: {
            history: {
              status: leads.find(
                (l) => l._id.toString() === assignment.leadId.toString()
              ).status,
              by: req.user.userId,
              at: new Date(),
              action: "assigned_to_team",
            },
          },
        },
        { new: true }
      )
    );
    await Promise.all(updatePromises);

    // ✅ Update team.leadsAssigned (handles null → array)
    if (!team.leadsAssigned) {
      team.leadsAssigned = [];
    }
    team.leadsAssigned.push(...leadIds);
    await team.save();

    req.logInfo = {
      message: `${leadCount} leads assigned to team "${team.name}"`,
    };
    clearCache("/api/leads");
    // ✅ Response
    res.json({
      success: true,
      message: `${leadCount} leads assigned to team "${team.name}"`,
      assignments: assignments.length,
      distribution: teamMembers.map((member, index) => ({
        memberName: member.name,
        leadCount: baseLeadsPerMember + (index < extraLeads ? 1 : 0),
      })),
      leadsAssigned: team.leadsAssigned,
    });
  } catch (error) {
    console.error("Bulk assignment failed:", error);
    req.logInfo = { error: "Failed to assign leads" };
    res.status(500).json({ error: "Failed to assign leads" });
  }
};

export const deleteLead = async (req, res) => {
  let lead = null;
  try {
    req.shouldLog = true;
    // 🔍 Find and delete lead
    lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    console.log("🗑️ Deleted lead:", lead);

    // 🧹 Clear related caches
    clearCache("/api/leads");
    clearCache(`/api/leads/${lead._id}`);
    clearCache("/api/team/my-team");
    clearCache("/api/leads?assignedTo=me");

    // ✅ Send success response
    res.status(200).json({
      success: true,
      message: `Lead ${lead.email || lead.name} deleted successfully`,
    });
  } catch (e) {
    console.error("❌ Error deleting lead:", e);
    res.status(500).json({
      error: `Failed to delete lead${lead?.email ? ": " + lead.email : ""}`,
    });
  }
};

export const addCommentToLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    // // 1️⃣ Validate ID
    // if (!mongoose.Types.ObjectId.isValid(id)) {
    //   return res.status(400).json({ error: "Invalid lead ID" });
    // }

    // 2️⃣ Validate comment text
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comment text is required" });
    }

    // 3️⃣ Find lead
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // 5️⃣ Ensure req.user exists (for testing fallback)
    const userId = req.user?.userId || null; // or use a fallback test user if needed
    console.log("Adding comment by userId:", userId);
    // 6️⃣ Push comment into comments array
    lead.comments.push({
      text: text.trim(),
      by: userId,
      at: new Date(),
    });

    // 7️⃣ Save updated lead
    await lead.save();

    // 8️⃣ Repopulate for frontend
    const updatedLead = await Lead.findById(id)
      .populate("comments.by", "name email")
      .select("comments");
    clearCache(`/api/leads/${lead._id}`);
    req.logInfo = {message: "Comment added successfully to lead: "+lead.email}
    return res.status(201).json({
      message: "Comment added successfully to lead "+lead.email,
      comments: updatedLead.comments,
    });
  } catch (err) {
    console.error("❌ Error adding comment:", err);
    req.logInfo = {errpr:"Failed to add comment to lead: "+lead.email+". Error: "+err.message}
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
