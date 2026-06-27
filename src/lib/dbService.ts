import { db, auth, isMockFirebase } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
} from "firebase/firestore";
import { analyzeReport, detectDuplicateReport } from "./gemini";

// Helper types
export interface Report {
  id: string;
  reportId?: string;
  uid: string;
  title: string;
  description: string;
  category: string;
  aiSummary: string;
  aiConfidence?: number;
  priorityScore: number;
  severity: "low" | "medium" | "high" | "critical";
  crisisFlag: boolean;
  status: "submitted" | "under_review" | "verified" | "in_progress" | "resolved" | "rejected" | "duplicate";
  location: { lat: number; lng: number };
  addressText: string;
  photoUrls: string[];
  voiceNoteUrl?: string;
  duplicateOf: string | null;
  upvoteCount: number;
  confirmedCount: number;
  createdAt: string;
  updatedAt: string;
  assignedDepartment: string;
  visibility: "public" | "private" | "hidden";
  safetyInstructions?: string;
}

export interface Comment {
  id: string;
  reportId: string;
  uid: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  alertId?: string;
  reportId: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  geoArea: { lat: number; lng: number; radiusKm: number };
  createdBy: string;
  status: "active" | "expired";
  expiresAt: string;
  createdAt: string;
  safetyInstructions?: string;
}

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  targetType: string;
  targetId: string;
  actionType: string;
  note: string;
  createdAt: string;
}

// ----------------------------------------------------
// DB SERVICE ACTIONS
// ----------------------------------------------------

/**
 * Creates a new civic report. Runs AI classification, summary, and duplicate checks.
 */
export async function createReport(reportData: {
  title: string;
  description: string;
  location: { lat: number; lng: number };
  addressText: string;
  photoUrls: string[];
  uid: string;
}): Promise<Report> {
  // 1. Run AI analysis
  const aiResult = await analyzeReport(reportData.title, reportData.description);

  // 2. Fetch existing reports to check for duplicates
  const allExisting = await getReports();
  const nearbyExisting = allExisting.filter((r) => {
    // Proximity threshold: roughly within 0.05 degrees of lat/lng (~5km)
    const latDiff = Math.abs(r.location.lat - reportData.location.lat);
    const lngDiff = Math.abs(r.location.lng - reportData.location.lng);
    return latDiff < 0.05 && lngDiff < 0.05 && r.category === aiResult.category;
  });

  let duplicateOfId: string | null = null;
  if (nearbyExisting.length > 0) {
    const dupCheck = await detectDuplicateReport(
      { title: reportData.title, description: reportData.description },
      nearbyExisting.map((r) => ({ id: r.id, title: r.title, aiSummary: r.aiSummary }))
    );
    if (dupCheck.isDuplicate) {
      duplicateOfId = dupCheck.duplicateOfId;
    }
  }

  const newReport: Omit<Report, "id"> = {
    uid: reportData.uid,
    title: reportData.title,
    description: reportData.description,
    category: aiResult.category,
    aiSummary: aiResult.aiSummary,
    priorityScore: aiResult.priorityScore,
    severity: aiResult.severity,
    crisisFlag: aiResult.crisisFlag,
    status: duplicateOfId ? "duplicate" : "submitted",
    location: reportData.location,
    addressText: reportData.addressText,
    photoUrls: reportData.photoUrls,
    duplicateOf: duplicateOfId,
    upvoteCount: 0,
    confirmedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedDepartment: aiResult.assignedDepartment,
    visibility: "public",
    safetyInstructions: aiResult.safetyInstructions,
  };

  if (isMockFirebase) {
    const id = "rep-" + Math.random().toString(36).substring(7);
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    const createdReport = { ...newReport, id };
    reports[id] = createdReport;
    localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));

    // Status History
    await addStatusHistory(id, "none", createdReport.status, "system", "Report initialized by AI analysis.");
    
    // Auto-create notification if crisis
    if (createdReport.crisisFlag) {
      await createNotification("all", "CRISIS_ALERT", `CRITICAL: ${createdReport.title}`, createdReport.aiSummary, `/report?id=${id}`);
    }

    return createdReport;
  } else {
    const docRef = await addDoc(collection(db, "reports"), newReport);
    const createdReport = { ...newReport, id: docRef.id };

    // Update with reportId field
    await updateDoc(doc(db, "reports", docRef.id), { reportId: docRef.id });

    // Status History
    await addStatusHistory(docRef.id, "none", createdReport.status, "system", "Report initialized by AI analysis.");

    return createdReport;
  }
}

