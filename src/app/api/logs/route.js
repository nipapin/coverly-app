import { NextResponse } from 'next/server';
import Logger from '@/utilities/Logger';

// POST - сохранение лога
export async function POST(request) {
	try {
		const logEntry = await request.json();
		Logger.writeToFile(logEntry);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error saving log:', error);
		return NextResponse.json(
			{ error: 'Failed to save log' },
			{ status: 500 }
		);
	}
}

// GET - получение всех логов
export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const level = searchParams.get('level'); // фильтр по уровню
		const limit = parseInt(searchParams.get('limit') || '100'); // лимит записей

		let logs = Logger.readLogs();

		// Фильтрация по уровню
		if (level) {
			logs = logs.filter(log => log.level === level);
		}

		// Ограничение количества
		logs = logs.slice(-limit);

		return NextResponse.json({ logs, count: logs.length });
	} catch (error) {
		console.error('Error reading logs:', error);
		return NextResponse.json(
			{ error: 'Failed to read logs' },
			{ status: 500 }
		);
	}
}

// DELETE - очистка логов
export async function DELETE() {
	try {
		Logger.clearLogs();
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error clearing logs:', error);
		return NextResponse.json(
			{ error: 'Failed to clear logs' },
			{ status: 500 }
		);
	}
}

