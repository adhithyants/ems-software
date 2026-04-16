import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminAttendance from './AdminAttendance';
import Timesheets from './Timesheets';
import DetailedReports from '../components/DetailedReports';
import { BarChart3, LayoutDashboard, CalendarDays } from 'lucide-react';

export default function Attendance() {
    const { user } = useAuth();
    const isPM = ['SU', 'PM'].includes(user?.role);
    const isManager = ['SU', 'PM', 'TL'].includes(user?.role);
    
    // Default tab logic
    const [activeTab, setActiveTab] = useState(isPM ? 'dashboard' : 'timesheet');

    // Make sure non-managers don't somehow stay on restricted tabs
    useEffect(() => {
        if (!isPM && activeTab === 'dashboard') {
            setActiveTab('timesheet');
        }
    }, [isPM, activeTab]);

    return (
        <div className="page">
            <div className="page__header" style={{ marginBottom: '16px' }}>
                <h2>Attendance & Timesheets</h2>
            </div>
            
            {/* Unified Role-based Tab System */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {isPM && (
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`btn ${activeTab === 'dashboard' ? 'btn--primary' : 'btn--ghost'}`}
                    >
                        <LayoutDashboard size={18} /> Live Dashboard
                    </button>
                )}
                
                {isManager && (
                    <button 
                        onClick={() => setActiveTab('reports')} 
                        className={`btn ${activeTab === 'reports' ? 'btn--primary' : 'btn--ghost'}`}
                    >
                        <BarChart3 size={18} /> Detailed Reports
                    </button>
                )}
                
                <button 
                    onClick={() => setActiveTab('timesheet')} 
                    className={`btn ${activeTab === 'timesheet' ? 'btn--primary' : 'btn--ghost'}`}
                >
                    <CalendarDays size={18} /> {isManager ? 'Timesheets' : 'My Timesheet'}
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'dashboard' && isPM && <AdminAttendance />}
            {activeTab === 'reports' && isManager && <DetailedReports />}
            {activeTab === 'timesheet' && <Timesheets />}
            
        </div>
    );
}
