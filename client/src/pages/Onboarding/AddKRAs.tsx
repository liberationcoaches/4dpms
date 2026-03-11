import styles from './Onboarding.module.css';
import type { TeamMember } from './AddTeamMembers';

interface AddKRAsProps {
    members: TeamMember[];
}

export default function AddKRAs({ members }: AddKRAsProps) {
    if (members.length === 0) {
        return (
            <div className={styles.kraStep}>
                <h2 className={styles.kraTitle}>Set Up KRAs</h2>
                <p className={styles.kraSubtitle}>
                    No team members added yet. You can skip this step and set up KRAs later from your dashboard.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.kraStep}>
            <h2 className={styles.kraTitle}>Set Up KRAs</h2>
            <p className={styles.kraSubtitle}>
                Assign Key Result Areas and dimensional data for your team members. You can also do this later from the dashboard.
            </p>

            <div className={styles.goalsList}>
                {members.map((member, index) => (
                    <div key={index} className={styles.goalCard}>
                        <div className={styles.goalHeader}>
                            <span className={styles.goalNumber}>{member.name}</span>
                            <span style={{
                                fontFamily: 'var(--font-inter)',
                                fontSize: '12px',
                                color: 'var(--color-main-grey-60)',
                            }}>
                                {member.role === 'boss' ? 'Executive' : member.role === 'manager' ? 'Supervisor' : 'Member'}
                            </span>
                        </div>
                        <p style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '14px',
                            color: 'var(--color-main-grey-60)',
                            textAlign: 'center',
                            padding: '24px 0',
                        }}>
                            KRA setup will be available from the dashboard after onboarding.
                            <br />
                            You'll be able to set all 4 dimensions, weights, and targets.
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