/**
 * Gets all reports
 */
export async function getReports(): Promise<Report[]> {
  if (isMockFirebase) {
    let reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    if (Object.keys(reports).length === 0) {
      const MOCK_SEED_REPORTS: Report[] = [
        {
          id: "rep-seed-1",
          uid: "mock-uid-system",
          title: "Major Pothole on Market Street",
          description: "A huge pothole has formed in the middle lane of Market St. Cars are swerving to avoid it, causing traffic delays.",
          category: "pothole",
          aiSummary: "Large pothole in middle lane on Market St causing traffic hazard.",
          priorityScore: 75,
          severity: "high",
          crisisFlag: false,
          status: "verified",
          location: { lat: 37.7785, lng: -122.4156 },
          addressText: "Market St & 9th St, San Francisco, CA 94103",
          photoUrls: ["https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80"],
          duplicateOf: null,
          upvoteCount: 14,
          confirmedCount: 8,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          assignedDepartment: "Department of Public Works",
          visibility: "public",
          safetyInstructions: "Slow down and avoid the middle lane when moving east on Market St."
        },
        {
          id: "rep-seed-2",
          uid: "mock-uid-system",
          title: "Water Main Leak on Mission St",
          description: "Clean water is gushing out from under the pavement on Mission St near 16th. The street is starting to flood.",
          category: "water_leak",
          aiSummary: "Water main rupture causing localized flooding on Mission St.",
          priorityScore: 85,
          severity: "high",
          crisisFlag: true,
          status: "in_progress",
          location: { lat: 37.7650, lng: -122.4200 },
          addressText: "2000 Mission St, San Francisco, CA 94110",
          photoUrls: ["https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80"],
          duplicateOf: null,
          upvoteCount: 22,
          confirmedCount: 12,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          assignedDepartment: "Water & Sewer Department",
          visibility: "public",
          safetyInstructions: "Be cautious of slippery roads. Pedestrians should use the west sidewalk."
        },
        {
          id: "rep-seed-3",
          uid: "mock-uid-system",
          title: "Electrical Cable Sparking near Union Square",
          description: "An overhead power cable is sparking occasionally near the intersection of Geary and Stockton. Sparks are falling to the sidewalk.",
          category: "fire",
          aiSummary: "Sparking overhead electrical lines dropping hot sparks onto public walkway.",
          priorityScore: 95,
          severity: "critical",
          crisisFlag: true,
          status: "verified",
          location: { lat: 37.7876, lng: -122.4066 },
          addressText: "Geary St & Stockton St, San Francisco, CA 94108",
          photoUrls: [],
          duplicateOf: null,
          upvoteCount: 45,
          confirmedCount: 28,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          assignedDepartment: "Fire Department / PG&E Office",
          visibility: "public",
          safetyInstructions: "Do not walk directly underneath the wires. PG&E team is dispatched."
        },
        {
          id: "rep-seed-4",
          uid: "mock-uid-system",
          title: "Garbage Pileup blocking sidewalk in SOMA",
          description: "Multiple bags of trash, cardboard boxes, and large electronic waste have been dumped on the sidewalk. Pedestrians are forced to walk on the street.",
          category: "garbage",
          aiSummary: "Illegal dumping on sidewalk forcing pedestrians into the street lane.",
          priorityScore: 40,
          severity: "medium",
          crisisFlag: false,
          status: "submitted",
          location: { lat: 37.7712, lng: -122.4111 },
          addressText: "850 Folsom St, San Francisco, CA 94107",
          photoUrls: [],
          duplicateOf: null,
          upvoteCount: 5,
          confirmedCount: 2,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          assignedDepartment: "Sanitation & Waste",
          visibility: "public",
          safetyInstructions: "Watch for traffic when bypassing the blocked sidewalk section."
        }
      ];
      reports = MOCK_SEED_REPORTS.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as { [key: string]: Report });
      localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));
    }
    return Object.values(reports);
  } else {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Report));
  }
}

