
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  getDocs,
  limit,
  startAfter,
  increment,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { PaymentStatus, Registration } from "./types.ts";
// import { COMPETITIONS } from "./constants.tsx";

const firebaseConfig = {
  apiKey: "AIzaSyDcc2W-6lrl1viJqoWHI3-Pn7tKHzXNP9c",
  authDomain: "cognotsavregistration.firebaseapp.com",
  projectId: "cognotsavregistration",
  storageBucket: "cognotsavregistration.firebasestorage.app",
  messagingSenderId: "1045571800544",
  appId: "1:1045571800544:web:bc567e489b84d222746f85",
  measurementId: "G-9YN3PGSQSD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- Firestore Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

const sanitizeRegistrationData = (formData: Record<string, unknown>) => {
  return {
    teamName: String(formData.teamName || ""),
    leaderName: String(formData.leaderName || ""),
    email: String(formData.email || ""),
    mobile: String(formData.mobile || ""),
    college: String(formData.college || ""),
    collegeType: String(formData.collegeType || ""),
    otherCollege: String(formData.otherCollege || ""),
    transactionId: String(formData.transactionId || ""),
    teamSize: Number(formData.teamSize || 1),
    amountPaid: Number(formData.amountPaid || 0),
    members: Array.isArray(formData.members) ? (formData.members as Array<Record<string, unknown>>).map((m) => ({
      name: String(m.name || ""),
      email: String(m.email || ""),
      mobile: String(m.mobile || "")
    })) : []
  };
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const sanitizeDocId = (value: string) => value.replace(/[.#$/[\]]/g, '_');

const getPublicStatusPayload = (competitionName: string, cleanData: ReturnType<typeof sanitizeRegistrationData>, teamId: string) => ({
  teamId,
  competition: competitionName,
  teamName: cleanData.teamName || 'Solo Entry',
  leaderName: cleanData.leaderName,
  email: normalizeEmail(cleanData.email),
  mobile: cleanData.mobile,
  paymentStatus: 'pending',
  amountPaid: cleanData.amountPaid,
  teamSize: cleanData.teamSize,
  submittedAt: serverTimestamp(),
});

const syncPublicRegistrationStatus = async (
  teamId: string,
  payload: Record<string, unknown>
) => {
  await setDoc(doc(db, "public_status", teamId), payload, { merge: true });
};

const syncEmailLookup = async (
  email: string,
  teamId: string,
  mode: 'add' | 'remove'
) => {
  const emailKey = sanitizeDocId(normalizeEmail(email));
  await setDoc(doc(db, "email_lookup", emailKey), {
    email: normalizeEmail(email),
    teamIds: mode === 'add' ? arrayUnion(teamId) : arrayRemove(teamId)
  }, { merge: true });
};

export const submitRegistration = async (competitionName: string, formData: Record<string, unknown>) => {
  try {
    const cleanData = sanitizeRegistrationData(formData);
    
    // Generate a simple teamId
    const teamId = `COG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Save Registration to Firestore
    const docRef = await addDoc(collection(db, "registrations"), {
      competition: String(competitionName),
      teamId,
      ...cleanData,
      status: 'active',
      paymentStatus: 'pending',
      submittedAt: serverTimestamp(),
    });

    // Increment global stats
    const statsRef = doc(db, "stats", "global");
    const teamSize = cleanData.teamSize;
    await setDoc(statsRef, {
      totalGlobalRegistrations: increment(1),
      totalGlobalParticipants: increment(teamSize),
      totalPendingRegistrations: increment(1),
      [`competitions.${competitionName}.pending`]: increment(1)
    }, { merge: true });

    await syncPublicRegistrationStatus(teamId, getPublicStatusPayload(competitionName, cleanData, teamId));
    await syncEmailLookup(cleanData.email, teamId, 'add');

    return { success: true, id: docRef.id, teamId };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, "registrations/stats");
    }
    console.error("Submission error:", error);
    return { success: false, error: "Submission failed. Please check your connection." };
  }
};

export const getRegistrationStatusByQuery = async (queryInput: string) => {
  const input = queryInput.trim();
  if (!input) return [];

  const directRef = doc(db, "public_status", input.toUpperCase());
  const directSnap = await getDoc(directRef);

  if (directSnap.exists()) {
    return [{ id: directSnap.id, ...directSnap.data() }];
  }

  const emailKey = sanitizeDocId(normalizeEmail(input));
  const emailSnap = await getDoc(doc(db, "email_lookup", emailKey));
  if (!emailSnap.exists()) return [];

  const teamIds = Array.isArray(emailSnap.data().teamIds) ? emailSnap.data().teamIds as string[] : [];
  const teams = await Promise.all(teamIds.map(async (teamId) => {
    const teamSnap = await getDoc(doc(db, "public_status", teamId));
    return teamSnap.exists() ? { id: teamSnap.id, ...teamSnap.data() } : null;
  }));

  return teams.filter(Boolean);
};

export const loginAdmin = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutAdmin = () => {
  return signOut(auth);
};

export const checkAdminRole = async (uid: string) => {
  try {
    const docRef = doc(db, "roles", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().role === 'admin';
    }
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, `roles/${uid}`);
    }
    return false;
  }
};

export const getRegistrations = async (
  lastDoc: unknown = null, 
  batchSize: number = 100,
  filters: { competition?: string, statuses?: PaymentStatus[] } = {}
) => {
  try {
    let q = query(
      collection(db, "registrations"), 
      orderBy("submittedAt", "desc"), 
      limit(batchSize)
    );

    if (filters.competition && filters.competition !== 'All Streams') {
      q = query(q, where("competition", "==", filters.competition));
    } else if (filters.statuses && filters.statuses.length > 0) {
      q = query(q, where("paymentStatus", "in", filters.statuses));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const regs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Registration[];

    return {
      registrations: regs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === batchSize
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, "registrations");
    }
    console.error("Fetch failed:", error);
    throw error;
  }
};

export const getAllVerifiedRegistrations = async () => {
  try {
    const q = query(
      collection(db, "registrations"),
      where("paymentStatus", "==", "verified")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Registration[];
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, "registrations");
    }
    console.error("Fetch verified failed:", error);
    throw error;
  }
};

export const getGlobalMetrics = async () => {
  try {
    const statsRef = doc(db, "stats", "global");
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return statsSnap.data();
    }
    
    return {
      totalVerifiedRevenue: 0,
      totalVerifiedRegistrations: 0,
      totalParticipants: 0,
      totalPendingRegistrations: 0,
      totalGlobalRegistrations: 0,
      totalGlobalParticipants: 0,
      competitions: {}
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, "stats/global");
    }
    console.error("Metrics fetch failed:", error);
    return { 
      totalVerifiedRevenue: 0,
      totalVerifiedRegistrations: 0,
      totalParticipants: 0,
      totalPendingRegistrations: 0,
      totalGlobalRegistrations: 0,
      totalGlobalParticipants: 0,
      competitions: {}
    };
  }
};

export const subscribeToGlobalMetrics = (
  callback: (metrics: Record<string, unknown>) => void
) => {
  const statsRef = doc(db, "stats", "global");
  return onSnapshot(statsRef, (statsSnap) => {
    if (statsSnap.exists()) {
      callback(statsSnap.data() as Record<string, unknown>);
    } else {
      callback({
        totalVerifiedRevenue: 0,
        totalVerifiedRegistrations: 0,
        totalParticipants: 0,
        totalPendingRegistrations: 0,
        totalGlobalRegistrations: 0,
        totalGlobalParticipants: 0,
        competitions: {}
      });
    }
  });
};

export const updateRegistrationStatus = async (reg: Registration, newStatus: PaymentStatus) => {
  const regRef = doc(db, "registrations", reg.id);
  const statsRef = doc(db, "stats", "global");
  
  const oldStatus = reg.paymentStatus;
  const teamSize = (reg.members?.length || 0) + 1;
  const amount = Number(reg.amountPaid || 0);
  const compName = reg.competition;

  if (oldStatus === newStatus) return;

  const updates: Record<string, unknown> = {};

  // 1. Remove from old status stats
  if (oldStatus === 'verified') {
    updates.totalVerifiedRevenue = increment(-amount);
    updates.totalVerifiedRegistrations = increment(-1);
    updates.totalParticipants = increment(-teamSize);
    updates[`competitions.${compName}.verified`] = increment(-1);
    updates[`competitions.${compName}.revenue`] = increment(-amount);
  } else if (oldStatus === 'pending') {
    updates.totalPendingRegistrations = increment(-1);
    updates[`competitions.${compName}.pending`] = increment(-1);
  } else if (oldStatus === 'rejected') {
    updates[`competitions.${compName}.rejected`] = increment(-1);
  }

  // 2. Add to new status stats
  if (newStatus === 'verified') {
    updates.totalVerifiedRevenue = increment(amount);
    updates.totalVerifiedRegistrations = increment(1);
    updates.totalParticipants = increment(teamSize);
    updates[`competitions.${compName}.verified`] = increment(1);
    updates[`competitions.${compName}.revenue`] = increment(amount);
  } else if (newStatus === 'pending') {
    updates.totalPendingRegistrations = increment(1);
    updates[`competitions.${compName}.pending`] = increment(1);
  } else if (newStatus === 'rejected') {
    updates[`competitions.${compName}.rejected`] = increment(1);
  }

  await updateDoc(regRef, { paymentStatus: newStatus });
  await syncPublicRegistrationStatus(reg.teamId || reg.id, {
    paymentStatus: newStatus,
    updatedAt: serverTimestamp()
  });
  if (Object.keys(updates).length > 0) {
    await setDoc(statsRef, updates, { merge: true });
  }
};

export const deleteRegistrationWithStats = async (reg: Registration) => {
  const regRef = doc(db, "registrations", reg.id);
  const statsRef = doc(db, "stats", "global");
  const compName = reg.competition;
  const teamSize = (reg.members?.length || 0) + 1;
  const updates: Record<string, unknown> = {
    totalGlobalRegistrations: increment(-1),
    totalGlobalParticipants: increment(-teamSize)
  };

  if (reg.paymentStatus === 'verified') {
    const amount = Number(reg.amountPaid || 0);
    updates.totalVerifiedRevenue = increment(-amount);
    updates.totalVerifiedRegistrations = increment(-1);
    updates.totalParticipants = increment(-teamSize);
    updates[`competitions.${compName}.verified`] = increment(-1);
    updates[`competitions.${compName}.revenue`] = increment(-amount);
  } else if (reg.paymentStatus === 'pending') {
    updates.totalPendingRegistrations = increment(-1);
    updates[`competitions.${compName}.pending`] = increment(-1);
  } else if (reg.paymentStatus === 'rejected') {
    updates[`competitions.${compName}.rejected`] = increment(-1);
  }
  
  if (Object.keys(updates).length > 0) {
    await setDoc(statsRef, updates, { merge: true });
  }

  await deleteDoc(doc(db, "public_status", reg.teamId || reg.id));
  if (reg.email) {
    await syncEmailLookup(reg.email, reg.teamId || reg.id, 'remove');
  }
  
  return deleteDoc(regRef);
};

export const recalculateGlobalStats = async () => {
  try {
    const snapshot = await getDocs(collection(db, "registrations"));
    
    let totalRevenue = 0;
    let totalVerifiedTeams = 0;
    let totalParticipants = 0;
    let totalPending = 0;
    let totalGlobalRegs = 0;
    let totalGlobalParts = 0;
    const compStats: Record<string, { verified: number, pending: number, rejected: number, revenue: number }> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const comp = data.competition;
      const teamSize = (data.members?.length || 0) + 1;
      const amount = Number(data.amountPaid || 0);
      
      totalGlobalRegs += 1;
      totalGlobalParts += teamSize;

      if (!compStats[comp]) compStats[comp] = { verified: 0, pending: 0, rejected: 0, revenue: 0 };

      if (data.paymentStatus === 'verified') {
        totalVerifiedTeams += 1;
        totalRevenue += amount;
        totalParticipants += teamSize;
        compStats[comp].verified += 1;
        compStats[comp].revenue += amount;
      } else if (data.paymentStatus === 'pending') {
        totalPending += 1;
        compStats[comp].pending += 1;
      } else if (data.paymentStatus === 'rejected') {
        compStats[comp].rejected += 1;
      }
    });

    const statsRef = doc(db, "stats", "global");
    await setDoc(statsRef, {
      totalVerifiedRevenue: totalRevenue,
      totalVerifiedRegistrations: totalVerifiedTeams,
      totalParticipants: totalParticipants,
      totalPendingRegistrations: totalPending,
      totalGlobalRegistrations: totalGlobalRegs,
      totalGlobalParticipants: totalGlobalParts,
      competitions: compStats
    });

    return { totalRevenue, totalVerifiedTeams, totalParticipants, totalPending };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, "stats/global");
    }
    console.error("Recalculation failed:", error);
    throw error;
  }
};

export const subscribeToCompSettings = (callback: (settings: Record<string, boolean>) => void) => {
  const docRef = doc(db, "settings", "competition_status");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Record<string, boolean>);
    } else {
      callback({});
    }
  });
};

export const setCompetitionStatus = async (compName: string, isEnabled: boolean) => {
  const docRef = doc(db, "settings", "competition_status");
  return setDoc(docRef, { [compName]: isEnabled }, { merge: true });
};

export const updateRegistration = async (id: string, payload: Record<string, unknown>) => {
  const docRef = doc(db, "registrations", id);
  return updateDoc(docRef, payload);
};

export const deleteRegistration = async (id: string) => {
  const docRef = doc(db, "registrations", id);
  return deleteDoc(docRef);
};
