// backend/services/evaluationService.js
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class EvaluationService {
  /**
   * Evaluate a candidate's response to a single question
   * @param {Object} question - The interview question
   * @param {String} answer - The candidate's answer
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateResponse(question, answer) {
    try {
      const prompt = `
        You are an expert interviewer evaluating a candidate's response.
        
        Question: "${question.text}"
        
        Key points to look for: ${question.keyPoints.join(', ')}
        
        Candidate's answer: "${answer}"
        
        Evaluate the answer on a scale of 0-100 based on:
        1. Accuracy and correctness (40%)
        2. Completeness (covering the key points) (30%)
        3. Clarity and communication (20%)
        4. Practical examples provided (10%)
        
        Provide:
        1. Numerical score (0-100)
        2. Brief feedback (2-3 sentences)
        3. List of 2-3 strengths
        4. List of 1-2 areas to improve
        
        Format your response as JSON:
        {
          "score": [number],
          "feedback": [string],
          "strengths": [array of strings],
          "areasToImprove": [array of strings]
        }
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert interview evaluator focused on providing constructive feedback." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error evaluating response:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate the entire interview and make a final decision
   * @param {Array} responses - Array of all responses with evaluations
   * @returns {Promise<Object>} Final evaluation results
   */
  async evaluateInterview(responses) {
    try {
      const prompt = `
        You are an expert interviewer making a final hiring decision based on a candidate's interview performance.
        
        Here are the candidate's responses and evaluations throughout the interview:
        ${responses.map(r => {
          return `
            Question: "${r.question}"
            Answer: "${r.answer}"
            Score: ${r.evaluation.score}
            Individual Feedback: "${r.evaluation.feedback}"
          `;
        }).join('\n\n')}
        
        Based on the overall performance, make a hiring decision with the following information:
        1. Overall score (0-100)
        2. Decision (pass/fail)
        3. Brief feedback explaining the decision (2-3 sentences)
        4. Overall strengths demonstrated in the interview (2-3 points)
        5. Overall areas for improvement (1-2 points)
        
        For the decision:
        - A score of 75 or higher is a pass
        - A score below 75 is a fail
        
        Format your response as JSON:
        {
          "overallScore": [number],
          "decision": ["pass" or "fail"],
          "feedback": [string],
          "strengths": [array of strings],
          "areasToImprove": [array of strings]
        }
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert interview evaluator making final hiring decisions." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error evaluating interview:', error);
      throw error;
    }
  }
  
  /**
   * Generate detailed feedback with examples to help candidates improve
   * @param {Object} response - Candidate's response
   * @param {Object} evaluation - Initial evaluation
   * @returns {Promise<Object>} Detailed feedback
   */
  async generateDetailedFeedback(response, evaluation) {
    try {
      const prompt = `
        You're a helpful AI interview coach providing detailed feedback to help a candidate improve.
        
        The candidate was asked: "${response.question}"
        
        Their answer was: "${response.answer}"
        
        Initial evaluation:
        Score: ${evaluation.score}/100
        Feedback: ${evaluation.feedback}
        Strengths: ${evaluation.strengths.join(', ')}
        Areas to improve: ${evaluation.areasToImprove.join(', ')}
        
        Provide detailed, constructive feedback including:
        1. A more comprehensive analysis of their answer
        2. Specific examples of better answers or formulations
        3. Practical tips for improvement
        4. Learning resources they might consider
        
        Format your response as JSON:
        {
          "detailedAnalysis": [string - 3-4 sentences],
          "improvedExample": [string - example of a better answer],
          "practicalTips": [array of 2-3 specific action points],
          "learningResources": [array of 2 resources like books or courses]
        }
      `;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert interview coach helping candidates improve their interview performance." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating detailed feedback:', error);
      throw error;
    }
  }
}

module.exports = new EvaluationService();
