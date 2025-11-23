let currentDate = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD

// Элементы DOM
const currentDateElement = document.getElementById('currentDate');
const prevDayButton = document.getElementById('prevDay');
const nextDayButton = document.getElementById('nextDay');

// Обновляем отображение даты
function updateDateDisplay() {
    const today = new Date().toISOString().split('T')[0];
    if (currentDate === today) {
        currentDateElement.textContent = 'Сегодня';
    } else {
        const date = new Date(currentDate);
        currentDateElement.textContent = date.toLocaleDateString('ru-RU');
    }
    loadDayData();
}

// Загрузка данных за выбранный день
async function loadDayData() {
    try {
        const response = await fetch(`http://localhost:3000/api/data?date=${currentDate}`);
        const data = await response.json();
        
        // Обновляем карточки
        updateCard('sleep', data.sleep, 'ч');
        updateCard('water', data.water, 'ст');
        updateCard('steps', data.steps, 'ш');
        updateCard('nutrition', data.nutrition, '');
        
        // Обновляем совет
        document.getElementById('adviceText').textContent = data.advice || 'Внесите данные для получения совета';
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function updateCard(type, value, suffix) {
    const card = document.querySelector(`[data-type="${type}"]`);
    const valueElement = card.querySelector('.value');
    
    if (value !== null && value !== undefined) {
        if (type === 'steps') {
            valueElement.textContent = value.toLocaleString('ru-RU') + (suffix ? ' ' + suffix : '');
        } else {
            valueElement.textContent = value + (suffix ? ' ' + suffix : '');
        }
    } else {
        if (type === 'steps') {
            valueElement.textContent = '0 ш';
        } else {
            valueElement.textContent = type === 'nutrition' ? 'Не указано' : '-' + suffix;
        }
    }
}

// Навигация по дням
prevDayButton.addEventListener('click', () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    currentDate = date.toISOString().split('T')[0];
    updateDateDisplay();
});

nextDayButton.addEventListener('click', () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    currentDate = date.toISOString().split('T')[0];
    updateDateDisplay();
});

// Инициализация
updateDateDisplay();

// Модальное окно
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const numberInput = document.getElementById('numberInput');
const textInput = document.getElementById('textInput');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

let currentEditingType = '';

// Открытие модального окна для редактирования
document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        currentEditingType = card.dataset.type;
        
        modalTitle.textContent = `Редактирование: ${getTypeName(currentEditingType)}`;
        
        // Показываем нужное поле ввода
        if (currentEditingType === 'nutrition') {
            numberInput.style.display = 'none';
            textInput.style.display = 'block';
            textInput.value = '';
            textInput.focus();
        } else {
            numberInput.style.display = 'block';
            textInput.style.display = 'none';
            numberInput.value = '';
            numberInput.placeholder = getInputPlaceholder(currentEditingType);
            numberInput.focus();
        }
        
        modal.style.display = 'block';
    });
});

// Закрытие модального окна
cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Сохранение данных
saveBtn.addEventListener('click', async () => {
    let value;
    
    if (currentEditingType === 'nutrition') {
        value = textInput.value.trim();
    } else {
        value = numberInput.value ? parseFloat(numberInput.value) : null;
    }
    
    if (currentEditingType !== 'nutrition' && (value === null || value < 0)) {
        alert('Пожалуйста, введите корректное значение');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: currentDate,
                type: currentEditingType,
                value: value
            })
        });
        
        if (response.ok) {
            modal.style.display = 'none';
            loadDayData(); // Перезагружаем данные
        } else {
            alert('Ошибка при сохранении данных');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером');
    }
});

// Закрытие модального окна по клику вне его
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Ввод по Enter в полях
numberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveBtn.click();
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveBtn.click();
});

// Вспомогательные функции
function getTypeName(type) {
    const names = {
        'sleep': 'Сон',
        'water': 'Вода', 
        'steps': 'Шаги',
        'nutrition': 'Питание'
    };
    return names[type] || type;
}

function getInputPlaceholder(type) {
    const placeholders = {
        'sleep': 'Часы сна (например, 7.5)',
        'water': 'Количество стаканов',
        'steps': 'Количество шагов'
    };
    return placeholders[type] || 'Введите значение';
}

// Загружаем данные при старте
document.addEventListener('DOMContentLoaded', () => {
    loadDayData();
});