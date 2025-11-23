const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Инициализация базы данных
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('Подключение к SQLite базе установлено');
        initDatabase();
    }
});

// Создание таблицы если её нет
function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS health_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, type)
    )`);
}

// Генерация советов
function generateAdvice(data) {
    const advice = [];
    
    if (data.sleep && data.sleep < 7) {
        advice.push("Старайтесь спать не менее 7 часов для лучшего самочувствия.");
    } else if (data.sleep && data.sleep >= 7) {
        advice.push("Отличная продолжительность сна! Так держать!");
    }
    
    if (data.water && data.water < 6) {
        advice.push("Попробуйте пить больше воды сегодня.");
    } else if (data.water && data.water >= 6) {
        advice.push("Отлично справляетесь с водным балансом!");
    }
    
    if (data.steps && data.steps < 5000) {
        advice.push("Небольшая прогулка улучшит вашу активность.");
    } else if (data.steps && data.steps >= 5000 && data.steps < 10000) {
        advice.push("Хорошая активность! Почти у цели 10k шагов!");
    } else if (data.steps && data.steps >= 10000) {
        advice.push("Отличная активность! 10k+ шагов - это здорово!");
    }
    
    if (!data.nutrition) {
        advice.push("Не забудьте записать ваши приемы пищи.");
    }
    
    if (advice.length === 0) {
        return "Продолжайте в том же духе! Вы молодец!";
    } else {
        return advice.join(' ');
    }
}

// API: Получение данных за день
app.get('/api/data', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    db.all(
        "SELECT type, value FROM health_data WHERE date = ?", 
        [date], 
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            const data = {
                sleep: null,
                water: null,
                steps: null,
                nutrition: null
            };
            
            // Преобразуем строки в объект
            rows.forEach(row => {
                if (row.type === 'sleep' || row.type === 'water' || row.type === 'steps') {
                    data[row.type] = row.value ? parseFloat(row.value) : null;
                } else {
                    data[row.type] = row.value;
                }
            });
            
            // Добавляем совет
            data.advice = generateAdvice(data);
            
            res.json(data);
        }
    );
});

// API: Сохранение данных
app.post('/api/data', (req, res) => {
    const { date, type, value } = req.body;
    
    if (!date || !type) {
        return res.status(400).json({ error: 'Дата и тип обязательны' });
    }
    
    // Вставляем или обновляем запись
    const sql = `
        INSERT INTO health_data (date, type, value) 
        VALUES (?, ?, ?) 
        ON CONFLICT(date, type) 
        DO UPDATE SET value = excluded.value
    `;
    
    db.run(sql, [date, type, value], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, id: this.lastID });
    });
});

// API: Получение истории
app.get('/api/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 7;
    
    db.all(`
        SELECT date, 
               MAX(CASE WHEN type = 'sleep' THEN value END) as sleep,
               MAX(CASE WHEN type = 'water' THEN value END) as water,
               MAX(CASE WHEN type = 'steps' THEN value END) as steps,
               MAX(CASE WHEN type = 'nutrition' THEN value END) as nutrition
        FROM health_data 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Закрытие подключения к БД');
        process.exit(0);
    });
});