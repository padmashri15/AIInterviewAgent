// Interview Bot Implementation

// 1. SETUP AND REQUIRED LIBRARIES
// ------------------------------
// index.js - Main application file

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const cors = require('cors');

// Initialize OpenAI client (you'll need an API key)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 2. KNOWLEDGE BASE MANAGEMENT
// ---------------------------
// Load knowledge base from JSON file
const loadKnowledgeBase = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'knowledgeBase.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    // Return default knowledge base if file doesn't exist
    return {
      topics: {
        "generativeAI": {
          name: "Generative AI",
          questions: [
            {
              id: "q1",
              question: "What are the key differences between generative and discriminative AI models?",
              expectedPoints: [
                "Generative models learn the joint probability distribution",
                "Discriminative models learn the conditional probability distribution",
                "Generative models can create new data samples",
                "Discriminative models focus on classification boundaries"
              ],
              difficulty: "medium"
            },
            {
              id: "q2",
              question: "Explain how transformer models work in generative AI applications.",
              expectedPoints: [
                "Self-attention mechanism",
                "Encoder-decoder architecture",
                "Positional encoding",
                "Masked attention for autoregressive generation"
              ],
              difficulty: "hard"
            },
            {
              id: "q3",
              question: "What are some ethical considerations in developing generative AI systems?",
              expectedPoints: [
                "Bias in training data and outputs",
                "Potential for deepfakes and misinformation",
                "Privacy concerns with training data",
                "Attribution and copyright issues"
              ],
              difficulty: "medium"
            }
          ]
        }
      },
      evaluationCriteria: {
        excellent: 0.85,
        good: 0.7,
        satisfactory: 0.5,
        unsatisfactory: 0
      },
      interviewSettings: {
        minQuestions: 3,
        maxQuestions: 5,
        passingScore: 0.7
      }
    };
  }
};

// Save knowledge base to JSON file
const saveKnowledgeBase = (knowledgeBase) => {
  try {
    fs.writeFileSync(
      path.join(__dirname, 'knowledgeBase.json'),
      JSON.stringify(knowledgeBase, null, 2),
      'utf8'
    );
    return true;
  } catch (error) {
    console.error('Error saving knowledge base:', error);
    return false;
  }
};

// 3. INTERVIEW ENGINE
// -----------------
// Function to select interview questions
const selectQuestions = (knowledgeBase, topic) => {
  if (!knowledgeBase.topics[topic]) {
    return [];
  }
  
  const allQuestions = knowledgeBase.topics[topic].questions;
  const numQuestions = Math.min(
    Math.max(allQuestions.length, knowledgeBase.interviewSettings.minQuestions),
    knowledgeBase.interviewSettings.maxQuestions
  );
  
  // Shuffle and pick questions
  return [...allQuestions]
    .sort(() => 0.5 - Math.random())
    .slice(0, numQuestions);
};

// Function to evaluate responses using OpenAI
const evaluateResponse = async (question, expectedPoints, userResponse) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interview evaluator for technical positions. 
          Evaluate how well the candidate's response addresses the question and expected points.
          Return a JSON object with the following structure:
          {
            "score": (number between 0 and 1),
            "feedback": (detailed feedback with strengths and areas for improvement),
            "coveredPoints": [list of expected points that were covered],
            "missedPoints": [list of expected points that were missed]
          }`
        },
        {
          role: "user",
          content: `
          Question: ${question}
          
          Expected points to cover:
          ${expectedPoints.map(point => `- ${point}`).join('\n')}
          
          Candidate's response:
          "${userResponse}"
          
          Evaluate the response and provide a score between 0 and 1, along with detailed feedback.`
        }
      ]
    });
    
    // Parse the response
    const evaluationText = response.choices[0].message.content;
    const evaluationJson = JSON.parse(evaluationText);
    
    return evaluationJson;
  } catch (error) {
    console.error('Error evaluating response:', error);
    return {
      score: 0,
      feedback: "Error evaluating response. Please try again.",
      coveredPoints: [],
      missedPoints: expectedPoints
    };
  }
};

// Function to generate overall feedback
const generateOverallFeedback = async (interviewResults, passingScore) => {
  try {
    const averageScore = interviewResults.reduce((sum, result) => sum + result.score, 0) / interviewResults.length;
    const passed = averageScore >= passingScore;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer providing final feedback to a candidate. 
          Be constructive, specific, and actionable in your feedback.`
        },
        {
          role: "user",
          content: `
          Interview Results:
          ${interviewResults.map((result, index) => 
            `Question ${index + 1}: "${result.question}"
             Score: ${result.score.toFixed(2)}
             Feedback: ${result.feedback}
             Covered Points: ${result.coveredPoints.join(', ')}
             Missed Points: ${result.missedPoints.join(', ')}`
          ).join('\n\n')}
          
          Average Score: ${averageScore.toFixed(2)}
          Passing Score: ${passingScore}
          Final Result: ${passed ? 'PASSED' : 'FAILED'}
          
          Please provide comprehensive feedback to the candidate about their overall performance, 
          highlighting strengths, areas for improvement, and next steps.`
        }
      ]
    });
    
    return {
      passed,
      averageScore,
      feedback: response.choices[0].message.content
    };
  } catch (error) {
    console.error('Error generating overall feedback:', error);
    return {
      passed: false,
      averageScore: 0,
      feedback: "Error generating feedback. Please contact the administrator."
    };
  }
};

