import { useState } from 'react';
import styles from './Onboarding.module.css';

interface IntroVideosProps {
    onComplete: () => void;
}

const VIDEOS = [
    {
        title: 'What is PMS?',
        subtitle: 'A quick introduction to Performance Management Systems',
        // First 23 seconds only — using YouTube embed with end parameter
        embedUrl: 'https://www.youtube.com/embed/SxuivesSuuo?end=23&rel=0&modestbranding=1',
        skippable: true,
    },
    {
        title: 'What is 4DPMS?',
        subtitle: 'Learn about the 4-Dimensional Performance Management System',
        embedUrl: 'https://www.youtube.com/embed/he82CHSY4Mk?rel=0&modestbranding=1',
        skippable: false,
    },
];

export default function IntroVideos({ onComplete }: IntroVideosProps) {
    const [currentVideo, setCurrentVideo] = useState(0);

    const handleNext = () => {
        if (currentVideo < VIDEOS.length - 1) {
            setCurrentVideo(currentVideo + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        if (currentVideo < VIDEOS.length - 1) {
            setCurrentVideo(currentVideo + 1);
        } else {
            onComplete();
        }
    };

    const video = VIDEOS[currentVideo];

    return (
        <div className={styles.videoStep}>
            <h2 className={styles.videoTitle}>{video.title}</h2>
            <p className={styles.videoSubtitle}>{video.subtitle}</p>

            <div className={styles.videoContainer}>
                <iframe
                    key={video.embedUrl}
                    src={video.embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>

            <div className={styles.videoNav}>
                {VIDEOS.map((_, index) => (
                    <button
                        key={index}
                        className={`${styles.videoDot} ${index === currentVideo ? styles.videoDotActive : ''}`}
                        onClick={() => setCurrentVideo(index)}
                        aria-label={`Video ${index + 1}`}
                    />
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                {video.skippable && (
                    <button className={styles.btnSkip} onClick={handleSkip}>
                        Skip
                    </button>
                )}
                <button className={styles.btnPrimary} onClick={handleNext}>
                    {currentVideo < VIDEOS.length - 1 ? 'Next Video' : 'Continue'}
                </button>
            </div>
        </div>
    );
}
