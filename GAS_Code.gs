function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  if (action === 'getQuestions') {
    return getQuestions(params);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid action'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return handlePost(e);
}

function handlePost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return outputJSON({status: 'error', message: 'Invalid JSON'});
  }
  
  const action = data.action;
  
  if (action === 'submitResult') return submitResult(data);
  if (action === 'generateQuestions') return generateQuestionsAI(data);
  if (action === 'getCollection') return getUserCollection(data);
  if (action === 'updateCollection') return saveUserCard(data);
  
  return outputJSON({status: 'error', message: 'Invalid action'});
}

function outputJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: Get or Create Player Data Sheet
function getPlayerSheet(ss) {
  let sheet = ss.getSheetByName('玩家資料');
  if (!sheet) {
    sheet = ss.insertSheet('玩家資料');
    sheet.appendRow(['PlayerID', 'CollectedCards_JSON', 'LastUpdated']);
  }
  return sheet;
}

function getUserCollection(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getPlayerSheet(ss);
  const userId = String(data.id).trim();
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let cards = [];
  
  // Find user (Skip header)
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === userId) {
      const jsonStr = values[i][1];
      try {
        cards = JSON.parse(jsonStr);
      } catch (e) {
        cards = [];
      }
      break;
    }
  }
  
  return outputJSON({ status: 'success', cards: cards });
}

function saveUserCard(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getPlayerSheet(ss);
  const userId = String(data.id).trim();
  const cardId = parseInt(data.cardId);
  
  if (!cardId) return outputJSON({ status: 'error', message: 'Invalid Card ID' });

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let rowIndex = -1;
  let cards = [];
  
  // Find user
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === userId) {
      rowIndex = i + 1; // 1-based index
      try {
        cards = JSON.parse(values[i][1]);
      } catch (e) {
        cards = [];
      }
      break;
    }
  }
  
  if (!cards.includes(cardId)) {
    cards.push(cardId);
    cards.sort((a,b) => a - b);
    
    const now = new Date();
    const jsonStr = JSON.stringify(cards);
    
    if (rowIndex !== -1) {
      // Update existing
      sheet.getRange(rowIndex, 2).setValue(jsonStr);
      sheet.getRange(rowIndex, 3).setValue(now);
    } else {
      // Create new
      sheet.appendRow([userId, jsonStr, now]);
    }
  }
  
  return outputJSON({ status: 'success', cards: cards });
}

// Helper to get sheets based on subject
function getSheets(ss, subject) {
  let qSheetName = '題目';
  let aSheetName = '回答';
  
  if (subject) {
    switch (subject) {
      case '歷史':
        qSheetName = '歷史_題目';
        aSheetName = '歷史_回答';
        break;
      case '地理':
        qSheetName = '地理_題目';
        aSheetName = '地理_回答';
        break;
      case '公民':
        qSheetName = '公民_題目';
        aSheetName = '公民_回答';
        break;
      // You can add more mappings here
    }
  }
  
  const qSheet = ss.getSheetByName(qSheetName);
  const aSheet = ss.getSheetByName(aSheetName);
  
  return { qSheet, aSheet, qSheetName, aSheetName };
}

function getQuestions(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { qSheet, qSheetName } = getSheets(ss, params.subject);
  
  if (!qSheet) return outputJSON({status: 'error', message: `Sheet "${qSheetName}" not found`});
  
  const qRange = qSheet.getDataRange();
  const rows = qRange.getValues();
  const headers = rows.shift(); // Remove headers
  
  // headers: 題號(0), 題目(1), A(2), B(3), C(4), D(5), 解答(6)
  
  const questionCount = parseInt(params.count || 10);
  
  // Shuffle and pick N
  const shuffled = rows.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, questionCount);
  
  const questions = selected.map(row => ({
    id: row[0],
    text: row[1],
    options: {
      A: row[2],
      B: row[3],
      C: row[4],
      D: row[5]
    }
  }));
  
  return outputJSON({status: 'success', questions: questions});
}

