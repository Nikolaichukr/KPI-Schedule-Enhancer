let tableCells = document.querySelectorAll("td");  // Отримуємо всі клітинки таблиць
let filteredCells = Array.from(tableCells).filter(td => td.querySelector("span.disLabel"));  // Фільтруємо лише ті, що містять предмети
let semesterSelect = document.getElementById("ctl00_MainContent_ddlSemesterType");  // Отримуємо доступ до елемента, що відповідає за вибір семестру

// Отримуємо назви дисциплін зі сторінки розкладу
function getDisciplinesData() {
    let uniqueDisciplines = [];  // Ініціалізуємо змінну для зберігання унікальних дисциплін

    if (filteredCells.length) {
        filteredCells.forEach(td => {
            let plainLinks = Array.from(td.querySelectorAll("span > a.plainLink"));  // Витягаємо елементи, що містять інформацію про пари
            let disciplineNames = plainLinks.map(a => a.textContent);  // Витагаємо текстові дані з елементів

            for (let disciplineName of disciplineNames) {
                
                // Формуємо об'єкти для кожної дисципліни
                let disciplineObj = {
                    name: disciplineName,
                    selected: false
                };
                // Збираємо унікальні дисципліни на основі їх назви (немає сенсу зберігати ще лекторів/практиків, достатньо назв, вони унікальні)
                if (!uniqueDisciplines.find(discipline => discipline.name === disciplineObj.name)) {
                    uniqueDisciplines.push(disciplineObj);
                };
            };
        });
    }
    return JSON.stringify(uniqueDisciplines)
}

// Приховуємо зайві дисципліни
function hideElementsExceptIndex(elements, index, isDiscipline) {
    if (isDiscipline && index === -1) {  // Якщо в клітинці таблиці немає обраних предметів - приховуємо всю клітинку
        elements[0].parentNode.style.display = "none";
    } else {  // Інакше, приховуємо все окрім потрібного предмету
        elements.forEach((element, i) => {
            if (i !== index) {
                element.style.display = "none";
            }
        })
    }
}

// Прибираємо рудименти - роздільники, які розділяли <a> елементи-дисципліни
function hideCommas(element) {
    let childNodes = element.childNodes;
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.nodeValue = "";
        }
    });
    let spanElement = element.querySelector("span.disLabel");
    if (spanElement) hideCommas(spanElement);
}

// Іноді трапляється, що тип пари / номер аудиторії відсутній, аби відобразити хоч якусь інформацію проводиться заміна неіснуючого індексу
function fixIndex(arr, index) {
    if (index >= arr.length) {
        let shortestString = arr.reduce((shortest, current) => current.textContent.length < shortest.textContent.length ? current : shortest);
        index = arr.findIndex(element => element.textContent.includes(shortestString.textContent))
    }
    return index
}

// Якщо обрано якісь дисципліни, то приховуємо усі, окрім них
function hideNonSelected(disciplines) {
    let selectedDisciplines = disciplines.filter(discipline => discipline.selected === true);
    
    if (selectedDisciplines.length > 0) {
        let disciplineNames = selectedDisciplines.map(discipline => discipline.name);
            
        // Спроба грамотно розпарсити табличку з розкладом, з урахуванням того, що частина інформації в ній може бути відсутня
        filteredCells.forEach(td => {
            let allLinks = Array.from(td.querySelectorAll("a.plainLink"));  // Зберігаємо увесь список елементів (предмети, викладачі, тип пари/номер аудиторії)
            let disciplineLinks = Array.from(td.querySelectorAll("span > a.plainLink"));  // Зберігаємо лише назви предметів
            let teachersLinks = allLinks.filter(link => link.hasAttribute("title")).slice(disciplineLinks.length);  // Зберігаємо лише викладачів
            let locationLinks = allLinks.slice(disciplineLinks.length + teachersLinks.length);   // Зберігаємо окремо тип пари / номер аудиторії
                
            // Отримуємо індекс обраної пари у списку
            let indexOfMatchingElement = disciplineLinks.findIndex(element => disciplineNames.some(name => element.textContent.includes(name)));
            let fixedLocationIndex = fixIndex(locationLinks, indexOfMatchingElement);  // Спроба відновити відсутній тип пари, змістивши індекс

            // Приховуємо зайву інформацію про дисципліни, викладачів та локації/тип пари
            hideElementsExceptIndex(disciplineLinks, indexOfMatchingElement, true);
            hideElementsExceptIndex(teachersLinks, indexOfMatchingElement);
            hideElementsExceptIndex(locationLinks, fixedLocationIndex);
            hideCommas(td);
        });
    }
}

