// client/src/services/apiService.js
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const API_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Get all available interview topics
  async getTopics() {
    try {
      const response = await this.client.get('/api/topics');
      return response.data.topics;
    } catch (error) {
      console.error('Error fetching topics:', error);
      throw error;
    }
  }

  // Start a new interview session
  async startInterview(topicName) {
    try {
      const response = await this.client.post('/api/interview/start', { topicName });
      return response.data;
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  }

  // Get the next question
  async getNextQuestion(sessionId, index) {
    try {
      const response = await this.client.get(`/api/interview/${sessionId}/question/${index}`);
      return response.data.question;
    } catch (error) {
      console.error('Error fetching question:', error);
      throw error;
    }
  }

  // Submit answer for evaluation
  async evaluateAnswer(questionId, answer) {
    try {
      const response = await this.client.post('/api/interview/evaluate', {
        questionId,
        answer
      });
      return response.data;
    } catch (error) {
      console.error('Error evaluating answer:', error);
      throw error;
    }
  }

  // Submit audio for transcription
  async transcribeAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await this.client.post('/api/interview/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  // Complete the interview and get final evaluation
  async completeInterview(sessionId, answers) {
    try {
      const response = await this.client.post('/api/interview/complete', {
        sessionId,
        answers
      });
      return response.data;
    } catch (error) {
      console.error('Error completing interview:', error);
      throw error;
    }
  }

  // Request knowledge base update
  async updateKnowledgeBase() {
    try {
      const response = await this.client.post('/api/knowledge/update');
      return response.data;
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      throw error;
    }
  }
}

export default new ApiService();
