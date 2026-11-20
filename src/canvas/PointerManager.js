/**
 * Shared pointer/input manager
 */

import { vec2, clamp } from '../utils/math.js';

export class PointerManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.rect = canvas.getBoundingClientRect();

    this.position = vec2.create();
    this.previousPosition = vec2.create();
    this.velocity = vec2.create();
    this.delta = vec2.create();

    this.buttons = {
      left: false,
      middle: false,
      right: false,
    };
    this.buttonsDown = { left: false, middle: false, right: false };
    this.buttonsUp = { left: false, middle: false, right: false };
    this.clicked = false;
    this.dragging = false;
    this.dragStart = vec2.create();

    this.isInside = false;
    this.touchId = null;

    this.listeners = new Set();
    this.boundHandlers = {
      pointermove: this.handlePointerMove.bind(this),
      pointerdown: this.handlePointerDown.bind(this),
      pointerup: this.handlePointerUp.bind(this),
      pointerleave: this.handlePointerLeave.bind(this),
      pointercancel: this.handlePointerCancel.bind(this),
      contextmenu: this.handleContextMenu.bind(this),
      resize: this.updateRect.bind(this),
      scroll: this.updateRect.bind(this),
    };

    this.attach();
  }

  attach() {
    this.canvas.addEventListener('pointermove', this.boundHandlers.pointermove, { passive: true });
    this.canvas.addEventListener('pointerdown', this.boundHandlers.pointerdown);
    this.canvas.addEventListener('pointerup', this.boundHandlers.pointerup);
    this.canvas.addEventListener('pointerleave', this.boundHandlers.pointerleave);
    this.canvas.addEventListener('pointercancel', this.boundHandlers.pointercancel);
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    window.addEventListener('resize', this.boundHandlers.resize, { passive: true });
    window.addEventListener('scroll', this.boundHandlers.scroll, { passive: true });
  }

  detach() {
    this.canvas.removeEventListener('pointermove', this.boundHandlers.pointermove);
    this.canvas.removeEventListener('pointerdown', this.boundHandlers.pointerdown);
    this.canvas.removeEventListener('pointerup', this.boundHandlers.pointerup);
    this.canvas.removeEventListener('pointerleave', this.boundHandlers.pointerleave);
    this.canvas.removeEventListener('pointercancel', this.boundHandlers.pointercancel);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    window.removeEventListener('resize', this.boundHandlers.resize);
    window.removeEventListener('scroll', this.boundHandlers.scroll);
  }

  updateRect() {
    this.rect = this.canvas.getBoundingClientRect();
  }

  getCanvasPosition(clientX, clientY) {
    return {
      x: clientX - this.rect.left,
      y: clientY - this.rect.top,
    };
  }

  handlePointerMove(event) {
    if (this.touchId !== null && event.pointerId !== this.touchId) return;

    const pos = this.getCanvasPosition(event.clientX, event.clientY);
    vec2.copy(this.previousPosition, this.position);
    vec2.set(this.position, pos.x, pos.y);
    vec2.sub(this.delta, this.position, this.previousPosition);
    vec2.copy(this.velocity, this.delta);

    this.isInside = true;

    this.notifyListeners('move', { position: this.position, velocity: this.velocity, delta: this.delta, event });
  }

  handlePointerDown(event) {
    if (this.touchId !== null && this.touchId !== event.pointerId) return;

    this.touchId = event.pointerType === 'touch' ? event.pointerId : null;

    const pos = this.getCanvasPosition(event.clientX, event.clientY);
    vec2.set(this.position, pos.x, pos.y);
    vec2.copy(this.previousPosition, this.position);
    vec2.zero(this.velocity);
    vec2.zero(this.delta);

    const button = this.getButtonName(event.button);
    if (button) {
      this.buttons[button] = true;
      this.buttonsDown[button] = true;
      this.clicked = true;

      if (button === 'left') {
        this.dragging = true;
        vec2.copy(this.dragStart, this.position);
      }
    }

    this.isInside = true;
    this.notifyListeners('down', { position: this.position, button, event });
  }

  handlePointerUp(event) {
    if (this.touchId !== null && event.pointerId !== this.touchId) return;

    const button = this.getButtonName(event.button);
    if (button) {
      this.buttons[button] = false;
      this.buttonsUp[button] = true;

      if (button === 'left') {
        this.dragging = false;
      }
    }

    if (event.pointerType === 'touch') {
      this.touchId = null;
    }

    this.notifyListeners('up', { position: this.position, button, event });
  }

  handlePointerLeave(event) {
    this.isInside = false;
    this.touchId = null;
    this.buttons.left = this.buttons.middle = this.buttons.right = false;
    this.notifyListeners('leave', { event });
  }

  handlePointerCancel(event) {
    this.handlePointerLeave(event);
    this.notifyListeners('cancel', { event });
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  getButtonName(button) {
    switch (button) {
      case 0: return 'left';
      case 1: return 'middle';
      case 2: return 'right';
      default: return null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (e) {
        console.error('Pointer listener error:', e);
      }
    }
  }

  update() {
    this.buttonsDown.left = this.buttonsDown.middle = this.buttonsDown.right = false;
    this.buttonsUp.left = this.buttonsUp.middle = this.buttonsUp.right = false;
    this.clicked = false;
  }

  isButtonDown(button) {
    return this.buttonsDown[button] === true;
  }

  isButtonUp(button) {
    return this.buttonsUp[button] === true;
  }

  isButtonPressed(button) {
    return this.buttons[button] === true;
  }

  getSpeed() {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
  }

  getDirection() {
    return Math.atan2(this.velocity.y, this.velocity.x);
  }

  getDragDistance() {
    return Math.sqrt(
      (this.position.x - this.dragStart.x) ** 2 +
      (this.position.y - this.dragStart.y) ** 2
    );
  }

  getDragVector(out = {}) {
    out.x = this.position.x - this.dragStart.x;
    out.y = this.position.y - this.dragStart.y;
    return out;
  }

  destroy() {
    this.detach();
    this.listeners.clear();
  }
}

export const createPointerManager = (canvas) => new PointerManager(canvas);