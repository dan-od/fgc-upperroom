import './Card.css'

const Card = ({ 
  children, 
  variant = 'default',
  hover = true,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`card card--${variant} ${hover ? 'card--hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
