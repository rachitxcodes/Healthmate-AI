import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getReportById, ReportRecord } from "../utils/reportHistory";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import { ArrowLeft, Clock, FileText, Activity } from "lucide-react";

export default function ReportHistoryDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<ReportRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReport() {
            if (!id) return;
            const data = await getReportById(id);
            setReport(data);
            setLoading(false);
        }
        fetchReport();
    }, [id]);

    if (loading) {
        return (
            <div className="w-full text-text-primary min-h-[calc(100vh-80px)] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 text-rose-500 rounded-full border-4 border-rose-200 border-t-rose-500"></div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="w-full text-text-primary min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center">
                <GlassCard className="max-w-md w-full !p-10 flex flex-col items-center">
                    <div className="bg-slate-100 text-slate-400 p-4 rounded-full mb-6 relative">
                        <FileText size={48} />
                        <div className="absolute top-0 right-0 right-0 bg-rose-500 text-white w-6 h-6 flex items-center justify-center rounded-full font-bold">!</div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Report Not Found</h2>
                    <p className="text-slate-500 mb-8">This report might have been deleted or never existed.</p>
                    <PrimaryButton onClick={() => navigate("/risk-predictor")} className="w-full">
                        Back to Risk Predictor
                    </PrimaryButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="w-full text-text-primary min-h-[calc(100vh-80px)]">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-center justify-between"
                >
                    <button
                        onClick={() => navigate("/risk-predictor")}
                        className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold bg-white/50 hover:bg-white px-4 py-2 rounded-xl transition-all shadow-sm border border-slate-200/50"
                    >
                        <ArrowLeft size={18} />
                        Back to Uploads
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row gap-8 lg:items-start"
                >
                    {/* LEFT: IMAGE PREVIEW */}
                    <div className="w-full lg:w-[45%] lg:sticky lg:top-28">
                        <GlassCard className="!p-6 border-t-8 border-t-slate-800">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                                <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl"><FileText size={24} /></div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight break-all pr-4">{report.name}</h2>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400 mt-1">
                                        <Clock size={14} />
                                        {new Date(report.timestamp).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full relative rounded-2xl overflow-hidden shadow-inner bg-slate-100/50 border border-slate-200">
                                {report.imageSrc ? (
                                    <img src={report.imageSrc} alt="Saved Medical Report" className="w-full h-auto object-contain max-h-[60vh] sm:max-h-[70vh]" />
                                ) : (
                                    <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                                        <FileText size={48} className="mb-4 opacity-50" />
                                        <span className="font-semibold">No image data saved for this old report.</span>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* RIGHT: EXTRACTED DATA DETAILS */}
                    <div className="w-full lg:w-[55%]">
                        <GlassCard className="!p-8 sm:!p-10 border-t-8 border-t-rose-400">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl"><Activity size={24} /></div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Extracted Parameters</h2>
                                </div>
                            </div>

                            {Object.keys(report.extractedData).length === 0 ? (
                                <p className="text-slate-500 font-medium py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    No explicit values were extracted in this historically saved record.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                    {Object.entries(report.extractedData).map(([key, value]) => (
                                        <div key={key} className="flex flex-col border-b border-slate-100/70 pb-4">
                                            <span className="text-slate-400 text-[11px] font-bold mb-1 tracking-wider uppercase pl-1">{key.replace(/_/g, ' ')}</span>
                                            <span className="text-slate-900 font-mono font-semibold text-[15px] pl-1">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
