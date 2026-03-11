import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import { apiUrl } from '@/utils/api';
import styles from './Onboarding.module.css';
import logo from '@/assets/logo.png';
import IntroVideos from './IntroVideos';
import OrgSetup from './OrgSetup';
import PlanYourGoals from './PlanYourGoals';
import AddTeamMembers, { TeamMember } from './AddTeamMembers';
import AddKRAs from './AddKRAs';

interface GoalBreakdown {
    period: string;
    target: string;
}

interface Goal {
    name: string;
    description: string;
    target: string;
    timeline: 'yearly' | 'quarterly' | 'monthly';
    breakdowns: GoalBreakdown[];
}

const ORG_ADMIN_STEPS = [
    { label: 'Introduction', number: 1 },
    { label: 'Org Setup', number: 2 },
    { label: 'Plan Goals', number: 3 },
    { label: 'Add Members', number: 4 },
    { label: 'Set KRAs', number: 5 },
];

const BOSS_MANAGER_STEPS = [
    { label: 'Introduction', number: 1 },
    { label: 'Set KRAs', number: 2 },
    { label: 'Add Team Members', number: 3 },
];

const EMPLOYEE_STEPS = [
    { label: 'Introduction', number: 1 },
    { label: 'Set KRAs', number: 2 },
];