function submitResult(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { qSheet, aSheet, qSheetName, aSheetName } = getSheets(ss, data.subject);
  
  if (!qSheet || !aSheet) return outputJSON({status: 'error', message: `Missing sheets: ${qSheetName} or ${aSheetName}`});
  
  // Read Questions (Up to 8 columns: ID, Text, A, B, C, D, Answer, Explanation)
  const qRange = qSheet.getDataRange();
  const qRows = qRange.getValues();
  qRows.shift(); // headers
  
  const questionMap = {};
  qRows.forEach(row => {
    questionMap[row[0]] = {
      answer: String(row[6]).trim().toUpperCase(),
      text: row[1],
      explanation: row[7] || "", // Column H is Explanation
      options: {
        'A': row[2],
        'B': row[3],
        'C': row[4],
        'D': row[5]
      }
    };
  });
  
  let score = 0;
  let correctCount = 0;
  const userAnswers = data.answers;
  const totalQuestions = Object.keys(userAnswers).length;
  
  // Handle User Data & Wrong History
  const aData = aSheet.getDataRange().getValues();
  let userRowIndex = -1;
  const userId = String(data.id).trim();
  
  // Find user row
  for (let i = 1; i < aData.length; i++) {
    if (String(aData[i][0]) === userId) {
      userRowIndex = i;
      break;
    }
  }

  // Load User's Wrong History (Column H / Index 7)
  let wrongHistory = {};
  if (userRowIndex !== -1 && aData[userRowIndex][7]) {
     try {
       wrongHistory = JSON.parse(aData[userRowIndex][7]);
     } catch (e) {
       wrongHistory = {};
     }
  }

  // Prepare Review Data
  const reviewDetails = [];
  const wrongQuestions = [];
  
  for (const [qId, ans] of Object.entries(userAnswers)) {
    const qInfo = questionMap[qId];
    if (!qInfo) continue;
    
    const correctAns = qInfo.answer;
    const userAns = String(ans).trim().toUpperCase();
    const isCorrect = correctAns === userAns;
    
    // Get text for answers
    const userAnsText = qInfo.options[userAns] || "";
    const correctAnsText = qInfo.options[correctAns] || "";
    
    // Track stats
    if (isCorrect) {
      score += 10;
      correctCount++;
    } else {
      wrongQuestions.push(qInfo.text);
      // Increment wrong count for this question ID
      wrongHistory[qId] = (wrongHistory[qId] || 0) + 1;
    }
    
    reviewDetails.push({
      id: qId,
      text: qInfo.text,
      userAnswer: userAns,
      userAnswerText: userAnsText,
      correctAnswer: correctAns,
      correctAnswerText: correctAnsText,
      explanation: qInfo.explanation, // Add Explanation
      wrongCount: wrongHistory[qId] || 0, // Add User's specific wrong count
      isCorrect: isCorrect
    });
  }
  
  const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  
  const now = new Date();
  
  if (userRowIndex !== -1) {
    // Update existing user
    const row = aData[userRowIndex];
    let count = parseInt(row[1] || 0) + 1;
    let maxScore = Math.max(parseInt(row[3] || 0), finalScore);
    let firstClear = row[4];
    let attemptsToClear = row[5];
    
    const isPass = correctCount >= (data.passThresholdCount || 999); 
    
    if (isPass && (firstClear === "" || firstClear === undefined)) {
        firstClear = finalScore;
        attemptsToClear = count;
    }
    
    // Write back 8 columns (cols 1-8). Row is userRowIndex + 1
    const range = aSheet.getRange(userRowIndex + 1, 1, 1, 8);
    range.setValues([[userId, count, finalScore, maxScore, firstClear, attemptsToClear, now, JSON.stringify(wrongHistory)]]);
    
  } else {
    // New user
    const isPass = correctCount >= (data.passThresholdCount || 999);
    let attemptsToClear = isPass ? 1 : "";
    let firstClear = isPass ? finalScore : "";
    
    aSheet.appendRow([userId, 1, finalScore, finalScore, firstClear, attemptsToClear, now, JSON.stringify(wrongHistory)]);
  }
  
  return outputJSON({
    status: 'success', 
    score: finalScore, 
    correctCount: correctCount,
    total: totalQuestions,
    review: reviewDetails,
    wrongQuestions: wrongQuestions
  });
}

