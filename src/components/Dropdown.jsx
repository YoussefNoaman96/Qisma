import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

function normalize(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

// Menu buttons move DOM focus; select-only comboboxes keep focus on the trigger.
export default function Dropdown({
  id,
  label,
  icon: Icon,
  value,
  triggerText,
  options,
  isOpen,
  onOpenChange,
  onChange,
  align = 'start',
  variant = 'compact',
  invalid = false,
  describedBy,
}) {
  const menuId = useId();
  const generatedTriggerId = useId();
  const triggerId = id ?? generatedTriggerId;
  const isField = variant === 'field';
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeahead = useRef({ value: '', time: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const index = Math.max(0, Math.min(activeIndex, options.length - 1));

  function openAt(nextIndex) {
    setActiveIndex(nextIndex);
    onOpenChange(true);
  }

  function commit(nextIndex) {
    typeahead.current = { value: '', time: 0 };
    if (options[nextIndex]) onChange(options[nextIndex].value);
    onOpenChange(false);
    triggerRef.current.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!isOpen) return;
    const item = menuRef.current.querySelectorAll('[data-dropdown-option]')[index];
    if (isField) item?.scrollIntoView({ block: 'nearest' });
    else item?.focus({ preventScroll: true });
  }, [isOpen, isField, index]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event) {
      if (!rootRef.current.contains(event.target)) {
        typeahead.current = { value: '', time: 0 };
        if (isField && options[index]) onChange(options[index].value);
        onOpenChange(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isOpen, isField, options, index, onChange, onOpenChange]);

  function searchOption(character) {
    const now = Date.now();
    const buffer =
      now - typeahead.current.time < 650 ? typeahead.current.value + character : character;
    typeahead.current = { value: buffer, time: now };
    const repeated = [...buffer].every((letter) => letter === buffer[0]);
    const prefix = normalize(repeated ? character : buffer);
    for (let offset = 0; offset < options.length; offset++) {
      const nextIndex = (index + offset + (prefix.length === 1 ? 1 : 0)) % options.length;
      if (normalize(options[nextIndex].label).startsWith(prefix)) {
        openAt(nextIndex);
        return;
      }
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && isOpen) {
      typeahead.current = { value: '', time: 0 };
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current.focus({ preventScroll: true });
      return;
    }
    if (isField && event.key === 'Tab' && isOpen) {
      commit(index);
      return;
    }
    if (isField && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (isOpen) commit(index);
      else
        openAt(
          Math.max(
            options.findIndex((option) => option.value === value),
            0,
          ),
        );
      return;
    }
    const movement = ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key);
    if (movement) {
      event.preventDefault();
      if (!isOpen) {
        openAt(
          event.key === 'End'
            ? options.length - 1
            : event.key === 'Home'
              ? 0
              : Math.max(
                  options.findIndex((option) => option.value === value),
                  0,
                ),
        );
      } else {
        const nextIndex = {
          ArrowDown: isField
            ? Math.min(index + 1, options.length - 1)
            : (index + 1) % options.length,
          ArrowUp: isField ? Math.max(index - 1, 0) : (index - 1 + options.length) % options.length,
          Home: 0,
          End: options.length - 1,
        }[event.key];
        if (isField && event.altKey && event.key === 'ArrowUp') commit(index);
        else setActiveIndex(nextIndex);
      }
    } else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      searchOption(event.key);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-w-0"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          if (isField && isOpen && options[index]) onChange(options[index].value);
          onOpenChange(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={label}
        role={isField ? 'combobox' : undefined}
        disabled={options.length === 0}
        aria-invalid={isField ? invalid : undefined}
        aria-describedby={describedBy}
        aria-activedescendant={isField && isOpen ? `${menuId}-option-${index}` : undefined}
        aria-haspopup={isField ? 'listbox' : 'menu'}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => {
          if (isOpen) onOpenChange(false);
          else
            openAt(
              Math.max(
                options.findIndex((option) => option.value === value),
                0,
              ),
            );
        }}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border shadow-sm transition duration-200 ${isField ? 'px-[15px] py-3 text-base' : 'px-3 py-2.5 text-sm font-semibold sm:min-w-[132px] sm:px-4'} ${isOpen ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/15' : 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-md'}`}
      >
        {Icon && <Icon size={18} aria-hidden="true" className="shrink-0 text-primary" />}
        <span className={`min-w-0 ${isField ? 'flex-1 truncate text-start' : ''}`}>
          <bdi>{triggerText}</bdi>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`ms-1 shrink-0 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        role={isField ? 'listbox' : 'menu'}
        aria-label={label}
        aria-hidden={!isOpen}
        className={`absolute ${align === 'end' ? 'end-0' : 'start-0'} top-[calc(100%+10px)] z-40 min-w-full origin-top rounded-xl border border-line/70 bg-surface p-1.5 shadow-[0_16px_40px_-10px_rgb(0_0_0/0.3)] transition-[opacity,transform] duration-200 ease-out ${isField ? 'max-h-60 w-full overflow-y-auto overscroll-contain' : ''} ${isOpen ? 'visible translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible -translate-y-2 scale-95 opacity-0'}`}
      >
        {options.map((option, optionIndex) => (
          <button
            key={option.value}
            id={`${menuId}-option-${optionIndex}`}
            type="button"
            data-dropdown-option=""
            role={isField ? 'option' : 'menuitemradio'}
            aria-checked={isField ? undefined : value === option.value}
            aria-selected={
              isField ? (isOpen ? optionIndex === index : value === option.value) : undefined
            }
            tabIndex={-1}
            onPointerDown={(event) => {
              if (isField) event.preventDefault();
            }}
            onMouseEnter={() => setActiveIndex(optionIndex)}
            onClick={() => commit(optionIndex)}
            className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start font-medium transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none ${isField ? 'text-base' : 'whitespace-nowrap text-sm'} ${optionIndex === index && isOpen ? 'bg-primary/10 text-primary' : 'text-ink'}`}
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              <bdi>{option.label}</bdi>
            </span>
            <Check
              size={16}
              aria-hidden="true"
              className={`shrink-0 text-primary ${value === option.value ? 'opacity-100' : 'opacity-0'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
