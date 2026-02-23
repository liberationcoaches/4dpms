import styles from './UnifiedDashboard.module.css';

export default function TutorialTab() {
    return (
        <div>
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}>Tutorials & Guides</h3>
                        <p className={styles.sectionSubtitle}>
                            Replay the introduction videos and learn more about 4DPMS.
                        </p>
                    </div>
                </div>

                <div className={styles.tutorialGrid}>
                    <div className={styles.tutorialCard}>
                        <div className={styles.tutorialThumb}>
                            <iframe
                                src="https://www.youtube.com/embed/SxuivesSuuo?rel=0&modestbranding=1"
                                title="What is PMS?"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <div className={styles.tutorialInfo}>
                            <div className={styles.tutorialTitle}>What is PMS?</div>
                            <div className={styles.tutorialDesc}>
                                A quick introduction to Performance Management Systems and why they matter.
                            </div>
                        </div>
                    </div>

                    <div className={styles.tutorialCard}>
                        <div className={styles.tutorialThumb}>
                            <iframe
                                src="https://www.youtube.com/embed/he82CHSY4Mk?rel=0&modestbranding=1"
                                title="What is 4DPMS?"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <div className={styles.tutorialInfo}>
                            <div className={styles.tutorialTitle}>What is 4DPMS?</div>
                            <div className={styles.tutorialDesc}>
                                A deep dive into the 4-Dimensional Performance Management System.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