function generateQuestionsAI(data) {
  const wrongTexts = data.wrongQuestions;
  const subject = data.subject; // Get subject from request
  
  if (!wrongTexts || wrongTexts.length === 0) {
    return outputJSON({status: 'error', message: 'No wrong questions to analyze'});
  }
  
  // Use GROQ_API_KEY
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  
  if (!API_KEY) {
    return outputJSON({status: 'error', message: 'Missing GROQ_API_KEY in Script Properties'});
  }
  
  try {
    const prompt = `
      You are a quiz generator. Based on these wrong questions: 
      ${JSON.stringify(wrongTexts)}
      
      Generate 2 NEW similar multiple-choice questions for EACH wrong question.
      Subject context: ${subject || 'General Knowledge'}.
      Target language: Traditional Chinese (繁體中文).
      
      STRICTLY return ONLY a raw JSON array of arrays (no markdown, no code blocks).
      Format for each inner array:
      ["AUTO", Question Text, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), "Short explanation of the answer"]
      
      Example:
      [["AUTO", "Question?", "A", "B", "C", "D", "A", "Because A is..."], ["AUTO", "Question?", "A", "B", "C", "D", "B", "Because B is..."]]
    `;
    
    // Using Groq (Llama 3.3 70b Versatile)
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const payload = {
      model: "llama-3.3-70b-versatile", 
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        "Authorization": "Bearer " + API_KEY
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(url, options);
    return handleGroqResponse(response, subject);

  } catch (e) {
    return outputJSON({ status: 'error', message: e.toString() });
  }
}

function handleGroqResponse(response, subject) {
    const result = JSON.parse(response.getContentText());
    let aiContent = result.choices[0].message.content;
    
    // Clean up any potential markdown
    aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let newRows;
    try {
      newRows = JSON.parse(aiContent);
    } catch (e) {
      // Fallback: If AI returned multiple arrays separated by comma (e.g. [[...]], [[...]]), wrap them
      try {
        newRows = JSON.parse(`[${aiContent}]`);
        // If this works, we likely have a 3D array: [ [[...],[...]], [[...],[...]] ]
        // We need to flatten it once to get back to [ [...], [...], [...], [...] ]
        if (Array.isArray(newRows)) {
          newRows = newRows.flat();
        }
      } catch (e2) {
        return outputJSON({ status: 'error', message: 'Failed to parse JSON: ' + aiContent });
      }
    }

    try {
      if (Array.isArray(newRows) && newRows.length > 0) {
         // Flatten again just in case AI returned a list of lists of questions
         // We expect a list of Questions, where each Question is an array. 
         // Expected: [ ["AUTO",...], ["AUTO",...] ]
         // If we have [ [ ["AUTO",...], ["AUTO",...] ], [ ["AUTO",...] ] ], flatten it.
         
         // simple check: if the first element is an array, and the first element of THAT array is also an array...
         // Actually, safer to just ensure we are iterating over rows.
         // If newRows[0][0] is "AUTO" (string), it's good.
         // If newRows[0][0] is Array, it needs flattening.
         
         if (Array.isArray(newRows[0]) && Array.isArray(newRows[0][0])) {
           newRows = newRows.flat();
         }

         const ss = SpreadsheetApp.getActiveSpreadsheet();
         // Pass subject to getSheets to get the correct Question Sheet
         const { qSheet, qSheetName } = getSheets(ss, subject);
         
         if (!qSheet) {
            return outputJSON({ status: 'error', message: `Sheet ${qSheetName} not found during AI generation` });
         }
         
         // Fetch all existing questions to check duplicates
         const existingData = qSheet.getDataRange().getValues();
         const existingQuestions = new Set();
         // Skip header, store question text (column 1, index 1) normalized
         for (let i = 1; i < existingData.length; i++) {
           if (existingData[i][1]) {
             existingQuestions.add(String(existingData[i][1]).trim().toLowerCase());
           }
         }
         
         // Calculate next ID
         const lastRow = qSheet.getLastRow();
         let nextId = 1; 
         
         if (lastRow > 1) {
           const lastIdVal = qSheet.getRange(lastRow, 1).getValue();
           if (!isNaN(parseFloat(lastIdVal))) {
             nextId = parseFloat(lastIdVal) + 1;
           }
         }
         
         let addedCount = 0;
         newRows.forEach(row => {
           // Basic validation: row should be array
           if (!Array.isArray(row)) return;
           
           // Check duplicate (Question text is at index 1)
           const qText = String(row[1]).trim().toLowerCase();
           if (!existingQuestions.has(qText)) {
             row[0] = nextId; // Overwrite ID
             qSheet.appendRow(row);
             existingQuestions.add(qText); // Add to set to prevent internal duplicates in potential batch
             nextId++;
             addedCount++;
           }
         });
         
         return outputJSON({ status: 'success', count: addedCount });
      } else {
         return outputJSON({ status: 'error', message: 'Parsed data is not an array' });
      }
    } catch (e) {
      return outputJSON({ status: 'error', message: 'Error processing AI rows: ' + e.toString() });
    }
}

function debugAI() {
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  try {
    const response = UrlFetchApp.fetch(url);
    console.log(response.getContentText());
  } catch(e) {
    console.log("Error: " + e.toString());
  }
}

