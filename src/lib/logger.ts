/**
 * Structured logging utility for CloudWatch
 * Ensures logs are properly formatted and can be filtered in CloudWatch
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: string | number | boolean | null | undefined
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const timestamp = new Date().toISOString()
  const logEntry: any = {
    timestamp,
    level,
    message,
    ...context,
  }

  if (error) {
    logEntry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  // In production, log as JSON for CloudWatch structured logs
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logEntry)
  }

  // In development, pretty print
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  const ctxStr = context ? ` ${JSON.stringify(context)}` : ''
  const errStr = error ? `\n${error.stack}` : ''
  return `${prefix} ${message}${ctxStr}${errStr}`
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatLog('info', message, context))
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context))
  },
  error(message: string, error?: Error, context?: LogContext) {
    console.error(formatLog('error', message, context, error))
  },
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, context))
    }
  },
}

