let textField = document.getElementById("textField");
let disciplinesList = document.getElementById("disciplines-list");
let searchInput = document.getElementById("search-input");
let reloadButton = document.getElementById("reloadButton");

function getStoredData(result) {
    return result?.[result.currentGroup] ? JSON.parse(result[result.currentGroup]) : [];
}

// Функція для відображення списку обраних дисциплін
function showDisciplines() {
    let container = document.createElement("div");
    chrome.storage.local.get(null, result => { // Отримуємо дані зі storage
        let storedData =  getStoredData(result);
        let shownDisciplines = storedData.filter(discipline => discipline.selected === true); // Відфільтровуємо лише обрані
        
        textField.innerText = result.currentGroup ? `Обрані дисципліни для групи ${result.currentGroup}` : "Для початку роботи відкрийте сторінку з розкладом своєї групи (якщо вона вже відкрита, і ви бачите це повідомлення, то перезавантажте її)";
        searchInput.value = "";

        if (shownDisciplines.length > 0) { // Для кожної ж з дисциплін створюємо елемент
            shownDisciplines.forEach(discipline => createDisciplineItem(discipline, container));
        } else {  // Якщо ж дисциплін немає - сповіщаємо про це
            let div = document.createElement("div");
            div.textContent = result.currentGroup ? "Обраних дисциплін для цієї групи немає. Скористайтесь пошуком, аби додати нові дисципліни." : "";
            container.appendChild(div);
        }
        disciplinesList.innerHTML = container.innerHTML;
        deleteButtons = disciplinesList.querySelectorAll(".delete-button");

        // Додаємо можливість видалення дисципліни зі списку обраних
        deleteButtons.forEach(deleteButton => {
            deleteButton.addEventListener("click", () => {
                let discipline = storedData.find(discipline => discipline.name === deleteButton.value);
                discipline.selected = false;
                result[result.currentGroup] = JSON.stringify(storedData);
                chrome.storage.local.set(result);
                showDisciplines();
            });
        })
    });
}

// Функція для фільтрації результатів пошуку за запитом
function filterSuggestions(suggestions, query) {
    return suggestions.filter(suggestion => suggestion.name.toLowerCase().includes(query.toLowerCase()));
}

// Створення елементу списку для результатів пошуку
function createSuggestionItem(suggestion, container) {
    let div = document.createElement("div");
    let button = document.createElement("button");
    button.classList.add("suggestion-button");
    button.textContent = suggestion.name;
    div.appendChild(button);
    container.appendChild(div);
}

// Створення елементу списку обраних дисциплін
function createDisciplineItem(discipline, container) {
    let div = document.createElement("div");
    div.classList.add("discipline-item");
    let name = document.createElement("span");
    name.textContent = discipline.name;
    div.appendChild(name);

    let deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-button");
    deleteButton.textContent = "х";
    deleteButton.value = discipline.name
    div.appendChild(deleteButton);

    container.appendChild(div);
}

// Пошук співпадінь за фрагментом назви дисципліни та додавання дисципліни до обраних
function showSuggestions(query) {
    let container = document.createElement("div");

    if (query.length > 0) {
        chrome.storage.local.get(null, result => {  // Отримуємо дані зі storage
            let storedData = getStoredData(result);
            let suggestions = storedData.filter(discipline => discipline.selected === false);
            let filteredSuggestions = filterSuggestions(suggestions, query);
            textField.innerText = "Оберіть дисципліну зі списку";
            
            if (filteredSuggestions.length > 0) {  // Якщо при пошуці є збіги
                filteredSuggestions.forEach(suggestion => createSuggestionItem(suggestion, container));  // Виводимо їх на екран
                
                disciplinesList.innerHTML = container.innerHTML;
                suggestionButtons = disciplinesList.querySelectorAll(".suggestion-button");
                
                // Додаємо обробку події натискання на кнопку (додавання предмету до списку обраних)
                suggestionButtons.forEach(button => {
                    button.addEventListener("click", () => {
                        let suggestion = storedData.find(discipline => discipline.name === button.textContent);
                        if (suggestion) suggestion.selected = true;
                        result[result.currentGroup] = JSON.stringify(storedData);
                        chrome.storage.local.set(result);
                        showDisciplines();
                    });
                });
            } else {
                disciplinesList.textContent = "Збігів за запитом не знайдено.";
            }
        });
    } else {
        showDisciplines();
    }
}

// Функція для перезавантаження сторінки
function reloadActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.reload(tabs[0].id);
    });
}

// Після завантаження відображаємо список дисциплін
document.addEventListener("DOMContentLoaded", () => showDisciplines());

// При вводі виводимо результати пошуку
searchInput.addEventListener("input", () => {
    let query = searchInput.value;
    showSuggestions(query);
});

// Перезавантажити сторінку, аби відобразити зміни
reloadButton.addEventListener('click', () => reloadActiveTab());