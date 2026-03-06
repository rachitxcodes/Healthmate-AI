import { get, set, update, del } from "idb-keyval";

export interface ReportRecord {
    id: string;
    name: string;
    timestamp: number;
    extractedData: Record<string, string | number>;
    imageSrc: string | null;  // Data URL / Base64 for rendering previews
}

const REPORT_HISTORY_KEY = "healthmate_report_history";

/**
 * Save a new report to IndexedDB. Prepends to the list.
 */
export async function saveReportToHistory(report: ReportRecord): Promise<void> {
    await update(REPORT_HISTORY_KEY, (prevValue: any) => {
        const arr = Array.isArray(prevValue) ? prevValue : [];
        // Only keep top 50 to avoid bloating IndexedDB indefinitely
        return [report, ...arr].slice(0, 50);
    });
}

/**
 * Retrieve all saved reports, sorted newest first
 */
export async function getReportHistory(): Promise<ReportRecord[]> {
    const data = await get(REPORT_HISTORY_KEY);
    return Array.isArray(data) ? data : [];
}

/**
 * Retrieve a single report by ID
 */
export async function getReportById(id: string): Promise<ReportRecord | null> {
    const history = await getReportHistory();
    return history.find(r => r.id === id) || null;
}

/**
 * Delete a report from history
 */
export async function deleteReportById(id: string): Promise<void> {
    await update(REPORT_HISTORY_KEY, (prevValue: any) => {
        const arr = Array.isArray(prevValue) ? prevValue : [];
        return arr.filter(r => r.id !== id);
    });
}

/**
 * Clear the entire report history
 */
export async function clearReportHistory(): Promise<void> {
    await del(REPORT_HISTORY_KEY);
}