// Виведення повідомлення на екран
function showAlert(message, duration) {
    let alertContainer = document.createElement("div");
    let alertMessage = document.createElement("div");
    let closeButton = document.createElement("span");
  
    alertContainer.id = "alert-container";
    alertMessage.id = "alert-message";
    closeButton.id = "close-button";
    closeButton.innerHTML = "&times;";
  
    alertMessage.innerText = message;
    alertContainer.appendChild(alertMessage);
    alertContainer.appendChild(closeButton);
    document.body.appendChild(alertContainer);
  
    closeButton.addEventListener("click", () => {
        alertContainer.style.display = "none";
    });
  
    if (duration > 0) {
        setTimeout(() => {
            alertContainer.style.display = "none";
        }, duration);
    }
}

// Доповнення поточного списку дисцилін новими, що було додано до розкладу
function updateDisciplinesList(newDisciplines) {
    chrome.storage.local.get(null, dataFromStorage => {
        let disciplines = JSON.parse(dataFromStorage[dataFromStorage.currentGroup][dataFromStorage.currentSemester]);
        for (let discipline of newDisciplines) {
            let newDisciplineObj = {
                name: discipline,
                selected: false
            };
            disciplines.push(newDisciplineObj);
        }
        dataFromStorage[dataFromStorage.currentGroup][dataFromStorage.currentSemester] = JSON.stringify(disciplines);
        chrome.storage.local.set(dataFromStorage);
    });
}

// Перезапис поперднього списку  дисциплін новими
function rewriteDisciplineList() {
    chrome.storage.local.get(null, dataFromStorage => {
        dataFromStorage[dataFromStorage.currentGroup][dataFromStorage.currentSemester] = getDisciplinesData();
        chrome.storage.local.set(dataFromStorage);
    });
}

// Розклад змінюється щосеместру, і, іноді, упродовж семестру - потрібно реагувати на ці зміни
function discoverChanges(disciplines) {
    let disciplinesFromStorage = disciplines.map(discipline => discipline.name);
    let disciplinesFromPage = JSON.parse(getDisciplinesData()).map(discipline => discipline.name);

    // Перевіряємо чи відповідає список дисциплін зі storage списку зі сторінки
    if (disciplinesFromPage.sort().toString() == disciplinesFromStorage.sort().toString()) {
        // якщо умова виконується, то не потрібно нічого робити, все чудово.
    } else if (disciplinesFromStorage.every(discipline => disciplinesFromPage.includes(discipline))) {
        let difference = disciplinesFromPage.filter(discipline => !disciplinesFromStorage.includes(discipline));
        showAlert(`Виявлено зміни в розкладі!\n\nБуло додано наступні дисципліни:\n\n ${difference.join(';\n')}.`, 20000);
        updateDisciplinesList(difference);
    } else {
        rewriteDisciplineList();
        showAlert("Схоже, що в розкладі відбулись суттєві зміни.\n\nСкоріш за все, це пов'язано з початком нового семестру.\n\nПопередній список дисциплін було перезаписано.\nОберіть, будь ласка, предмети наново.", 20000);
    }
    // Незалежно від того чи були зміни, приховаємо зайві дисципліни
    chrome.storage.local.get(null, data => hideNonSelected(JSON.parse(data[data.currentGroup][data.currentSemester])));
}

// Повертаємо поточний семестр
function getCurrentSemester() {
    return semesterSelect.options[semesterSelect.selectedIndex].text
};

// Пробуємо знайти на сторінці елемент з назвою групи
let element = document.getElementById("ctl00_MainContent_lblHeader");

// Якщо елемент присутній - ми на сторінці з розкладом
if (element) {
    let groupName = element.textContent.split(" ").at(-1);
    let currentSemester = getCurrentSemester();
    chrome.storage.local.set({ currentGroup: groupName, currentSemester: currentSemester });

    chrome.storage.local.get(["currentGroup", "currentSemester"], result => {
        chrome.storage.local.get(null, dataFromStorage => {
            let disciplines = dataFromStorage[result.currentGroup]?.[result.currentSemester];
            if (disciplines) {
                discoverChanges(JSON.parse(disciplines));  // Завантажуємо дисципліни зі storage та перевіряжмо чи змінився розклад
            } else { // Записуємо дані до storage
                (dataFromStorage[result.currentGroup] || (dataFromStorage[result.currentGroup] = {}))[result.currentSemester] = getDisciplinesData();
                chrome.storage.local.set(dataFromStorage);
            }
        });
    });
}