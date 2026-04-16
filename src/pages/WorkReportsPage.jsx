import WorkReports from '../components/WorkReports';

export default function WorkReportsPage() {
    return (
        <div className="page-container">
            <header className="page__header page__header--modern no-print">
                <div className="page__header-content">
                    <div>
                        <h1 className="page__title">Work Reports</h1>
                        <p className="page__subtitle">View and download comprehensive user daily/weekly project execution reports.</p>
                    </div>
                </div>
            </header>
            
            <div className="page__content">
                <WorkReports />
            </div>
        </div>
    );
}