/**
 * Gets a single report by ID
 */
export async function getReportById(id: string): Promise<Report | null> {
  if (isMockFirebase) {
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    return reports[id] || null;
  } else {
    const docRef = doc(db, "reports", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as Report) : null;
  }
}

/**
 * Upvotes a report
 */
export async function upvoteReport(reportId: string, uid: string): Promise<number> {
  const voteKey = `vote-${reportId}-${uid}`;
  if (isMockFirebase) {
    const votes = JSON.parse(localStorage.getItem("civicpulse_db_votes") || "{}");
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    
    if (votes[voteKey]) {
      // Remove vote
      delete votes[voteKey];
      if (reports[reportId]) reports[reportId].upvoteCount = Math.max(0, (reports[reportId].upvoteCount || 0) - 1);
    } else {
      // Add vote
      votes[voteKey] = { voteId: voteKey, reportId, uid, type: "upvote", createdAt: new Date().toISOString() };
      if (reports[reportId]) reports[reportId].upvoteCount = (reports[reportId].upvoteCount || 0) + 1;
    }
    
    localStorage.setItem("civicpulse_db_votes", JSON.stringify(votes));
    localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));
    return reports[reportId]?.upvoteCount || 0;
  } else {
    // Real implementation (checks votes collection and increments)
    const voteRef = doc(db, "votes", voteKey);
    const voteSnap = await getDoc(voteRef);
    const reportRef = doc(db, "reports", reportId);

    if (voteSnap.exists()) {
      // Remove
      await setDoc(voteRef, {}); // delete or mock delete
      await updateDoc(reportRef, { upvoteCount: increment(-1) });
    } else {
      await setDoc(voteRef, { reportId, uid, type: "upvote", createdAt: new Date().toISOString() });
      await updateDoc(reportRef, { upvoteCount: increment(1) });
    }
    const updatedReport = await getDoc(reportRef);
    return updatedReport.data()?.upvoteCount || 0;
  }
}

/**
 * Confirms proximity/validity of a nearby report
 */
export async function confirmReport(reportId: string, uid: string): Promise<number> {
  const confirmKey = `confirm-${reportId}-${uid}`;
  if (isMockFirebase) {
    const votes = JSON.parse(localStorage.getItem("civicpulse_db_votes") || "{}");
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    
    if (votes[confirmKey]) {
      delete votes[confirmKey];
      if (reports[reportId]) reports[reportId].confirmedCount = Math.max(0, (reports[reportId].confirmedCount || 0) - 1);
    } else {
      votes[confirmKey] = { voteId: confirmKey, reportId, uid, type: "confirm", createdAt: new Date().toISOString() };
      if (reports[reportId]) reports[reportId].confirmedCount = (reports[reportId].confirmedCount || 0) + 1;
    }
    
    localStorage.setItem("civicpulse_db_votes", JSON.stringify(votes));
    localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));
    return reports[reportId]?.confirmedCount || 0;
  } else {
    const confirmRef = doc(db, "votes", confirmKey);
    const confirmSnap = await getDoc(confirmRef);
    const reportRef = doc(db, "reports", reportId);

    if (confirmSnap.exists()) {
      await setDoc(confirmRef, {});
      await updateDoc(reportRef, { confirmedCount: increment(-1) });
    } else {
      await setDoc(confirmRef, { reportId, uid, type: "confirm", createdAt: new Date().toISOString() });
      await updateDoc(reportRef, { confirmedCount: increment(1) });
    }
    const updatedReport = await getDoc(reportRef);
    return updatedReport.data()?.confirmedCount || 0;
  }
}

