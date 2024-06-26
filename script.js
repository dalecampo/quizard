// Set this to true for an easy admin login. When deployed, switch to false.
let testingMode = false;

let clientId, deploymentId, apiKey, correctPassword, sheetId;
let currentQuestionIndex = 0;
let triviaQuestions = []; // This will be populated with question data from Google Sheets.
let filteredTriviaQuestions = []; // This will contain questions data for Qs that have been rated <10 times.
let username = "";
let validLogin = false;
let admin = false;

// Reference Heroku config vars to use with Quizard.
fetch('https://quizardapp-ae1181cd277d.herokuapp.com/api/credentials')
  .then((response) => response.json())
  .then((data) => {
    clientId = data.clientId;
    deploymentId = data.deploymentId;
    apiKey = data.apiKey;
    correctPassword = data.correctPassword;
    sheetId = data.sheetId;

    // Ensure the DOM is fully loaded before initializing
    window.onload = initGoogleIdentityServices();
  })
  .catch((error) => console.error(error));

///////////////////////////
// Google Login Handling //
///////////////////////////

// Function to initialize the Google Identity Services library
function initGoogleIdentityServices() {
  google.accounts.id.initialize({
    client_id: clientId,
    callback: updateUIAfterSignIn,
    auto_select: true // Optional: Automatically select an account if the user is signed in
  });

  // Render the Google sign-in button
  google.accounts.id.renderButton(
    document.getElementById('googleSignInButton'),
    { theme: 'outline', size: 'large' } // Customization options for the button
  );

  // Display the One Tap prompt
  google.accounts.id.prompt();
}

// Function to update the UI after a successful sign-in
function updateUIAfterSignIn() {
  // Hide the Google login button after successfully logging in, then display the Login section.
  document.getElementById('googleSignInButton').style.display = 'none';

  // If testing code, preset all login values.
  if (testingMode) {
    document.getElementById("password").value = correctPassword;
    document.getElementById("firstName").value = "Dale";
    document.getElementById("lastName").value = "Admin";
  }

  document.getElementById('loginForm').style.display = 'block';
}

////////////////////////////////
// Apps Script Function Calls //
////////////////////////////////

function sendDifficultyToSheet(questionId, difficultyRating, username) {
  fetch(`https://script.google.com/macros/s/${deploymentId}/exec`, {
    method: 'POST',
    mode: 'no-cors', // Required because Google Apps Script doesn't handle CORS
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'updateDifficulty',
      questionId: questionId,
      difficultyRating: difficultyRating,
      username: username
    })
  })
  .catch(error => console.error('Error:', error));
}

function insertNewColumnWithUsername(username) {
  fetch(`https://script.google.com/macros/s/${deploymentId}/exec`, {
    method: 'POST',
    mode: 'no-cors', // Required because Google Apps Script doesn't handle CORS
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'insertColumn',
      username: username
    })
  })
  .catch(error => console.error('Error:', error));
}

///////////////////////////
// Login Form Submission //
///////////////////////////

document.addEventListener("DOMContentLoaded", function() {
  // Form submission event
  document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent the form from submitting normally.

    // Get the values from the input fields.
    const password = document.getElementById("password").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    
    // Validate the password and check if names are provided.
    if (password === correctPassword && firstName && lastName) {
      // If valid, store the username and hide the login prompt
      username = `${firstName}.${lastName}`.toLowerCase();
      
      if (lastName.toLowerCase() === "admin") {
        admin = true;
        // Set up admin mode Q display settings.
        adminModeSetup();
      }

      // Create a new NewDiff column in the Google Sheet.
      insertNewColumnWithUsername(username);

      // Display sheet data (trivia questions) and set us hotkey access.
      loadFromGoogleSheets();
      setupEventListeners();

      // Hide the login prompt.
      document.querySelector('.login-prompt').style.display = 'none';

      // Show the main container (question + answer choices).
      let mainContainer = document.querySelector('.main-container');
      mainContainer.style.display = 'block';
      mainContainer.offsetWidth;
      mainContainer.style.opacity = '1';

      // Enable hotkey inputs. Before this, they are disabled to prevent accidental hotkey inputs.
      validLogin = true;
      
    } else {
      // If invalid login, display an error message.
      document.getElementById("errorMessage").textContent = "Incorrect password or missing name.";
    }
  });
});

//////////////////////////
// Google Sheet Loading //
//////////////////////////

let tabName = '';

