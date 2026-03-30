import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import './DropdownSelect.css'

const normalizeChildOption = (child, index) => {
  if (!isValidElement(child) || child.type !== 'option') {
    return null
  }

  const value = child.props.value ?? ''
  const rawLabel = child.props.children
  const label = Array.isArray(rawLabel) ? rawLabel.join(' ') : rawLabel

  return {
    key: child.key ?? `${value}-${index}`,
    value: String(value),
    label: String(label ?? ''),
    disabled: Boolean(child.props.disabled)
  }
}

const normalizeOption = (option, index) => {
  if (typeof option === 'string' || typeof option === 'number') {
    return {
      key: `${option}-${index}`,
      value: String(option),
      label: String(option),
      disabled: false
    }
  }

  return {
    key: option?.key ?? `${option?.value ?? index}-${index}`,
    value: String(option?.value ?? ''),
    label: String(option?.label ?? option?.value ?? ''),
    disabled: Boolean(option?.disabled)
  }
}

const DropdownSelect = ({
  children,
  options,
  value = '',
  onChange,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  name,
  id,
  className = '',
  wrapperClassName = '',
  menuClassName = '',
  optionClassName = '',
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  const generatedId = useId()
  const selectId = id || `dropdown-select-${generatedId}`
  const listboxId = `${selectId}-listbox`
  const rootRef = useRef(null)
  const optionRefs = useRef([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const normalizedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map(normalizeOption).filter(Boolean)
    }

    return Children.toArray(children)
      .map(normalizeChildOption)
      .filter(Boolean)
  }, [children, options])

  const selectedIndex = normalizedOptions.findIndex((option) => option.value === String(value ?? ''))
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const nextIndex = selectedIndex >= 0 ? selectedIndex : normalizedOptions.findIndex((option) => !option.disabled)
    setActiveIndex(nextIndex)
  }, [isOpen, normalizedOptions, selectedIndex])

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, isOpen])

  const emitChange = (nextValue, option) => {
    const syntheticEvent = {
      target: { value: nextValue, name, id: selectId },
      currentTarget: { value: nextValue, name, id: selectId },
      preventDefault() {},
      stopPropagation() {}
    }

    onChange?.(syntheticEvent)
    onValueChange?.(nextValue, option)
  }

  const selectOption = (option) => {
    if (!option || option.disabled) return

    emitChange(option.value, option)
    setIsOpen(false)
  }

  const findNextIndex = (startIndex, direction) => {
    if (!normalizedOptions.length) return -1

    let index = startIndex
    for (let step = 0; step < normalizedOptions.length; step += 1) {
      index = (index + direction + normalizedOptions.length) % normalizedOptions.length
      if (!normalizedOptions[index]?.disabled) {
        return index
      }
    }

    return -1
  }

  const handleTriggerKeyDown = (event) => {
    if (disabled) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex(
        event.key === 'ArrowDown'
          ? findNextIndex(selectedIndex >= 0 ? selectedIndex - 1 : -1, 1)
          : findNextIndex(selectedIndex >= 0 ? selectedIndex + 1 : 0, -1)
      )
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen((current) => !current)
    }
  }

  const handleOptionKeyDown = (event, index, option) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(findNextIndex(index, 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(findNextIndex(index, -1))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(findNextIndex(-1, 1))
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(findNextIndex(0, -1))
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      rootRef.current?.querySelector('.ui-select__trigger')?.focus()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOption(option)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`ui-select ${wrapperClassName} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}
      data-open={isOpen ? 'true' : 'false'}
    >
      {name ? <input type="hidden" name={name} required={required} value={selectedOption?.value ?? String(value ?? '')} /> : null}
      <button
        type="button"
        id={selectId}
        className={`ui-select__trigger ${className}`.trim()}
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current)
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        style={style}
        {...props}
      >
        <span className={`ui-select__value ${selectedOption ? '' : 'ui-select__value--placeholder'}`.trim()}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="ui-select__chevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" focusable="false">
            <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className={`ui-select__menu ${menuClassName}`.trim()}>
          <ul id={listboxId} className="ui-select__list" role="listbox" aria-labelledby={ariaLabelledBy || selectId}>
            {normalizedOptions.map((option, index) => {
              const isSelected = option.value === selectedOption?.value
              return (
                <li key={option.key} role="presentation">
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={`ui-select__option ${optionClassName} ${isSelected ? 'is-selected' : ''}`.trim()}
                    onClick={() => selectOption(option)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index, option)}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <span className="ui-select__option-check" aria-hidden="true">✓</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default DropdownSelect