/**
 * Adds a comment
 */
export async function addComment(reportId: string, uid: string, displayName: string, photoURL: string, text: string): Promise<Comment> {
  const comment: Omit<Comment, "id"> = {
    reportId,
    uid,
    displayName,
    photoURL,
    text,
    createdAt: new Date().toISOString(),
  };

  if (isMockFirebase) {
    const id = "com-" + Math.random().toString(36).substring(7);
    const comments = JSON.parse(localStorage.getItem("civicpulse_db_comments") || "{}");
    const createdComment = { ...comment, id };
    comments[id] = createdComment;
    localStorage.setItem("civicpulse_db_comments", JSON.stringify(comments));
    return createdComment;
  } else {
    const docRef = await addDoc(collection(db, "comments"), comment);
    return { ...comment, id: docRef.id };
  }
}

/**
 * Gets comments for a report
 */
export async function getComments(reportId: string): Promise<Comment[]> {
  if (isMockFirebase) {
    const comments = JSON.parse(localStorage.getItem("civicpulse_db_comments") || "{}");
    return Object.values(comments).filter((c: any) => c.reportId === reportId) as Comment[];
  } else {
    const q = query(collection(db, "comments"), where("reportId", "==", reportId), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Comment));
  }
}

// ----------------------------------------------------
// ADMIN OPERATIONS
// ----------------------------------------------------

/**
 * Verifies or rejects a report, logs status change, and updates database
 */
export async function adminVerifyReport(
  reportId: string,
  adminUid: string,
  adminEmail: string,
  action: "verify" | "reject" | "in_progress" | "resolve",
  note: string
): Promise<void> {
  const statusMapping = {
    verify: "verified",
    reject: "rejected",
    in_progress: "in_progress",
    resolve: "resolved",
  } as const;

  const targetStatus = statusMapping[action];

  if (isMockFirebase) {
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    if (reports[reportId]) {
      const oldStatus = reports[reportId].status;
      reports[reportId].status = targetStatus;
      reports[reportId].updatedAt = new Date().toISOString();
      localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));

      await addStatusHistory(reportId, oldStatus, targetStatus, adminUid, note);
      await addAuditLog(adminUid, adminEmail, "report", reportId, action.toUpperCase(), note);
      await createNotification(
        reports[reportId].uid,
        "STATUS_UPDATE",
        `Report Status Updated`,
        `Your report "${reports[reportId].title}" is now marked as ${targetStatus.replace("_", " ")}.`,
        `/report?id=${reportId}`
      );
    }
  } else {
    const reportRef = doc(db, "reports", reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (reportSnap.exists()) {
      const oldStatus = reportSnap.data().status;
      await updateDoc(reportRef, {
        status: targetStatus,
        updatedAt: new Date().toISOString(),
      });

      await addStatusHistory(reportId, oldStatus, targetStatus, adminUid, note);
      await addAuditLog(adminUid, adminEmail, "report", reportId, action.toUpperCase(), note);
      await createNotification(
        reportSnap.data().uid,
        "STATUS_UPDATE",
        `Report Status Updated`,
        `Your report "${reportSnap.data().title}" is now marked as ${targetStatus.replace("_", " ")}.`,
        `/report?id=${reportId}`
      );
    }
  }
}

/**
 * Merges a report as duplicate of another
 */