// Retrieve the header row.
function getHeaderRow() {
  let lastName = username.split('.')[1];
  
  // If the user's last name is 'prize,' they'll see 'Prize Game' tab questions instead of 'Q Ratings' Qs.
  if (lastName === 'prize') {
    tabName = 'Prize Game';
  } else {
    tabName = 'Q Ratings';
  }

  const headerRange = `${tabName}!1:1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${headerRange}?key=${apiKey}`;

  return fetch(url)
      .then(response => response.json())
      .then(data => data.values[0]); // Assuming the first row is the header row
}

// Find the index of "Question" in the header row.
function findColumnIndex(headerRow, columnHeaderText) {
  const columnIndex = headerRow.findIndex(header => header === columnHeaderText);
  return columnIndex + 1; // Convert to 1-based index for A1 notation
}

// Convert a column index to its corresponding column letter(s).
function columnToLetter(columnIndex) {
  let letter = '', temp;
  while (columnIndex > 0) {
      temp = (columnIndex - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      columnIndex = (columnIndex - temp - 1) / 26;
  }
  return letter;
}

// Build the range string based on the column index of "Question" and the last column.
function buildRangeString(questionColumnIndex, lastColumnIndex) {
  const startColumn = columnToLetter(questionColumnIndex);
  const endColumn = columnToLetter(lastColumnIndex);
  return `${tabName}!${startColumn}1:${endColumn}`; // Range from the "Question" column to the last column
}

// Fetch the dynamic range based on the "Question" column.
function fetchDynamicQuestionDataRange() {
  return getHeaderRow().then(headerRow => {
    const questionColumnIndex = findColumnIndex(headerRow, "SourceQuestionId");
    const lastColumnIndex = headerRow.length; // The last column index is the count of headers
    const dynamicRange = buildRangeString(questionColumnIndex, lastColumnIndex);
    return dynamicRange;
  });
}

// Fetch the dynamic range based on the "Ratings" column.
function fetchRatingsCountColumnDataRange() {
  return getHeaderRow().then(headerRow => {
    const ratingsColumnIndex = findColumnIndex(headerRow, "Ratings");
    const dynamicRange = buildRangeString(ratingsColumnIndex, ratingsColumnIndex);
    return dynamicRange;
  });
}

// Fetch the dynamic range based on the "Ratings" column.
function fetchUsernameColumnDataRange() {
  return getHeaderRow().then(headerRow => {
    const usernameColumnIndex = findColumnIndex(headerRow, `NewDiff\n(${username})`);
    const usernameRange = buildRangeString(usernameColumnIndex, usernameColumnIndex);
    return usernameRange;
  });
}


function loadFromGoogleSheets() {
  Promise.all([fetchDynamicQuestionDataRange(), fetchRatingsCountColumnDataRange(), fetchUsernameColumnDataRange()])
    .then(([questionSheetRange, ratingsSheetRange, usernameSheetRange]) => {
      const urlQuestions = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${questionSheetRange}?key=${apiKey}`;
      const urlRatings = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${ratingsSheetRange}?key=${apiKey}`;
      const urlUsername = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${usernameSheetRange}?key=${apiKey}`;

      // Fetch question data
      fetch(urlQuestions)
        .then(response => response.json())
        .then(data => {
          const rows = data.values;
          if (rows && rows.length > 0) {
            triviaQuestions = rows.map((row, index) => {
              // Skip header row by starting mapping at index 1
              if (index === 0) return null;

              const obj = {
                'SourceQuestionId': row[0],
                'Question': row[1],
                'Correct': row[2],
                'Wrong1': row[3],
                'Wrong2': row[4],
                'Wrong3': row[5]
              };

              // Shuffle the answers and store the shuffled set of Answer choices as an additional property in the main obj.
              obj['RandomizedAnswers'] = shuffleArray([
                obj['Correct'],
                obj['Wrong1'],
                obj['Wrong2'],
                obj['Wrong3']
              ]);

              return obj;
            }).filter(Boolean); // Filter out nulls (which represent the header row).

            // Fetch ratings data
            fetch(urlRatings)
              .then(response => response.json())
              .then(data => {
                const ratings = data.values;
                if (ratings && ratings.length > 0) {
                  ratings.forEach((rating, index) => {
                    // Skip header row by starting mapping at index 1
                    if (index === 0) return;

                    const questionIndex = index - 1; // Adjust index to match triviaQuestions array
                    if (questionIndex >= 0 && questionIndex < triviaQuestions.length) {
                      triviaQuestions[questionIndex]['Ratings'] = rating[0];
                    }
                  });
                }

                // Fetch username data
                fetch(urlUsername)
                  .then(response => response.json())
                  .then(data => {
                    const usernameRatings = data.values;
                    if (usernameRatings && usernameRatings.length > 0) {
                      usernameRatings.forEach((usernameRating, index) => {
                        // Skip header row by starting mapping at index 1
                        if (index === 0) return;

                        const questionIndex = index - 1; // Adjust index to match triviaQuestions array
                        if (questionIndex >= 0 && questionIndex < triviaQuestions.length) {
                          triviaQuestions[questionIndex][`NewDiff (${username})`] = usernameRating[0];
                        }
                      });
                    }

                    // Filter out questions with Ratings > 10 and questions whose username column contains a value
                    filteredTriviaQuestions = triviaQuestions.filter(question =>
                      question.Ratings < 10 && !question[`NewDiff (${username})`]
                    );
                    
                    // Additional functions that handle the trivia questions
                    displayQuestion();
                    updateDifficultyCountDisplay();
                    document.addEventListener('keydown', handleKeydown);
                  })
                  .catch(error => {
                    console.error('Error fetching username data:', error);
                  });
              })
              .catch(error => {
                console.error('Error fetching ratings data:', error);
              });
          } else {
            console.log('No data available');
          }
        })
        .catch(error => {
          console.error('Error fetching question data:', error);
        });
    })
    .catch(error => {
      console.error('Error fetching sheet data ranges:', error);
    });
}

// Shuffle function to be used by loadFromGoogleSheets for answer choices
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

////////////////////
// Display Each Q //
////////////////////

function adminModeSetup() {
  if (admin) {
    questionElement = document.getElementById('question');
    questionElement.id = 'question-admin';
  }
}

// Display each question and its answer choices.
function displayQuestion() {
  // console.log(`filteredTriviaQuestions: ${JSON.stringify(filteredTriviaQuestions, null, 2)}`);
  if (admin) {
    questionElement = document.getElementById('question-admin');
  } else {
    // If you're a regular user...
    questionElement = document.getElementById('question');
  }
  
  const answerChoicesElement = document.getElementsByClassName('answer-choices')[0];
  const questionCountElement = document.getElementById('question-count');

  // Clear previous answer choices.
  answerChoicesElement.innerHTML = '';

  // Get the current question and its stored randomized answers.
  const currentItem = filteredTriviaQuestions[currentQuestionIndex];
  const question = currentItem['Question'];
  const correctAnswer = currentItem['Correct'];
  const randomizedAnswers = currentItem['RandomizedAnswers'];

  if (admin) {
    // Make the question text an editable text field.
    convertQuestionToTextField(questionElement, question);
  } else {
    // Set the question text.
    questionElement.textContent = question;
  }

  // Update the question count display.
  questionCountElement.textContent = `${currentQuestionIndex + 1}/${filteredTriviaQuestions.length}`;

  // Display the stored randomized answer choices.
  randomizedAnswers.forEach(answer => {
    const li = document.createElement('li');
    li.textContent = answer;
    li.addEventListener('click', () => handleAnswerClick(li, answer, correctAnswer));
    answerChoicesElement.appendChild(li);
  });

  // Check if `NewDiff (${username})`' has a value for this question; otherwise, do not display a difficulty.
  const difficultyRating = currentItem[`NewDiff (${username})`];

  // Reset button styles for all difficulty buttons
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).classList.remove('button-hover');
  }
  
  // Apply hover state style to the button matching the NewDiff rating if it exists.
  if (difficultyRating) {
    document.getElementById(`difficulty-button-${difficultyRating}`).classList.add('button-hover');
  }   
}

function convertQuestionToTextField(questionElement, question) {
  // Create an input element.
  var inputElement = document.createElement('input');
  inputElement.type = 'text';
  inputElement.classList.add('truncate-multiline');
  inputElement.id = 'question-admin';
  inputElement.value = question;

  // Replace the question element with the input element.
  questionElement.parentNode.replaceChild(inputElement, questionElement);

  // Focus on the input element
  inputElement.focus();
}

//////////////////////////
// Handle Q Interaction //
//////////////////////////

// Style answer choices based on the user's guess.
function handleAnswerClick(selectedLi, selectedAnswer, correctAnswer) {
  // Retrieve all the answer list items.
  const answerList = document.querySelectorAll('.answer-choices li');

  // Disable further clicks on answers and remove event listeners.
  answerList.forEach(li => {
    li.removeEventListener('click', handleAnswerClick);
    li.classList.add('disabled');
  });

  // Check if the selected answer is correct
  if (selectedAnswer === correctAnswer) {
    // Apply correct answer styling.
    selectedLi.id = 'correct-answer';
  } else {
    // Apply incorrect answer styling.
    selectedLi.id = 'incorrect-answer';

    // Find and highlight the correct answer.
    answerList.forEach(li => {
      if (li.textContent === correctAnswer) {
        li.id = 'correct-answer';
      }
    });
  }
}

// Reveal the correct answer (we'll use this for the spacebar user shortcut).
function revealCorrectAnswer() {
  // Retrieve the correct answer for the current question.
  const correctAnswer = filteredTriviaQuestions[currentQuestionIndex]['Correct'];
  
  // Find the <li> element that contains the correct answer text.
  const answerListItems = document.querySelectorAll('.answer-choices li');
  let correctLi;
  answerListItems.forEach(li => {
    if (li.textContent === correctAnswer) {
      correctLi = li;
    }
  });

  // Ensure that we have the correct <li> and it hasn't already been clicked.
  if (correctLi && !correctLi.classList.contains('disabled')) {
    // Call handleAnswerClick as if the correct answer was clicked.
    handleAnswerClick(correctLi, correctAnswer, correctAnswer);
  }
}

///////////////////////////////////
// Handle Difficulty Interaction //
///////////////////////////////////

// Mark the difficulty score and highlight the corresponding button.
function markDifficulty(score) {
  const currentItem = filteredTriviaQuestions[currentQuestionIndex];
  const newDiffValue = score.toString(); // Convert the score to a string.
  const sourceQuestionIdValue = currentItem['SourceQuestionId'];
  currentItem[`NewDiff (${username})`] = newDiffValue; // Save the user's input in the 'NewDiff' property.
  highlightDifficultyButton(`difficulty-button-${score}`); // Highlight the button.
  updateDifficultyCountDisplay();

  // Send the difficulty rating to the Google Sheet using the Apps Script Web App.
  sendDifficultyToSheet(sourceQuestionIdValue, newDiffValue, username);

  // Set a timeout to delay moving to the next question.
  setTimeout(() => {
    nextQuestion();
  }, 500); // Delay (in milliseconds)
}

// Apply hover state style to a difficulty button.
function highlightDifficultyButton(buttonId) {
  // Reset button styles for all difficulty buttons.
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).classList.remove('button-hover');
  }
  
  // Apply hover state style to the specified button.
  document.getElementById(buttonId).classList.add('button-hover');
}

// Count the number of non-empty values in the 'NewDiff' column.
function countMarkedDifficulties() {
  let count = 0;
  filteredTriviaQuestions.forEach(function(question) {
    // Check if 'NewDiff' exists and is not empty
    if (question[`NewDiff (${username})`]) {
      count++;
    }
  });
  return count;
}

// Update the display of the count on the webpage.
function updateDifficultyCountDisplay() {
  const count = countMarkedDifficulties();
  const countElement = document.getElementById('difficulty-count');
  if (countElement) {
    countElement.textContent = `${count}/${filteredTriviaQuestions.length}`;
  }
}

///////////////////
// Q Transitions //
///////////////////

// Move to the previous question.
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    displayQuestion();
  }
}

// Move to the next question.
function nextQuestion() {
  if (currentQuestionIndex < filteredTriviaQuestions.length - 1) {
    currentQuestionIndex += 1;
    displayQuestion();
  }
}

///////////////////////////////
// Hotkeys & Event Listeners //
///////////////////////////////

// Handle keydown events for marking difficulty with keyboard keys 1-5
// and navigating questions with left and right arrow keys.
function handleKeydown(event) {
  if (validLogin === true) {
    switch (event.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        // Call markDifficulty with the corresponding number.
        markDifficulty(parseInt(event.key));
        break;
      case 'ArrowLeft': // Left Arrow
        previousQuestion();
        break;
      case 'ArrowRight': // Right Arrow
        nextQuestion();
        break;
      case ' ': // Spacebar
        // Prevent the default action to stop scrolling the page.
        event.preventDefault();
        // Call revealCorrectAnswer when the spacebar is pressed.
        revealCorrectAnswer();
        break;
    }
  }
}

// Set up event listeners.
function setupEventListeners() {
  // Add click event listeners to the difficulty buttons.
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`difficulty-button-${i}`).addEventListener('click', function() {
      markDifficulty(i);
    });
  }

  // Add keydown event listener to the document.
  document.addEventListener('keydown', handleKeydown);
  
  // Other event listeners...
  document.getElementById('prev').addEventListener('click', previousQuestion);
  document.getElementById('next').addEventListener('click', nextQuestion);
}