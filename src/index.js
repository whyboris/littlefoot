import template from 'lodash.template'
import { createSettings } from './settings'
import { layoutPopover, resizePopover } from './layout'
import { init } from './init'
import { bindEvents } from './events'
import {
  activateButton,
  addClass,
  deactivateButton,
  findAllButtons,
  findAllPopovers,
  findButton,
  findClosestButton,
  findClosestPopover,
  findHoveredFootnote,
  findPopover,
  findPopoverButton,
  getPopoverSelector,
  insertPopover,
  isActive,
  isChanging,
  remove,
  setActive,
  setChanging,
  setHovered,
  unsetActive,
  unsetChanging
} from './document'

function maybeCall (context, fn, ...args) {
  return typeof fn === 'function' && fn.call(context, ...args)
}

function findButtons (selector, multiple) {
  return selector
    ? multiple
      ? findAllButtons(selector)
      : [findButton(selector)]
    : []
}

function activatePopover (settings) {
  return (selector, className) => {
    const { activateCallback, activateDelay, allowMultiple, contentTemplate } = settings
    const renderPopover = template(contentTemplate)

    const popovers = findButtons(selector, allowMultiple)
      .map(findClosestButton)
      .filter(button => button)
      .map(button => {
        const popover = insertPopover(button, renderPopover)
        activateButton(button)
        addClass(className)(popover)
        maybeCall(null, activateCallback, popover, button)
        return popover
      })

    findAllPopovers().forEach(resizePopover)

    setTimeout(() => popovers.forEach(setActive), activateDelay)
  }
}

function dismissPopover (delay) {
  return popover => {
    const button = findPopoverButton(popover)

    if (!isChanging(button)) {
      setChanging(button)
      deactivateButton(button)
      unsetActive(popover)

      window.setTimeout(() => {
        remove(popover)
        unsetChanging(button)
      }, delay)
    }
  }
}

function dismissPopovers (settings) {
  return (selector, delay = settings.dismissDelay) => {
    findAllPopovers(selector).forEach(dismissPopover(delay))
  }
}

function createToggleHandler (activate, dismiss, settings) {
  const displayPopover = (selector, button) => {
    const { activateDelay, allowMultiple } = settings
    setChanging(button)
    if (!allowMultiple) {
      dismiss(`:not(${selector})`)
    }
    activate(selector)
    setTimeout(() => unsetChanging(button), activateDelay)
  }

  return target => {
    const button = findClosestButton(target)

    if (button) {
      maybeCall(button, button.blur)
      const selector = getPopoverSelector(button)

      if (!isChanging(button)) {
        if (isActive(button)) {
          dismiss(selector)
        } else {
          displayPopover(selector, button)
        }
      }
    } else {
      const popover = findClosestPopover(target)

      if (!popover && findPopover()) {
        dismiss()
      }
    }

    return button
  }
}

function createHoverHandler (activate, dismiss, settings) {
  const { activateOnHover, allowMultiple } = settings
  return target => {
    if (activateOnHover) {
      const button = findClosestButton(target)

      if (!isActive(button)) {
        const selector = getPopoverSelector(button)
        setHovered(button)
        !allowMultiple && dismiss(`:not(${selector})`)
        activate(selector)
      }
    }
  }
}

function createUnhoverHandler (dismiss, settings) {
  return () => {
    const { activateOnHover, dismissOnUnhover, hoverDelay } = settings
    if (dismissOnUnhover && activateOnHover) {
      setTimeout(() => {
        if (!findHoveredFootnote()) {
          dismiss()
        }
      }, hoverDelay)
    }
  }
}

function createDomain (settings) {
  const activate = activatePopover(settings)
  const dismiss = dismissPopovers(settings)

  return {
    activate,
    dismiss,
    layoutPopovers: () => findAllPopovers().forEach(layoutPopover),
    resizePopovers: () => findAllPopovers().forEach(resizePopover),
    toggleHandler: createToggleHandler(activate, dismiss, settings),
    hoverHandler: createHoverHandler(activate, dismiss, settings),
    unhoverHandler: createUnhoverHandler(dismiss, settings)
  }
}

/**
 * Littlefoot instance factory.
 *
 * @param  {Object} options Littlefoot options.
 * @return {Object}         Littlefoot instance.
 */
const littlefoot = function (options) {
  const settings = createSettings(options)

  init(settings)
  const domain = createDomain(settings)
  bindEvents(domain)

  const getSetting = key => settings[key]
  const updateSetting = (key, value) => {
    settings[key] = value
  }

  return {
    activate: domain.activate,
    dismiss: domain.dismiss,
    getSetting,
    updateSetting
  }
}

export default littlefoot
