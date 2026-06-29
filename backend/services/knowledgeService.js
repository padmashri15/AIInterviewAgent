// backend/services/knowledgeService.js
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class KnowledgeService {
  constructor() {
    this.knowledgeBasePath = path.join(__dirname, '../data/knowledgeBase.json');
    this.feedbackHistoryPath = path.join(__dirname, '../data/feedbackHistory.json');
    this.knowledgeBase = this.loadKnowledgeBase();
    this.feedbackHistory = this.loadFeedbackHistory();
  }
  
  /**
   * Load the knowledge base from file
   */
  loadKnowledgeBase() {
    try {
      if (fs.existsSync(this.knowledgeBasePath)) {
        const data = fs.readFileSync(this.knowledgeBasePath, 'utf8');
        return JSON.parse(data);
      } else {
        // Create a default knowledge base if none exists
        const defaultKnowledgeBase = {
          topics: [
            {
              name: "Machine Learning",
              questions: [
                {
                  id: "ml-001",
                  text: "Tell me about your experience with machine learning frameworks.",
                  keyPoints: ["TensorFlow", "PyTorch", "scikit-learn", "practical projects", "model development"]
                },
                {
                  id: "ml-002",
                  text: "Explain the difference between supervised and unsupervised learning.",
                  keyPoints: ["labeled data", "unlabeled data", "classification", "regression", "clustering"]
                },
                {
                  id: "ml-003",
                  text: "How would you handle overfitting in a neural network?",
                  keyPoints: ["regularization", "dropout", "early stopping", "data augmentation", "cross-validation"]
                }
              ]
            },
            {
              name: "Data Science",
              questions: [
                {
                  id: "ds-001",
                  text: "Describe your experience with data cleaning and preprocessing.",
                  keyPoints: ["missing values", "outliers", "normalization", "feature engineering", "data quality"]
                },
                {
                  id: "ds-002",
                  text: "What visualization tools do you prefer and why?",
                  keyPoints: ["Matplotlib", "Seaborn", "Plotly", "Tableau", "data insights"]
                }
              ]
            }
          ]
        };
        
        this.saveKnowledgeBase(defaultKnowledgeBase);
        return defaultKnowledgeBase;
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      return { topics: [] };
    }
  }
  
  /**
   * Load feedback history from file
   */
  loadFeedbackHistory() {
    try {
      if (fs.existsSync(this.feedbackHistoryPath)) {
        const data = fs.readFileSync(this.feedbackHistoryPath, 'utf8');
        return JSON.parse(data);
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error loading feedback history:', error);
      return [];
    }
  }
  
  /**
   * Save knowledge base to file
   */
  saveKnowledgeBase(data = null) {
    try {
      const dirPath = path.dirname(this.knowledgeBasePath);
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(
        this.knowledgeBasePath, 
        JSON.stringify(data || this.knowledgeBase, null, 2)
      );
    } catch (error) {
      console.error('Error saving knowledge base:', error);
    }
  }
  
  /**
   * Save feedback history to file
   */
  saveFeedbackHistory() {
    try {
      const dirPath = path.dirname(this.feedbackHistoryPath);
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(
        this.feedbackHistoryPath, 
        JSON.stringify(this.feedbackHistory, null, 2)
      );
    } catch (error) {
      console.error('Error saving feedback history:', error);
    }
  }
  
  /**
   * Get all topics
   */
  getTopics() {
    return this.knowledgeBase.topics.map(topic => ({
      name: topic.name,
      questionCount: topic.questions.length
    }));
  }
  
  /**
   * Get a specific topic with all questions
   */
  getTopic(topicName) {
    return this.knowledgeBase.topics.find(t => t.name === topicName);
  }
  
  /**
   * Add a new topic
   */
  addTopic(topicName) {
    if (!this.knowledgeBase.topics.some(t => t.name === topicName)) {
      this.knowledgeBase.topics.push({
        name: topicName,
        questions: []
      });
      
      this.saveKnowledgeBase();
      return true;
    }
    return false;
  }
  
  /**
   * Find a question by ID
   */
  findQuestion(questionId) {
    for (const topic of this.knowledgeBase.topics) {
      const question = topic.questions.find(q => q.id === questionId);
      if (question) {
        return { topic, question };
      }
    }
    return null;
  }
  
  /**
   * Add a question to a topic
   */
  addQuestion(topicName, questionText, keyPoints) {
    const topic = this.knowledgeBase.topics.find(t => t.name === topicName);
    
    if (topic) {
      // Generate ID based on topic name and question count
      const prefix = topicName.toLowerCase().substring(0, 2);
      const id = `${prefix}-${String(topic.questions.length + 1).padStart(3, '0')}`;
      
      topic.questions.push({
        id,
        text: questionText,
        keyPoints: keyPoints || []
      });
      
      this.saveKnowledgeBase();
      return id;
    }
    
    return null;
  }
  
  /**
   * Update a question
   */
  updateQuestion(questionId, updatedText, updatedKeyPoints) {
    const found = this.findQuestion(questionId);
    
    if (found) {
      if (updatedText) {
        found.question.text = updatedText;
      }
      
      if (updatedKeyPoints) {
        found.question.keyPoints = updatedKeyPoints;
      }
      
      this.saveKnowledgeBase();
      return true;
    }
    
    return false;
  }
  
  /**
   * Record feedback for a response
   */
  addFeedback(questionId, answer, evaluation) {
    const found = this.findQuestion(questionId);
    
    if (!found) {
      return false;
    }
    
    // Add to feedback history
    this.feedbackHistory.push({
      timestamp: new Date().toISOString(),
      questionId,
      topic: found.topic.name,
      question: found.question.text,
      answer,
      evaluation
    });
    
    this.saveFeedbackHistory();
    return true;
  }
  
  /**
   * Get random questions for an interview
   */
  getInterviewQuestions(topicName, count = 3) {
    const topic = this.knowledgeBase.topics.find(t => t.name === topicName);
    
    if (!topic || topic.questions.length === 0) {
      return [];
    }
    
    // Get random questions
    const shuffled = [...topic.questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
  
  /**
   * Analyze feedback and update knowledge base
   */
  async analyzeAndImprove() {
    try {
      // Only analyze if we have enough feedback
      if (this.feedbackHistory.length < 5) {
        return { 
          updated: false, 
          message: 'Not enough feedback data for analysis' 
        };
      }
      
      // Get recent feedback (last 20 entries)
      const recentFeedback = this.feedbackHistory.slice(-20);
      
      // Use AI to analyze feedback and suggest improvements
      const prompt = `
        You are an AI expert helping to improve an interview system.
        
        Analyze these recent interview responses and evaluations:
        ${JSON.stringify(recentFeedback)}
        
        Based on patterns in candidate responses:
        1. Suggest 1-2 new questions we should add to the knowledge base
        2. Suggest key points that should be added to existing questions based on frequent topics in answers
        3. Identify any questions that might need rewording or clarification
        
        Format your response as JSON:
        {
          "newQuestions": [
            {
              "topic": "string - existing topic name",
              "text": "string - question text",
              "keyPoints": ["array", "of", "key", "points"]
            }
          ],
          "updatedKeyPoints": [
            {
              "questionId": "string - existing question ID",
              "additionalKeyPoints": ["array", "of", "key", "points"]
            }
          ],
          "rewordedQuestions": [
            {
              "questionId": "string - existing question ID",
              "suggestedText": "string - improved question text",
              "reason": "string - why it should be reworded"
            }
          ]
        }
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an AI expert in interview question design and evaluation." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response
      const analysis = JSON.parse(completion.choices[0].message.content);
      
      // Apply the suggestions
      const updates = {
        addedQuestions: [],
        updatedKeyPoints: [],
        rewordedQuestions: []
      };
      
      // Add new questions
      if (analysis.newQuestions && analysis.newQuestions.length > 0) {
        for (const newQ of analysis.newQuestions) {
          const questionId = this.addQuestion(newQ.topic, newQ.text, newQ.keyPoints);
          if (questionId) {
            updates.addedQuestions.push({
              id: questionId,
              topic: newQ.topic,
              text: newQ.text
            });
          }
        }
      }
      
      // Update key points
      if (analysis.updatedKeyPoints && analysis.updatedKeyPoints.length > 0) {
        for (const update of analysis.updatedKeyPoints) {
          const found = this.findQuestion(update.questionId);
          if (found) {
            // Add new key points, avoiding duplicates
            const updatedPoints = [...found.question.keyPoints];
            for (const point of update.additionalKeyPoints) {
              if (!updatedPoints.includes(point)) {
                updatedPoints.push(point);
              }
            }
            
            this.updateQuestion(update.questionId, null, updatedPoints);
            updates.updatedKeyPoints.push({
              id: update.questionId,
              newPoints: update.additionalKeyPoints
            });
          }
        }
      }
      
      // Reword questions
      if (analysis.rewordedQuestions && analysis.rewordedQuestions.length > 0) {
        for (const reword of analysis.rewordedQuestions) {
          const found = this.findQuestion(reword.questionId);
          if (found) {
            const oldText = found.question.text;
            this.updateQuestion(reword.questionId, reword.suggestedText, null);
            updates.rewordedQuestions.push({
              id: reword.questionId,
              oldText,
              newText: reword.suggestedText,
              reason: reword.reason
            });
          }
        }
      }
      
      // Save changes
      this.saveKnowledgeBase();
      
      return {
        updated: true,
        updates
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      return {
        updated: false,
        error: error.message
      };
    }
  }
}

module.exports = new KnowledgeService();
