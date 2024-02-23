let currentQuestionIndex = 0;
let triviaQuestions = []; // This will be populated with the CSV content

// Function to parse the CSV file and extract necessary columns
function parseCSV(text) {
    const lines = text.split('\n');
    let headers = [];
    return lines.map((line, index) => {
      if (index === 0) {
        headers = line.split(',').map(cell => cell.trim());
        return {}; // Just return an empty object for the header row
      } else {
        const cells = line.match(/(".*?"|[^",\r]+)(?=\s*,|\s*$)/g) || [];
        const obj = {};
        cells.forEach((cell, i) => {
          obj[headers[i]] = cell.startsWith('"') && cell.endsWith('"')
            ? cell.slice(1, -1).replace(/""/g, '"')
            : cell;
        });
        return obj;
      }
    }).slice(1) // Remove headers
      .filter(row => Object.values(row).some(value => value.trim() !== '')); // Filter out empty rows
}

// Function to load the CSV data
function loadCSV() {
  fetch('Trivia.csv')
    .then(response => response.text())
    .then(text => {
      triviaQuestions = parseCSV(text);
      displayQuestion();
    })
    .catch(error => console.error('Error loading CSV:', error));
}

// Function to display the current question and answer choices
function displayQuestion() {
    const questionElement = document.getElementById('question');
    const answerChoicesElement = document.getElementsByClassName('answer-choices')[0];
    const questionCountElement = document.getElementById('questionCount'); // Get the question count element
  
    // Clear previous answer choices
    answerChoicesElement.innerHTML = '';
  
    // Get the current question and answers
    const currentItem = triviaQuestions[currentQuestionIndex];
    const question = currentItem['Question'];
    const correctAnswer = currentItem['Correct'];
    const wrongAnswers = [currentItem['Wrong1'], currentItem['Wrong2'], currentItem['Wrong3']];
  
    // Set the question text
    questionElement.textContent = question;
  
    // Update the question count display
    questionCountElement.textContent = `${currentQuestionIndex + 1}/${triviaQuestions.length}`; // 1-based index for display
  
    // Display the answer choices with the correct answer first
    const answers = [correctAnswer, ...wrongAnswers];
  
    // Create an element for the correct answer and apply a unique ID
    const correctLi = document.createElement('li');
    correctLi.textContent = correctAnswer;
    correctLi.id = 'correct-answer'; // Add an ID for styling the correct answer differently
    answerChoicesElement.appendChild(correctLi);
  
    // Append the wrong answers
    wrongAnswers.forEach(answer => {
      const li = document.createElement('li');
      li.textContent = answer;
      answerChoicesElement.appendChild(li);
    });
}

// Function to mark the difficulty score
function markDifficulty(score) {
  triviaQuestions[currentQuestionIndex]['Difficulty'] = score.toString();
  nextQuestion(); // Move to the next question after marking difficulty
}

// Function to move to the previous question
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    displayQuestion();
  }
}

// Function to move to the next question
function nextQuestion() {
  if (currentQuestionIndex < triviaQuestions.length - 1) {
    currentQuestionIndex += 1;
    displayQuestion();
  }
}

// Function to convert the triviaQuestions array back to CSV format
function arrayToCSV(array) {
    const headers = Object.keys(array[0]);
    const csvRows = array.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName] || ''; // Handle undefined or null values
        // Enclose in double quotes and escape internal quotes if necessary
        return /[\n",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    );

    csvRows.unshift(headers.join(',')); // Add header row
    return csvRows.join('\r\n');
}

// Function to download the updated CSV
function downloadCSV() {
    const csvContent = arrayToCSV(triviaQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Trivia (Rated).csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

// Function to set up event listeners
function setupEventListeners() {
    document.getElementById('easy').addEventListener('click', function() {
      markDifficulty(1);
    });
  
    document.getElementById('medium').addEventListener('click', function() {
      markDifficulty(2);
    });
  
    document.getElementById('hard').addEventListener('click', function() {
      markDifficulty(3);
    });
  
    document.getElementById('prev').addEventListener('click', previousQuestion);
    document.getElementById('next').addEventListener('click', nextQuestion);
    document.getElementById('submit').addEventListener('click', downloadCSV);
  }
  
  // Call loadCSV and set up event listeners when the page loads
  window.onload = function() {
    loadCSV();
    setupEventListeners();
  };