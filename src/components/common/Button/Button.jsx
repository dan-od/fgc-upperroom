import { Link } from 'react-router-dom'
import './Button.css'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  href,
  onClick,
  className = '',
  external = false,
  ...props 
}) => {
  const classes = `btn btn-${variant} btn-${size} ${className}`.trim()
  
  // External links or anchors use <a>
  if (href && (external || href.startsWith('http') || href.startsWith('#'))) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }
  
  // Internal links use React Router <Link>
  if (href) {
    return (
      <Link to={href} className={classes} {...props}>
        {children}
      </Link>
    )
  }
  
  return (
    <button className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  )
}

export default Button