export async function adminMergeReport(
  reportId: string,
  duplicateOfId: string,
  adminUid: string,
  adminEmail: string,
  note: string
): Promise<void> {
  if (isMockFirebase) {
    const reports = JSON.parse(localStorage.getItem("civicpulse_db_reports") || "{}");
    if (reports[reportId] && reports[duplicateOfId]) {
      const oldStatus = reports[reportId].status;
      reports[reportId].status = "duplicate";
      reports[reportId].duplicateOf = duplicateOfId;
      reports[reportId].updatedAt = new Date().toISOString();
      localStorage.setItem("civicpulse_db_reports", JSON.stringify(reports));

      await addStatusHistory(reportId, oldStatus, "duplicate", adminUid, `Merged as duplicate of report #${duplicateOfId}. ${note}`);
      await addAuditLog(adminUid, adminEmail, "report", reportId, "MERGE", `Merged duplicate into #${duplicateOfId}.`);
    }
  } else {
    const reportRef = doc(db, "reports", reportId);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      const oldStatus = reportSnap.data().status;
      await updateDoc(reportRef, {
        status: "duplicate",
        duplicateOf: duplicateOfId,
        updatedAt: new Date().toISOString(),
      });
      await addStatusHistory(reportId, oldStatus, "duplicate", adminUid, `Merged as duplicate of report #${duplicateOfId}. ${note}`);
      await addAuditLog(adminUid, adminEmail, "report", reportId, "MERGE", `Merged duplicate into #${duplicateOfId}.`);
    }
  }
}

/**
 * Publishes a system-wide crisis alert
 */
export async function adminPublishAlert(alertData: {
  reportId: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  geoArea: { lat: number; lng: number; radiusKm: number };
  createdBy: string;
  adminEmail: string;
  expiresInHours: number;
}): Promise<Alert> {
  const newAlert: Omit<Alert, "id"> = {
    reportId: alertData.reportId,
    title: alertData.title,
    message: alertData.message,
    severity: alertData.severity,
    geoArea: alertData.geoArea,
    createdBy: alertData.createdBy,
    status: "active",
    expiresAt: new Date(Date.now() + alertData.expiresInHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    safetyInstructions: alertData.message, // fallback
  };

  // Pull safety instruction from AI analysis if available
  const report = await getReportById(alertData.reportId);
  if (report) {
    newAlert.safetyInstructions = report.safetyInstructions || alertData.message;
  }

  if (isMockFirebase) {
    const id = "alt-" + Math.random().toString(36).substring(7);
    const alerts = JSON.parse(localStorage.getItem("civicpulse_db_alerts") || "{}");
    const createdAlert = { ...newAlert, id };
    alerts[id] = createdAlert;
    localStorage.setItem("civicpulse_db_alerts", JSON.stringify(alerts));

    await addAuditLog(alertData.createdBy, alertData.adminEmail, "alert", id, "PUBLISH_ALERT", `Published alert: ${alertData.title}`);
    await createNotification("all", "CRISIS_ALERT", `ALERT: ${alertData.title}`, alertData.message, `/alerts`);

    return createdAlert;
  } else {
    const docRef = await addDoc(collection(db, "alerts"), newAlert);
    await updateDoc(doc(db, "alerts", docRef.id), { alertId: docRef.id });
    await addAuditLog(alertData.createdBy, alertData.adminEmail, "alert", docRef.id, "PUBLISH_ALERT", `Published alert: ${alertData.title}`);
    await createNotification("all", "CRISIS_ALERT", `ALERT: ${alertData.title}`, alertData.message, `/alerts`);
    return { ...newAlert, id: docRef.id };
  }
}

/**
 * Gets all active alerts
 */
export async function getAlerts(): Promise<Alert[]> {
  if (isMockFirebase) {
    const alerts = JSON.parse(localStorage.getItem("civicpulse_db_alerts") || "{}");
    return Object.values(alerts).filter((a: any) => {
      const isExpired = new Date(a.expiresAt).getTime() < Date.now();
      return a.status === "active" && !isExpired;
    }) as Alert[];
  } else {
    const q = query(collection(db, "alerts"), where("status", "==", "active"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ ...doc.data(), id: doc.id } as Alert))
      .filter((a) => new Date(a.expiresAt).getTime() > Date.now());
  }
}

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------

