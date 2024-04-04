let currentQuestionIndex = 0;
let triviaQuestions = []; // This will be populated with the CSV content
let csvOriginalFileName = 'Special_SXSW-Party_40.csv'

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
  fetch(`00_CSV Files/${csvOriginalFileName}`)
    .then(response => response.text())
    .then(text => {
      triviaQuestions = parseCSV(text);
      displayQuestion();
      updateDifficultyCountDisplay();
      // Set up event listener for keyboard input
      document.addEventListener('keydown', handleKeydown);
    })
    .catch(error => console.error('Error loading CSV:', error));
}

function displayQuestion() {
  const questionElement = document.getElementById('question');
  const answerChoicesElement = document.getElementsByClassName('answer-choices')[0];
  const questionCountElement = document.getElementById('question-count');

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
  correctLi.id = 'correct-answer'; // Assign this ID to let us style the correct answer differently
  answerChoicesElement.appendChild(correctLi);

  // Append the wrong answers
  wrongAnswers.forEach(answer => {
    const li = document.createElement('li');
    li.textContent = answer;
    answerChoicesElement.appendChild(li);
  });

  // Check if 'NewDiff' is set; otherwise, do not display any difficulty
  const difficultyRating = currentItem['NewDiff'];

  // Reset button styles for all difficulty buttons
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).classList.remove('button-hover');
  }
  
  // Apply hover state style to the button matching the difficulty rating
  if (difficultyRating) {
    document.getElementById(`difficulty-button-${difficultyRating}`).classList.add('button-hover');
  }    
}

// Function to mark the difficulty score and highlight the corresponding button
function markDifficulty(score) {
  const currentItem = triviaQuestions[currentQuestionIndex];
  currentItem['NewDiff'] = score.toString(); // Save the user's input in the 'NewDiff' property
  highlightDifficultyButton(`difficulty-button-${score}`); // Highlight the button
  //nextQuestion(); // Move to the next question after marking difficulty
  updateDifficultyCountDisplay();

  // Set a timeout to delay moving to the next question
  setTimeout(() => {
    nextQuestion(); // Move to the next question after marking difficulty
  }, 500); // Adjust the delay as needed (in milliseconds)
}

// Reusable function to apply hover state style to a button
function highlightDifficultyButton(buttonId) {
  // Reset button styles for all difficulty buttons
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).classList.remove('button-hover');
  }
  
  // Apply hover state style to the specified button
  document.getElementById(buttonId).classList.add('button-hover');
}

// Count the number of non-empty values in the 'NewDiff' column
function countMarkedDifficulties() {
  let count = 0;
  triviaQuestions.forEach(function(question) {
    // Check if 'NewDiff' exists and is not empty
    if (question['NewDiff']) {
      count++;
    }
  });
  return count;
}

// Update the display of the count on the webpage
function updateDifficultyCountDisplay() {
  const count = countMarkedDifficulties();
  const countElement = document.getElementById('difficulty-count');
  if (countElement) {
    countElement.textContent = `${count}/${triviaQuestions.length}`;
  }
}

// Move to the previous question
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    displayQuestion();
  }
}

// Move to the next question
function nextQuestion() {
  if (currentQuestionIndex < triviaQuestions.length - 1) {
    currentQuestionIndex += 1;
    displayQuestion();
  }
}

// Convert the triviaQuestions array back to CSV format
function arrayToCSV(array) {
  let headers = Object.keys(array[0]);
  
  // Check if 'NewDiff' column already exists in the data; if not, add it after 'Difficulty'
  const difficultyIndex = headers.indexOf('Difficulty');
  const newDiffIndex = headers.indexOf('NewDiff');
  
  // If 'NewDiff' is not found in the array, we insert it right after 'Difficulty'
  if (newDiffIndex === -1 && difficultyIndex !== -1) {
      headers.splice(difficultyIndex + 1, 0, 'NewDiff');
  } else if (newDiffIndex > difficultyIndex + 1) {
      // 'NewDiff' exists but not in the right position; remove it and re-insert at correct place
      headers.splice(newDiffIndex, 1);
      headers.splice(difficultyIndex + 1, 0, 'NewDiff');
  }
  
  const csvRows = array.map(row => 
      headers.map(fieldName => {
          let value = row[fieldName] || ''; // Handle undefined or null values
          // Enclose in double quotes and escape internal quotes if necessary
          return /[\n",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
  );

  csvRows.unshift(headers.join(',')); // Add header row
  return csvRows.join('\r\n');
}

// Download the updated CSV
function downloadCSV() {
    const csvContent = arrayToCSV(triviaQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    let newCSVFileName = csvOriginalFileName.replace('.csv', '');

    link.setAttribute('href', url);
    link.setAttribute('download', `${newCSVFileName} (Rated).csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Handle keydown events for marking difficulty with keyboard keys 1-5
// and navigating questions with left and right arrow keys.
function handleKeydown(event) {
  switch (event.key) {
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
      // Call markDifficulty with the corresponding number
      markDifficulty(parseInt(event.key));
      break;
    case 'ArrowLeft':
      // Call previousQuestion when the left arrow key is pressed
      previousQuestion();
      break;
    case 'ArrowRight':
      // Call nextQuestion when the right arrow key is pressed
      nextQuestion();
      break;
    // Add additional cases here if needed
  }
}

// Set up event listeners
function setupEventListeners() {
  // Add click event listeners to the difficulty buttons
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).addEventListener('click', function() {
      markDifficulty(i);
    });
  }

  // Add keydown event listener to the document
  document.addEventListener('keydown', handleKeydown);
  
  // Other event listeners...
  document.getElementById('prev').addEventListener('click', previousQuestion);
  document.getElementById('next').addEventListener('click', nextQuestion);
  document.getElementById('submit').addEventListener('click', downloadCSV);
}
  
// Call loadCSV and set up event listeners when the page loads
window.onload = function() {
  loadCSV();
  setupEventListeners();
};