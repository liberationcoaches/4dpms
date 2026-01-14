import { ReactNode } from 'react';
import styles from './TeamMemberCard.module.css';

interface TeamMemberCardProps {
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  score?: number;
  createdAt?: string;
  buttonText?: string;
  onClick?: () => void;
  children?: ReactNode;
}

function TeamMemberCard({
  name,
  email,
  mobile,
  designation,
  score,
  createdAt,
  buttonText = 'View/Edit Dimensions →',
  onClick,
  children,
}: TeamMemberCardProps) {
  return (
    <div className={styles.employeeCard} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <h3>{name}</h3>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Mobile:</strong> {mobile}</p>
      {designation && <p><strong>Designation:</strong> {designation}</p>}
      {score !== undefined && (
        <div className={styles.scoreBadge}>
          <strong>Score:</strong> {score.toFixed(1)}
        </div>
      )}
      {createdAt && (
        <p className={styles.createdDate}>
          Created: {new Date(createdAt).toLocaleDateString()}
        </p>
      )}
      {children}
      {onClick && (
        <div className={styles.viewDetailsButton}>
          {buttonText}
        </div>
      )}
    </div>
  );
}

export default TeamMemberCard;
