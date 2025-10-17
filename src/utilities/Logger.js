import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs.json');

export class Logger {
	// Проверяем, работаем ли мы на сервере
	static isServer = typeof window === 'undefined';

	/**
	 * Основной метод логирования
	 * @param {string} level - Уровень лога (info, warn, error, debug)
	 * @param {string} message - Сообщение
	 * @param {Object} data - Дополнительные данные
	 */
	static async log(level, message, data = null) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			data
		};

		// Всегда выводим в консоль
		console.log(`[${level.toUpperCase()}] ${message}`, data || '');

		if (this.isServer) {
			// На сервере пишем напрямую в файл
			this.writeToFile(logEntry);
		} else {
			// На клиенте отправляем через API
			try {
				await fetch('/api/logs', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(logEntry),
				});
			} catch (error) {
				console.error('Failed to send log to server:', error);
			}
		}
	}

	/**
	 * Запись лога в файл (только на сервере)
	 */
	static writeToFile(logEntry) {
		try {
			let logs = [];
			
			// Читаем существующие логи
			if (fs.existsSync(LOG_FILE)) {
				const content = fs.readFileSync(LOG_FILE, 'utf-8');
				if (content) {
					logs = JSON.parse(content);
				}
			}

			// Добавляем новый лог
			logs.push(logEntry);

			// Ограничиваем количество логов (например, последние 1000)
			if (logs.length > 1000) {
				logs = logs.slice(-1000);
			}

			// Записываем обратно в файл
			fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
		} catch (error) {
			console.error('Failed to write log to file:', error);
		}
	}

	/**
	 * Чтение логов из файла (только на сервере)
	 */
	static readLogs() {
		try {
			if (fs.existsSync(LOG_FILE)) {
				const content = fs.readFileSync(LOG_FILE, 'utf-8');
				return content ? JSON.parse(content) : [];
			}
			return [];
		} catch (error) {
			console.error('Failed to read logs:', error);
			return [];
		}
	}

	/**
	 * Очистка логов (только на сервере)
	 */
	static clearLogs() {
		try {
			fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), 'utf-8');
			return true;
		} catch (error) {
			console.error('Failed to clear logs:', error);
			return false;
		}
	}

	// Удобные методы для разных уровней логирования
	static info(message, data) {
		return this.log('info', message, data);
	}

	static warn(message, data) {
		return this.log('warn', message, data);
	}

	static error(message, data) {
		return this.log('error', message, data);
	}

	static debug(message, data) {
		return this.log('debug', message, data);
	}
}

export default Logger;
