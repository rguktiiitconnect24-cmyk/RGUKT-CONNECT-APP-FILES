import './CourseCard.css';

const CourseCard = ({ label, icon: Icon, onClick, className = '' }) => {
  // Logic to derive short label: "PUC-1" -> "P1", "Year 1" -> "E1"
  const getShortLabel = (fullLabel) => {
    if (fullLabel.startsWith('PUC-')) return `P${fullLabel.split('-')[1]}`;
    if (fullLabel.startsWith('Year ')) return `E${fullLabel.split(' ')[1]}`;
    if (fullLabel.startsWith('Semester ')) return `S${fullLabel.split(' ')[1]}`;
    if (fullLabel.startsWith('Unit ')) return `U${fullLabel.split(' ')[1]}`;
    return fullLabel;
  };

  // Logic to derive display label: "Year 1" -> "Engineering - 1"
  const getDisplayLabel = (fullLabel) => {
    if (fullLabel.startsWith('Year ')) return `Engineering - ${fullLabel.split(' ')[1]}`;
    return fullLabel;
  };

  const shortLabel = getShortLabel(label);
  const displayLabel = getDisplayLabel(label);

  return (
    <div className={`course-card-wrapper ${className}`} onClick={onClick}>
      <div className="themed-card">
        <div className="card-border"></div>
        <div className="card-content">
          <div className="horizontal-main">
            {Icon && <Icon size={24} className="theme-icon" />}
            <div className="reveal-container">
              <div className="short-label">{shortLabel}</div>
              <div className="full-label">{displayLabel}</div>
            </div>
          </div>
          <div className="website-name">RGUKT CONNECT</div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
