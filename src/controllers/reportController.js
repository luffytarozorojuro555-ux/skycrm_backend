import { generateManagerReport } from "../services/reportService.js";
import User from "../models/User.js";
import Team from "../models/Team.js";

export const generateReport = async (req, res) => {
  try {
    const managerId = req.user?.userId;
    const { type, start, end } = req.query;

    if (!managerId) {
      return res.status(400).json({ error: "Manager ID missing" });
    }

    const managerData = await User.findById(managerId).select("name email");

    const now = new Date();
    let toDate = now;
    let fromDate;
    switch (type) {
      case "today":
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week":
        toDate = now;
        break;
      case "15days":
        toDate = now;
        break;
      case "month":
        toDate = now;
        break;
      case "3month":
        toDate = now;
        break;
      case "custom":
        if (end) {
          fromDate = new Date(start);
          toDate = new Date(end);
        }
        break;
      default:
        toDate = now;
    }

    console.log("Snapshot at:", toDate);

    const teams = await Team.find({ manager: managerId })
      .populate("manager", "name email")
      .populate("members", "name email")
      .populate({
        path: "leadsAssigned",
        select: "name phone email city source status history assignedTo",
        populate: [
          { path: "assignedTo", select: "name email" },
          { path: "status", select: "name" },
          { path: "history.status", select: "name" }
        ],
      });

    const pdfBuffer = await generateManagerReport(
      managerData,
      teams,
      fromDate,
      toDate
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Manager_Report_${type || "All"}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(Buffer.from(pdfBuffer));

  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