export default function Onboarding() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole') || 'employee';
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');
    const [orgSize, setOrgSize] = useState('');
    const [userName, setUserName] = useState('');

    const [goals, setGoals] = useState<Goal[]>([]);
    const [members, setMembers] = useState<TeamMember[]>([]);

    const isOrgAdmin = userRole === 'org_admin';
    const isBossOrManager = userRole === 'boss' || userRole === 'manager';
    const isEmployee = userRole === 'employee';

    const STEPS = isOrgAdmin
        ? ORG_ADMIN_STEPS
        : isBossOrManager
            ? BOSS_MANAGER_STEPS
            : EMPLOYEE_STEPS;

    const getRoleDashboardPath = () => getDashboardPath(userRole as UserRole);

    useEffect(() => {
        const checkStatus = async () => {
            if (!userId) {
                navigate('/auth/login');
                return;
            }
            try {
                const res = await fetch(apiUrl(`/api/onboarding/status?userId=${userId}`));
                const data = await res.json();
                if (data.status === 'success') {
                    if (data.data.onboardingCompleted) {
                        navigate(getRoleDashboardPath());
                        return;
                    }
                    setCurrentStep(data.data.onboardingStep || 0);
                    if (data.data.userName) setUserName(data.data.userName);
                }
                if (isOrgAdmin) {
                    const orgRes = await fetch(apiUrl(`/api/organizations/me?userId=${userId}`));
                    const orgData = await orgRes.json();
                    if (orgData.status === 'success' && orgData.data) {
                        setOrgName(orgData.data.name || '');
                        setOrgSize(orgData.data.employeeSize || '');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch onboarding status:', err);
            } finally {
                setLoading(false);
            }
        };
        checkStatus();
    }, [userId, navigate, isOrgAdmin]);

    const saveStep = async (step: number) => {
        try {
            await fetch(apiUrl(`/api/onboarding/step?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step }),
            });
        } catch (err) {
            console.error('Failed to save step:', err);
        }
    };

    const savePYG = async () => {
        if (goals.length === 0) return;
        try {
            await fetch(apiUrl(`/api/onboarding/pyg?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: new Date().getFullYear(),
                    goals,
                }),
            });
        } catch (err) {
            console.error('Failed to save goals:', err);
        }
    };

    const saveMembers = async () => {
        if (members.length === 0) return;
        try {
            for (const member of members) {
                if (member._id) continue;
                await fetch(apiUrl(`/api/org-admin/members/invite?userId=${userId}`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: member.name,
                        email: member.email,
                        mobile: member.mobile,
                        designation: member.designation || '',
                        department: member.department || '',
                        role: member.role,
                        reportsTo: member.reportsTo,
                        userId,
                    }),
                });
            }
        } catch (err) {
            console.error('Failed to save team members:', err);
        }
    };

    const completeOnboarding = async () => {
        try {
            await fetch(apiUrl(`/api/onboarding/complete?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });
            navigate(getRoleDashboardPath());
        } catch (err) {
            console.error('Failed to complete onboarding:', err);
            navigate(getRoleDashboardPath());
        }
    };

    const handleIntroComplete = async () => {
        if (isEmployee) {
            const nextStep = 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        } else if (isBossOrManager) {
            const nextStep = 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        } else if (isOrgAdmin) {
            const nextStep = 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        } else {
            await completeOnboarding();
        }
    };

    const handleNext = async () => {
        if (isOrgAdmin) {
            if (currentStep === 2) await savePYG();
            else if (currentStep === 3) await saveMembers();
        } else if (isBossOrManager) {
            if (currentStep === 2) await saveMembers();
        }

        if (currentStep < STEPS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        } else {
            await completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            saveStep(currentStep - 1);
        }
    };

    const handleSkip = async () => {
        if (currentStep < STEPS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        } else {
            await completeOnboarding();
        }
    };

    const showProgress = isOrgAdmin || isBossOrManager || isEmployee;
    const skippableSteps = isOrgAdmin ? [2, 3, 4] : isBossOrManager ? [1, 2] : [1];

    if (loading) {
        return (
            <div className={styles.onboarding}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, fontFamily: 'var(--font-inter)', color: 'var(--color-main-grey-60)' }}>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.onboarding}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <img src={logo} alt="4DPMS" className={styles.logo} />
                    <span className={styles.headerTitle}>Getting Started</span>
                </div>
            </div>

            {showProgress && (
                <div className={styles.progressContainer}>
                    <div className={styles.progressSteps}>
                        {STEPS.map((step, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <div className={styles.progressStep}>
                                    <div
                                        className={`${styles.stepCircle} ${index === currentStep
                                            ? styles.stepCircleActive
                                            : index < currentStep
                                                ? styles.stepCircleCompleted
                                                : styles.stepCircleInactive
                                            }`}
                                    >
                                        {index < currentStep ? '✓' : step.number}
                                    </div>
                                    <span
                                        className={`${styles.stepLabel} ${index > currentStep ? styles.stepLabelInactive : ''
                                            }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`${styles.stepConnector} ${index < currentStep ? styles.stepConnectorCompleted : ''
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.content}>
                <div className={styles.stepContent}>
                    {currentStep === 0 && (
                        <IntroVideos onComplete={handleIntroComplete} />
                    )}
                    {isOrgAdmin && currentStep === 1 && (
                        <OrgSetup
                            orgName={orgName}
                            orgSize={orgSize}
                            onComplete={() => { setCurrentStep(2); saveStep(2); }}
                            onSkip={() => { setCurrentStep(2); saveStep(2); }}
                        />
                    )}
                    {isOrgAdmin && currentStep === 2 && (
                        <PlanYourGoals goals={goals} onGoalsChange={setGoals} />
                    )}
                    {isOrgAdmin && currentStep === 3 && (
                        <AddTeamMembers members={members} onMembersChange={setMembers} userId={userId} />
                    )}
                    {isOrgAdmin && currentStep === 4 && (
                        <AddKRAs members={members} />
                    )}

                    {/* Boss/Manager: Set KRAs (step 1), Add Team Members (step 2) */}
                    {isBossOrManager && currentStep === 1 && (
                        <AddKRAs members={members} />
                    )}
                    {isBossOrManager && currentStep === 2 && (
                        <AddTeamMembers
                            members={members}
                            onMembersChange={setMembers}
                            userId={userId}
                            roleRestriction="employee_only"
                            selfAsReportsTo={userId && userName ? { id: userId, name: userName } : undefined}
                        />
                    )}

                    {/* Employee: Set KRAs (step 1) */}
                    {isEmployee && currentStep === 1 && (
                        <AddKRAs members={[]} />
                    )}
                </div>
            </div>

            {showProgress && currentStep > 0 && !(isOrgAdmin && currentStep === 1) && (
                <div className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <button className={styles.btnSecondary} onClick={handleBack}>
                            ← Back
                        </button>
                    </div>
                    <div className={styles.footerRight}>
                        {skippableSteps.includes(currentStep) && (
                            <button className={styles.btnSkip} onClick={handleSkip}>
                                Skip for now
                            </button>
                        )}
                        <button className={styles.btnPrimary} onClick={handleNext}>
                            {currentStep === STEPS.length - 1 ? 'Finish Setup →' : 'Continue →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