// 4. API ENDPOINTS
// --------------
// API endpoint to start an interview
app.post('/api/interview/start', (req, res) => {
  const { topic } = req.body;
  const knowledgeBase = loadKnowledgeBase();
  
  if (!knowledgeBase.topics[topic]) {
    return res.status(404).json({ error: `Topic ${topic} not found` });
  }
  
  const questions = selectQuestions(knowledgeBase, topic);
  
  res.json({
    topic: knowledgeBase.topics[topic].name,
    questions: questions.map(q => ({ id: q.id, question: q.question })),
    totalQuestions: questions.length
  });
});

// API endpoint to submit a response to a question
app.post('/api/interview/evaluate', async (req, res) => {
  const { questionId, response, topic } = req.body;
  const knowledgeBase = loadKnowledgeBase();
  
  if (!knowledgeBase.topics[topic]) {
    return res.status(404).json({ error: `Topic ${topic} not found` });
  }
  
  const question = knowledgeBase.topics[topic].questions.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: `Question with ID ${questionId} not found` });
  }
  
  const evaluation = await evaluateResponse(question.question, question.expectedPoints, response);
  
  res.json({
    questionId,
    question: question.question,
    userResponse: response,
    ...evaluation
  });
});

// API endpoint to complete the interview and get final results
app.post('/api/interview/complete', async (req, res) => {
  const { results, topic } = req.body;
  const knowledgeBase = loadKnowledgeBase();
  
  const passingScore = knowledgeBase.interviewSettings.passingScore;
  const overallFeedback = await generateOverallFeedback(results, passingScore);
  
  // Update knowledge base with new user responses and feedback
  // This could be enhanced to add new expected points based on good responses
  results.forEach(result => {
    if (result.score > 0.8) {
      // For excellent responses, see if there are new points to add
      const question = knowledgeBase.topics[topic].questions.find(q => q.id === result.questionId);
      if (question) {
        // This is a simplified approach - in production, you might want a more sophisticated update mechanism
        // For example, using NLP to extract key points from the response
        result.coveredPoints.forEach(point => {
          if (!question.expectedPoints.includes(point)) {
            question.expectedPoints.push(point);
          }
        });
      }
    }
  });
  
  // Save the updated knowledge base
  saveKnowledgeBase(knowledgeBase);
  
  res.json(overallFeedback);
});

// API endpoint to update the knowledge base
app.post('/api/knowledgeBase/update', (req, res) => {
  const { topic, question, points } = req.body;
  const knowledgeBase = loadKnowledgeBase();
  
  if (!knowledgeBase.topics[topic]) {
    knowledgeBase.topics[topic] = {
      name: topic,
      questions: []
    };
  }
  
  // Find existing question or create new one
  let questionObj = knowledgeBase.topics[topic].questions.find(q => q.question === question);
  if (!questionObj) {
    questionObj = {
      id: `q${Date.now()}`,
      question,
      expectedPoints: [],
      difficulty: "medium"
    };
    knowledgeBase.topics[topic].questions.push(questionObj);
  }
  
  // Add new points
  points.forEach(point => {
    if (!questionObj.expectedPoints.includes(point)) {
      questionObj.expectedPoints.push(point);
    }
  });
  
  // Save updated knowledge base
  if (saveKnowledgeBase(knowledgeBase)) {
    res.json({ success: true, message: "Knowledge base updated" });
  } else {
    res.status(500).json({ error: "Failed to update knowledge base" });
  }
});

// 5. VOICE PROCESSING API ENDPOINTS
// -------------------------------
// API endpoint for speech-to-text
app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    // For browser-based recording, audioData should be base64 encoded
    // We need to decode it and save it temporarily
    const buffer = Buffer.from(audioData.split(',')[1], 'base64');
    const tempFilePath = path.join(__dirname, `temp_${Date.now()}.webm`);
    
    fs.writeFileSync(tempFilePath, buffer);
    
    // Use OpenAI's Whisper API to transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1"
    });
    
    // Delete the temporary file
    fs.unlinkSync(tempFilePath);
    
    res.json({ text: transcription.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Interview Bot server running on port ${PORT}`);
});




