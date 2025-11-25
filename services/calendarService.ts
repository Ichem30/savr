import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export const getMonthlyActivity = async (uid: string, year: number, month: number) => {
    // Month is 0-indexed (0 = Jan, 11 = Dec)
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    // Format dates as YYYY-MM-DD for Firestore ID comparison
    // Note: Date.toISOString() uses UTC. We need local YYYY-MM-DD or consistent usage.
    // The app uses .toISOString().split('T')[0] which is UTC date.
    // Let's stick to the app's convention of YYYY-MM-DD string IDs.
    
    // We can query based on document ID range because IDs are YYYY-MM-DD
    // Firestore allows querying by __name__ (document ID)
    // However, client SDK sometimes makes this tricky.
    // Alternatively, simply storing a 'date' field in the document (which we do) is better for querying.
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // We need to pad the month/day manually to ensure correct range if we construct strings manually,
    // but using the Date object to ISO string is safer if we handle timezone offset, 
    // BUT the app seems to use simple ISO slice which implies UTC. 
    // Let's assume standard ISO string dates are used as IDs.
    
    const q = query(
        collection(db, "users", uid, "daily_logs"),
        where("date", ">=", startStr),
        where("date", "<=", endStr)
    );

    const snapshot = await getDocs(q);
    const activeDates: string[] = [];
    
    snapshot.forEach((doc) => {
        // Check if there's actual activity (calories > 0 or water > 0 or meals > 0)
        const data = doc.data();
        if (data.consumed > 0 || data.water > 0 || (data.meals && data.meals.length > 0)) {
            activeDates.push(doc.id);
        }
    });
    
    return activeDates;
};

