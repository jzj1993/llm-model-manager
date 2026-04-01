const comboboxRegistry = new Map()

function normalizeComboboxText(value) {
  return String(value || '').trim().toLowerCase()
}

function closeCombobox(entry) {
  entry.isOpen = false
  entry.activeIndex = -1
  entry.list.hidden = true
  entry.list.innerHTML = ''
}

function openCombobox(entry) {
  if (!entry.filteredOptions.length) {
    closeCombobox(entry)
    return
  }
  entry.isOpen = true
  entry.list.hidden = false
}

function filterComboboxOptions(entry) {
  const query = normalizeComboboxText(entry.input.value)
  if (!query) return [...entry.options]
  const startsWithItems = []
  const includesItems = []
  for (const option of entry.options) {
    const value = normalizeComboboxText(option.value)
    const label = normalizeComboboxText(option.label)
    const isStartsWith = value.startsWith(query) || label.startsWith(query)
    const isIncludes = value.includes(query) || label.includes(query)
    if (isStartsWith) {
      startsWithItems.push(option)
    } else if (isIncludes) {
      includesItems.push(option)
    }
  }
  return [...startsWithItems, ...includesItems]
}

function renderComboboxList(entry) {
  entry.list.innerHTML = entry.filteredOptions
    .map((option, index) => (
      `<button type="button" class="combo-item ${index === entry.activeIndex ? 'active' : ''}" data-index="${index}" role="option" aria-selected="${index === entry.activeIndex ? 'true' : 'false'}">` +
      `<span class="combo-item-value">${escapeHtml(option.value)}</span>` +
      (option.label && option.label !== option.value ? `<span class="combo-item-label">${escapeHtml(option.label)}</span>` : '') +
      '</button>'
    ))
    .join('')
}

function refreshCombobox(entry, shouldOpen) {
  entry.filteredOptions = filterComboboxOptions(entry)
  entry.activeIndex = entry.filteredOptions.length > 0 ? 0 : -1
  if (!shouldOpen) {
    closeCombobox(entry)
    return
  }
  renderComboboxList(entry)
  openCombobox(entry)
}

function commitComboboxOption(entry, index) {
  const target = entry.filteredOptions[index]
  if (!target) return
  entry.input.value = target.value
  closeCombobox(entry)
  entry.input.dispatchEvent(new Event('change', { bubbles: true }))
}

function handleComboboxKeydown(entry, event) {
  if (!entry.isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    refreshCombobox(entry, true)
    event.preventDefault()
    return
  }
  if (!entry.isOpen) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!entry.filteredOptions.length) return
    entry.activeIndex = Math.min(entry.activeIndex + 1, entry.filteredOptions.length - 1)
    renderComboboxList(entry)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!entry.filteredOptions.length) return
    entry.activeIndex = Math.max(entry.activeIndex - 1, 0)
    renderComboboxList(entry)
    return
  }
  if (event.key === 'Enter') {
    if (entry.activeIndex >= 0) {
      event.preventDefault()
      commitComboboxOption(entry, entry.activeIndex)
    }
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeCombobox(entry)
  }
}

function ensureCombobox(inputId) {
  const existing = comboboxRegistry.get(inputId)
  if (existing) return existing

  const input = document.getElementById(inputId)
  if (!input) return null
  const parent = input.parentElement
  if (!parent) return null

  parent.classList.add('combo-wrap')
  const list = document.createElement('div')
  list.className = 'combo-list'
  list.hidden = true
  list.setAttribute('role', 'listbox')
  parent.appendChild(list)

  const entry = {
    inputId,
    input,
    list,
    options: [],
    filteredOptions: [],
    activeIndex: -1,
    isOpen: false
  }
  comboboxRegistry.set(inputId, entry)

  input.addEventListener('focus', () => {
    refreshCombobox(entry, true)
  })
  input.addEventListener('input', () => {
    refreshCombobox(entry, true)
  })
  input.addEventListener('keydown', (event) => {
    handleComboboxKeydown(entry, event)
  })

  list.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })
  list.addEventListener('click', (event) => {
    const button = event.target.closest('.combo-item')
    if (!button) return
    const index = Number.parseInt(button.dataset.index || '-1', 10)
    if (index < 0) return
    commitComboboxOption(entry, index)
  })

  document.addEventListener('click', (event) => {
    if (!parent.contains(event.target)) {
      closeCombobox(entry)
    }
  })

  return entry
}

function initComboboxes(inputIds) {
  if (!Array.isArray(inputIds)) return
  inputIds.forEach((inputId) => {
    ensureCombobox(inputId)
  })
}

function setComboboxOptions(inputId, rawOptions) {
  const entry = ensureCombobox(inputId)
  if (!entry) return

  const normalizedOptions = Array.isArray(rawOptions)
    ? rawOptions
      .map((item) => {
        if (typeof item === 'string') {
          return { value: item, label: item }
        }
        return {
          value: String(item?.value || '').trim(),
          label: String(item?.label || item?.value || '').trim()
        }
      })
      .filter(item => item.value)
    : []

  const seen = new Set()
  entry.options = normalizedOptions.filter((item) => {
    if (seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })

  const shouldOpen = document.activeElement === entry.input
  refreshCombobox(entry, shouldOpen)
}