async function addStatusHistory(reportId: string, fromStatus: string, toStatus: string, changedBy: string, note: string) {
  const history = {
    reportId,
    fromStatus,
    toStatus,
    changedBy,
    note,
    timestamp: new Date().toISOString(),
  };

  if (isMockFirebase) {
    const data = JSON.parse(localStorage.getItem("civicpulse_db_status_history") || "{}");
    const id = "hist-" + Math.random().toString(36).substring(7);
    data[id] = { ...history, id };
    localStorage.setItem("civicpulse_db_status_history", JSON.stringify(data));
  } else {
    await addDoc(collection(db, "report_status_history"), history);
  }
}

export async function getStatusHistory(reportId: string): Promise<any[]> {
  if (isMockFirebase) {
    const history = JSON.parse(localStorage.getItem("civicpulse_db_status_history") || "{}");
    return Object.values(history)
      .filter((h: any) => h.reportId === reportId)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } else {
    const q = query(collection(db, "report_status_history"), where("reportId", "==", reportId), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  }
}

async function addAuditLog(adminUid: string, adminEmail: string, targetType: string, targetId: string, actionType: string, note: string) {
  const log: Omit<AuditLog, "id"> = {
    adminUid,
    adminEmail,
    targetType,
    targetId,
    actionType,
    note,
    createdAt: new Date().toISOString(),
  };

  if (isMockFirebase) {
    const data = JSON.parse(localStorage.getItem("civicpulse_db_audit_logs") || "{}");
    const id = "audit-" + Math.random().toString(36).substring(7);
    data[id] = { ...log, id };
    localStorage.setItem("civicpulse_db_audit_logs", JSON.stringify(data));
  } else {
    await addDoc(collection(db, "admin_actions"), log);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isMockFirebase) {
    const data = JSON.parse(localStorage.getItem("civicpulse_db_audit_logs") || "{}");
    return Object.values(data).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as AuditLog[];
  } else {
    const q = query(collection(db, "admin_actions"), orderBy("createdAt", "desc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
  }
}

export async function createNotification(uid: string, type: string, title: string, body: string, targetUrl: string) {
  const notif = {
    uid, // "all" or specific uid
    type,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
    targetUrl,
  };

  if (isMockFirebase) {
    const data = JSON.parse(localStorage.getItem("civicpulse_db_notifications") || "{}");
    const id = "notif-" + Math.random().toString(36).substring(7);
    data[id] = { ...notif, id };
    localStorage.setItem("civicpulse_db_notifications", JSON.stringify(data));
  } else {
    await addDoc(collection(db, "notifications"), notif);
  }
}

export async function getNotifications(uid: string): Promise<any[]> {
  if (isMockFirebase) {
    const data = JSON.parse(localStorage.getItem("civicpulse_db_notifications") || "{}");
    return Object.values(data)
      .filter((n: any) => n.uid === uid || n.uid === "all")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    const q = query(collection(db, "notifications"), where("uid", "in", [uid, "all"]), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  }
}

/**
 * Computes an analytics snapshot
 */
export async function getAnalyticsSnapshot() {
  const reports = await getReports();
  const alerts = await getAlerts();

  const openReports = reports.filter((r) => ["submitted", "under_review", "verified", "in_progress"].includes(r.status)).length;
  const resolvedReports = reports.filter((r) => r.status === "resolved").length;

  const categoryMap: { [key: string]: number } = {};
  reports.forEach((r) => {
    categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
  });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  // Collect hotspots (locations with high density)
  const hotspots = reports
    .filter((r) => r.status !== "resolved")
    .map((r) => ({
      lat: r.location.lat,
      lng: r.location.lng,
      severity: r.severity,
      title: r.title,
    }));

  return {
    openReports,
    resolvedReports,
    topCategories,
    hotspots,
    crisisCount: alerts.length,
    avgResolutionTime: "24.5 hours", // Mock value
  };
}
