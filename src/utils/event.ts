import type { EventCallback } from "../types.js";

export default class EventEmitter {
  private eventHandlers = new Map<string, Set<EventCallback<any>>>();

  /**
   * Register an event handler.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event: string, callback: EventCallback<any>): () => void {
    if (typeof callback !== "function") {
      throw new TypeError("callback must be a function");
    }

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Register a handler that runs only once.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  once(event: string, callback: EventCallback<any>): () => void {
    const wrapper = async (data: any) => {
      this.off(event, wrapper);
      return callback(data);
    };

    return this.on(event, wrapper);
  }

  /**
   * Remove an event handler.
   * @param {string} event
   * @param {Function} callback
   */
  off(event: string, callback: EventCallback<any>): void {
    const callbacks = this.eventHandlers.get(event);

    if (!callbacks) {
      return;
    }

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit an event and wait for all handlers.
   * @param {string} event
   * @param {*} payload
   * @param {boolean} ignoreErrors
   */
  async emit(
    event: string,
    payload: unknown = null,
    ignoreErrors = true
  ): Promise<void> {
    const callbacks = this.eventHandlers.get(event);

    if (!callbacks) {
      return;
    }

    // Snapshot prevents modification during iteration
    // from affecting the current emit cycle.
    for (const callback of [...callbacks]) {
      try {
        await callback(payload);
      } catch (error) {
        if (!ignoreErrors) {
          throw error;
        }
      }
    }
  }

  /**
   * Remove all handlers for an event.
   * If no event is supplied, remove everything.
   */
  removeAll(event?: string): void {
    if (event !== undefined) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * Check whether an event has handlers.
   */
  has(event: string): boolean {
    return this.eventHandlers.has(event);
  }

  /**
   * Get number of handlers for an event.
   */
  listenerCount(event: string): number {
    return this.eventHandlers.get(event)?.size ?? 0;
  }
}
