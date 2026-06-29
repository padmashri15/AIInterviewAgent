// client/src/contexts/InterviewContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiService from '../services/apiService';
import voiceService from '../services/voiceService';

// Initial state
const initialState = {
  isInterviewActive: false,
  currentQuestion: null,
  currentResponse: '',
  feedback: null,
  isRecording: false,
  interviewProgress: 0,
  totalQuestions: 0,
  sessionId: null,
  topic: null,
  history: [],
  isLoading: false,
  error: null,
  interviewResult: null,
  interviewComplete: false
};

// Action types
const actions = {
  START_INTERVIEW: 'START_INTERVIEW',
  SET_QUESTION: 'SET_QUESTION',
  SET_RESPONSE: 'SET_RESPONSE',
  SET_FEEDBACK: 'SET_FEEDBACK',
  SET_RECORDING: 'SET_RECORDING',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  ADD_TO_HISTORY: 'ADD_TO_HISTORY',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  COMPLETE_INTERVIEW: 'COMPLETE_INTERVIEW',
  RESET_INTERVIEW: 'RESET_INTERVIEW'
};

// Reducer
function interviewReducer(state, action) {
  switch (action.type) {
    case actions.START_INTERVIEW:
      return {
        ...state,
        isInterviewActive: true,
        sessionId: action.payload.sessionId,
        topic: action.payload.topic,
        totalQuestions: action.payload.totalQuestions,
        interviewProgress: 0,
        history: [],
        interviewComplete: false,
        interviewResult: null
      };
    
    case actions.SET_QUESTION:
      return {
        ...state,
        currentQuestion: action.payload,
        currentResponse: '',
        feedback: null
      };
    
    case actions.SET_RESPONSE:
      return {
        ...state,
        currentResponse: action.payload
      };
    
    case actions.SET_FEEDBACK:
      return {
        ...state,
        feedback: action.payload
      };
    
    case actions.SET_RECORDING:
      return {
        ...state,
        isRecording: action.payload
      };
    
    case actions.UPDATE_PROGRESS:
      return {
        ...state,
        interviewProgress: action.payload
      };
    
    case actions.ADD_TO_HISTORY:
      return {
        ...state,
        history: [...state.history, action.payload]
      };
    
    case actions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case actions.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    
    case actions.COMPLETE_INTERVIEW:
      return {
        ...state,
        interviewComplete: true,
        interviewResult: action.payload
      };
    
    case actions.RESET_INTERVIEW:
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const InterviewContext = createContext();

// Context provider component
export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  
  // Initialize voice service
  useEffect(() => {
    async function initVoiceService() {
      try {
        await voiceService.initialize();
      } catch (error) {
        console.error('Failed to initialize voice service:', error);
        dispatch({ 
          type: actions.SET_ERROR, 
          payload: 'Voice features may not work in your browser.' 
        });
      }
    }
    
    initVoiceService();
    
    // Clean up
    return () => {
      voiceService.cleanup();
    };
  }, []);
  
  // Start a new interview
  const startInterview = async (topicName) => {
    try {
      dispatch({ type: actions.SET_LOADING, payload: true });
      
      const interviewData = await apiService.startInterview(topicName);
      
      dispatch({
        type: actions.START_INTERVIEW,
        payload: {
          sessionId: interviewData.sessionId,
          topic: interviewData.topic,
          totalQuestions: interviewData.totalQuestions
        }
      });
      
      // Set the first question
      dispatch({
        type: actions.SET_QUESTION,
        payload: interviewData.firstQuestion
      });
      
      // Speak the question
      voiceService.speak(interviewData.firstQuestion.text);
      
      dispatch({ type: actions.SET_LOADING, payload: false });
    } catch (error) {
      console.error('Error starting interview:', error);
      dispatch({ type: actions.SET_LOADING, payload: false });
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Failed to start interview. Please try again.' 
      });
    }
  };
  
  // Get the next question
  const getNextQuestion = async () => {
    try {
      dispatch({ type: actions.SET_LOADING, payload: true });
      
      const nextIndex = state.interviewProgress + 1;
      
      // Check if we've reached the end of the interview
      if (nextIndex >= state.totalQuestions) {
        await completeInterview();
        dispatch({ type: actions.SET_LOADING, payload: false });
        return;
      }
      
      const question = await apiService.getNextQuestion(
        state.sessionId, 
        nextIndex
      );
      
      dispatch({
        type: actions.SET_QUESTION,
        payload: question
      });
      
      dispatch({
        type: actions.UPDATE_PROGRESS,
        payload: nextIndex
      });
      
      // Speak the question
      voiceService.speak(question.text);
      
      dispatch({ type: actions.SET_LOADING, payload: false });
    } catch (error) {
      console.error('Error getting next question:', error);
      dispatch({ type: actions.SET_LOADING, payload: false });
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Failed to get next question. Please try again.' 
      });
    }
  };
  
  // Start/stop recording
  const toggleRecording = async () => {
    try {
      if (state.isRecording) {
        dispatch({ type: actions.SET_LOADING, payload: true });
        
        // Stop recording and get transcript
        const transcript = await voiceService.stopRecording();
        
        dispatch({
          type: actions.SET_RESPONSE,
          payload: transcript
        });
        
        dispatch({
          type: actions.SET_RECORDING,
          payload: false
        });
        
        dispatch({ type: actions.SET_LOADING, payload: false });
      } else {
        await voiceService.startRecording((interimTranscript) => {
          // Update with interim results if needed
          dispatch({
            type: actions.SET_RESPONSE,
            payload: interimTranscript
          });
        });
        
        dispatch({
          type: actions.SET_RECORDING,
          payload: true
        });
      }
    } catch (error) {
      console.error('Error with recording:', error);
      dispatch({ type: actions.SET_RECORDING, payload: false });
      dispatch({ type: actions.SET_LOADING, payload: false });
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Failed to record audio. Please check your microphone permissions.' 
      });
    }
  };
  
  // Submit answer for evaluation
  const submitAnswer = async () => {
    try {
      if (!state.currentResponse.trim()) {
        dispatch({ 
          type: actions.SET_ERROR, 
          payload: 'Please provide an answer before submitting.' 
        });
        return;
      }
      
      dispatch({ type: actions.SET_LOADING, payload: true });
      
      const evaluation = await apiService.evaluateAnswer(
        state.currentQuestion.id,
        state.currentResponse
      );
      
      dispatch({
        type: actions.SET_FEEDBACK,
        payload: evaluation
      });
      
      // Add to history
      dispatch({
        type: actions.ADD_TO_HISTORY,
        payload: {
          question: state.currentQuestion,
          response: state.currentResponse,
          evaluation: evaluation
        }
      });
      
      dispatch({ type: actions.SET_LOADING, payload: false });
    } catch (error) {
      console.error('Error evaluating answer:', error);
      dispatch({ type: actions.SET_LOADING, payload: false });
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Failed to evaluate response. Please try again.' 
      });
    }
  };
  
  // Complete the interview and get final evaluation
  const completeInterview = async () => {
    try {
      dispatch({ type: actions.SET_LOADING, payload: true });
      
      const result = await apiService.completeInterview(
        state.sessionId,
        state.history.map(item => ({
          question: item.question.text,
          answer: item.response,
          score: item.evaluation.score
        }))
      );
      
      dispatch({
        type: actions.COMPLETE_INTERVIEW,
        payload: result
      });
      
      // Update knowledge base with new insights in the background
      apiService.updateKnowledgeBase()
        .then(result => console.log('Knowledge base updated:', result))
        .catch(error => console.error('Error updating knowledge base:', error));
      
      dispatch({ type: actions.SET_LOADING, payload: false });
    } catch (error) {
      console.error('Error completing interview:', error);
      dispatch({ type: actions.SET_LOADING, payload: false });
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Failed to complete interview. Please try again.' 
      });
    }
  };
  
  // Reset the interview
  const resetInterview = () => {
    voiceService.cleanup();
    dispatch({ type: actions.RESET_INTERVIEW });
  };
  
  // Update response text (for manual typing)
  const updateResponse = (text) => {
    dispatch({
      type: actions.SET_RESPONSE,
      payload: text
    });
  };
  
  // Clear error
  const clearError = () => {
    dispatch({ type: actions.SET_ERROR, payload: null });
  };
  
  // Value to provide
  const value = {
    ...state,
    startInterview,
    getNextQuestion,
    toggleRecording,
    submitAnswer,
    completeInterview,
    resetInterview,
    updateResponse,
    clearError
  };
  
  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

// Custom hook to use the interview context
export function useInterview() {
  const context = useContext(InterviewContext);
  
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  
  return context;
}
