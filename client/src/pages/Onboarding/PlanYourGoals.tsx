import { useState } from 'react';
import styles from './Onboarding.module.css';

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

interface PlanYourGoalsProps {
    goals: Goal[];
    onGoalsChange: (goals: Goal[]) => void;
}

const QUARTERLY_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTHLY_PERIODS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function createEmptyGoal(timeline: 'quarterly' | 'monthly'): Goal {
    const periods = timeline === 'quarterly' ? QUARTERLY_PERIODS : MONTHLY_PERIODS;
    return {
        name: '',
        description: '',
        target: '',
        timeline,
        breakdowns: periods.map((p) => ({ period: p, target: '' })),
    };
}

export default function PlanYourGoals({ goals, onGoalsChange }: PlanYourGoalsProps) {
    const [timeline, setTimeline] = useState<'quarterly' | 'monthly'>('quarterly');

    const handleTimelineChange = (newTimeline: 'quarterly' | 'monthly') => {
        setTimeline(newTimeline);
        // Re-create breakdowns for existing goals
        const updatedGoals = goals.map((goal) => {
            const periods = newTimeline === 'quarterly' ? QUARTERLY_PERIODS : MONTHLY_PERIODS;
            return {
                ...goal,
                timeline: newTimeline,
                breakdowns: periods.map((p) => {
                    const existing = goal.breakdowns.find((b) => b.period === p);
                    return existing || { period: p, target: '' };
                }),
            };
        });
        onGoalsChange(updatedGoals);
    };

    const handleAddGoal = () => {
        onGoalsChange([...goals, createEmptyGoal(timeline)]);
    };

    const handleRemoveGoal = (index: number) => {
        onGoalsChange(goals.filter((_, i) => i !== index));
    };

    const handleGoalChange = (index: number, field: keyof Goal, value: string) => {
        const updated = [...goals];
        (updated[index] as any)[field] = value;
        onGoalsChange(updated);
    };

    const handleBreakdownChange = (goalIndex: number, breakdownIndex: number, value: string) => {
        const updated = [...goals];
        updated[goalIndex].breakdowns[breakdownIndex].target = value;
        onGoalsChange(updated);
    };

    return (
        <div className={styles.pygStep}>
            <div className={styles.pygHeader}>
                <div>
                    <h2 className={styles.pygTitle}>Plan Your Goals</h2>
                    <p className={styles.pygSubtitle}>
                        Define your goals for the year. Break them down into quarterly or monthly targets.
                    </p>
                </div>
                <div className={styles.timelineToggle}>
                    <button
                        className={`${styles.timelineBtn} ${timeline === 'quarterly' ? styles.timelineBtnActive : ''}`}
                        onClick={() => handleTimelineChange('quarterly')}
                    >
                        Quarterly
                    </button>
                    <button
                        className={`${styles.timelineBtn} ${timeline === 'monthly' ? styles.timelineBtnActive : ''}`}
                        onClick={() => handleTimelineChange('monthly')}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className={styles.goalsList}>
                {goals.map((goal, index) => (
                    <div key={index} className={styles.goalCard}>
                        <div className={styles.goalHeader}>
                            <span className={styles.goalNumber}>Goal {index + 1}</span>
                            <button
                                className={styles.removeGoalBtn}
                                onClick={() => handleRemoveGoal(index)}
                                title="Remove goal"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.goalFields}>
                            <div className={styles.goalField}>
                                <label>Goal Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Increase sales revenue"
                                    value={goal.name}
                                    onChange={(e) => handleGoalChange(index, 'name', e.target.value)}
                                />
                            </div>
                            <div className={styles.goalField}>
                                <label>Target</label>
                                <input
                                    type="text"
                                    placeholder="e.g., ₹10L revenue"
                                    value={goal.target}
                                    onChange={(e) => handleGoalChange(index, 'target', e.target.value)}
                                />
                            </div>
                            <div className={`${styles.goalField} ${styles.goalFieldFull}`}>
                                <label>Description</label>
                                <textarea
                                    placeholder="Describe what this goal entails..."
                                    value={goal.description}
                                    onChange={(e) => handleGoalChange(index, 'description', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.breakdownSection}>
                            <p className={styles.breakdownTitle}>
                                {timeline === 'quarterly' ? 'Quarterly Breakdown' : 'Monthly Breakdown'}
                            </p>
                            <div
                                className={`${styles.breakdownGrid} ${timeline === 'monthly' ? styles.breakdownGridMonthly : ''
                                    }`}
                            >
                                {goal.breakdowns.map((breakdown, bIdx) => (
                                    <div key={bIdx} className={styles.breakdownItem}>
                                        <label>{breakdown.period}</label>
                                        <input
                                            type="text"
                                            placeholder="Target..."
                                            value={breakdown.target}
                                            onChange={(e) => handleBreakdownChange(index, bIdx, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                <button className={styles.addGoalBtn} onClick={handleAddGoal}>
                    + Add Goal
                </button>
            </div>
        </div>
    );
}
