import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import styles from './Onboarding.module.css';
import logo from '@/assets/logo.png';
import IntroVideos from './IntroVideos';
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

// Boss gets the full wizard; everyone else just watches the intro video
const BOSS_STEPS = [
    { label: 'Introduction', number: 1 },
    { label: 'Plan Goals', number: 2 },
    { label: 'Add Team', number: 3 },
    { label: 'Set KRAs', number: 4 },
];

export default function Onboarding() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole') || 'employee';
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);

    // State for boss-only steps
    const [goals, setGoals] = useState<Goal[]>([]);
    const [members, setMembers] = useState<TeamMember[]>([]);

    const isBoss = userRole === 'boss';
    const STEPS = isBoss ? BOSS_STEPS : [{ label: 'Introduction', number: 1 }];

    // Get the correct dashboard path for the user's role
    const getDashboardPath = () => {
        if (userRole === 'boss') return '/dashboard/boss';
        if (userRole === 'manager') return '/dashboard/manager';
        return '/dashboard/employee';
    };

    // Check onboarding status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (!userId) {
                navigate('/auth/login');
                return;
            }
            try {
                const res = await fetch(`/api/onboarding/status?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success') {
                    if (data.data.onboardingCompleted) {
                        navigate(getDashboardPath(userRole as UserRole));
                        return;
                    }
                    // For boss, restore their saved step; for others, always start at 0
                    if (isBoss) {
                        setCurrentStep(data.data.onboardingStep || 0);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch onboarding status:', err);
            } finally {
                setLoading(false);
            }
        };
        checkStatus();
    }, [userId, navigate, isBoss]);

    // Save current step to backend (boss only)
    const saveStep = async (step: number) => {
        try {
            await fetch(`/api/onboarding/step?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step }),
            });
        } catch (err) {
            console.error('Failed to save step:', err);
        }
    };

    // Save PYG data (boss only)
    const savePYG = async () => {
        if (goals.length === 0) return;
        try {
            await fetch(`/api/onboarding/pyg?userId=${userId}`, {
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

    // Save team members to backend (boss only)
    const saveMembers = async () => {
        if (members.length === 0) return;
        try {
            for (const member of members) {
                await fetch(`/api/team/members?userId=${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: member.name,
                        role: member.role === 'manager' ? 'Supervisor' : 'Team Member',
                        mobile: member.mobile,
                    }),
                });
            }
        } catch (err) {
            console.error('Failed to save team members:', err);
        }
    };

    // Complete onboarding
    const completeOnboarding = async () => {
        try {
            await fetch(`/api/onboarding/complete?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });
            navigate(getDashboardPath(userRole as UserRole));
        } catch (err) {
            console.error('Failed to complete onboarding:', err);
            navigate(getDashboardPath(userRole as UserRole));
        }
    };

    // For non-boss: intro video complete → mark onboarding done → go to dashboard
    const handleIntroComplete = async () => {
        if (!isBoss) {
            await completeOnboarding();
        } else {
            // Boss: advance to next step
            const nextStep = 1;
            setCurrentStep(nextStep);
            await saveStep(nextStep);
        }
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            await savePYG();
        } else if (currentStep === 2) {
            await saveMembers();
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
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <img src={logo} alt="4DPMS" className={styles.logo} />
                    <span className={styles.headerTitle}>Getting Started</span>
                </div>
            </div>

            {/* Progress Steps — only show for boss (multi-step flow) */}
            {isBoss && (
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

            {/* Step Content */}
            <div className={styles.content}>
                <div className={styles.stepContent}>
                    {currentStep === 0 && (
                        <IntroVideos onComplete={handleIntroComplete} />
                    )}
                    {isBoss && currentStep === 1 && (
                        <PlanYourGoals goals={goals} onGoalsChange={setGoals} />
                    )}
                    {isBoss && currentStep === 2 && (
                        <AddTeamMembers members={members} onMembersChange={setMembers} />
                    )}
                    {isBoss && currentStep === 3 && (
                        <AddKRAs members={members} />
                    )}
                </div>
            </div>

            {/* Footer Navigation — only for boss steps beyond intro (intro has its own nav) */}
            {isBoss && currentStep > 0 && (
                <div className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <button className={styles.btnSecondary} onClick={handleBack}>
                            ← Back
                        </button>
                    </div>
                    <div className={styles.footerRight}>
                        {(currentStep === 2 || currentStep === 3) && (
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
