import './SectionHeader.css'

const SectionHeader = ({ 
  tag,
  title, 
  subtitle,
  align = 'center',
  light = false,
  className = ''
}) => {
  return (
    <div className={`section-header section-header--${align} ${light ? 'section-header--light' : ''} ${className}`}>
      {tag && <span className="section-tag">{tag}</span>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  )
}

export default SectionHeader
