/**
 * Circuit Breaker Pattern
 * Prevents cascading failures when Groq API goes down.
 *
 * States:
 * CLOSED   → normal operation, requests go through
 * OPEN     → too many failures, requests fail immediately
 * HALF_OPEN → testing if service recovered, one request allowed
 */

/** class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;

    // Config
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 min before retry

    console.log(`✅ CircuitBreaker [${this.name}] initialized`);
  }

  // Main method — wrap any async function
  async call(fn) {
    if (this.state === 'OPEN') {
      const now = Date.now();
      const timeSinceFailure = now - this.lastFailureTime;

      if (timeSinceFailure < this.timeout) {
        const waitSecs = Math.ceil((this.timeout - timeSinceFailure) / 1000);
        console.log(`⛔ CircuitBreaker [${this.name}] OPEN — retry in ${waitSecs}s`);
        throw new CircuitBreakerError(
          `Service temporarily unavailable. Retry in ${waitSecs} seconds.`,
          waitSecs
        );
      }

      // Timeout passed — try half open
      console.log(`🔶 CircuitBreaker [${this.name}] → HALF_OPEN`);
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      // Don't count circuit breaker errors as failures
      if (err instanceof CircuitBreakerError) throw err;
      this.onFailure(err);
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        console.log(`✅ CircuitBreaker [${this.name}] → CLOSED (recovered)`);
      }
    }
  }

  onFailure(err) {
    this.failures++;
    this.lastFailureTime = Date.now();
    console.error(`❌ CircuitBreaker [${this.name}] failure ${this.failures}/${this.failureThreshold}:`, err.message);

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successes = 0;
      console.log(`🔴 CircuitBreaker [${this.name}] → OPEN (half-open test failed)`);
      return;
    }

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🔴 CircuitBreaker [${this.name}] → OPEN after ${this.failures} failures`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextRetryIn: this.state === 'OPEN'
        ? Math.max(0, Math.ceil((this.timeout - (Date.now() - this.lastFailureTime)) / 1000))
        : 0,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    console.log(`🔄 CircuitBreaker [${this.name}] manually reset`);
  }
}

class CircuitBreakerError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.retryAfter = retryAfter;
    this.status = 503;
  }
}

module.exports = { CircuitBreaker, CircuitBreakerError }; **/