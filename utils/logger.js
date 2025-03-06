const { createLogger, format, transports } = require('winston');

// Formats de logs
const logFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Configuration du logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug', // Niveau de logs
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    new transports.Console(), // Logs dans la console
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Logs d'erreurs dans un fichier
    new transports.File({ filename: 'logs/combined.log' }), // Tous les logs combinés
  ],
});

// En production, désactiver les logs debug dans la console
if (process.env.NODE_ENV === 'production') {
  logger.remove(new transports.Console());
}

module.exports = logger;
