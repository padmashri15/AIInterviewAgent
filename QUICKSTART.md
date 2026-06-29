# Quick Start Guide - AI Interview Agent

## Setup (First Time)

### 1. Create .env file in backend folder
```bash
cd backend
# Create .env file with:
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd client
npm install
```

### 3. Start Both Servers
```bash
# Terminal 1 - Backend
cd backend
npm start
# Should show: Server running on port 5000

# Terminal 2 - Frontend  
cd client
npm start
# Should open http://localhost:3000
```

## Running an Interview

### Step-by-Step:

1. **Fill Candidate Form**
   - Candidate Name: Enter full name
   - Technology: Select from (Swift, Kotlin, React Native, Flutter)
   - Years of Experience: Enter number (0-20)
   - Role Level: Select (Novice, Advanced Beginner, Proficient, Expert)
   - Interview Date: Pick a date
   - Interview Time: Pick a time

2. **Click "Start Interview"**
   - System will generate 12-15 questions from OpenAI GPT-4
   - Shows loading spinner while generating
   - Falls back to default questions if API fails

3. **Answer Questions**
   - Question type shown as colored badge (Objective, Logical, Theory, Coding)
   - For coding questions: view code snippet and find the bug
   - Choose: Voice response OR Text response
   - Voice: Max 5 seconds automatically recorded
   - Text: Type your answer manually

4. **Submit Response**
   - Click "Submit Response" button
   - Get instant AI feedback
   - See score (0-100) and strengths/areas to improve
   - Click "Next Question" to continue

5. **Complete Interview**
   - After all questions answered
   - Final results screen shows:
     - Overall score
     - Pass/Fail status
     - Key strengths
     - Growth areas
   - Click "Start New Interview" to begin again

## Question Types Explained

### 🔵 Objective Type
- Short questions testing factual knowledge
- Practical API and framework knowledge
- Direct questions with clear answers

### 🟣 Logical Questions
- Problem-solving scenarios
- Real-world use cases
- Require thinking and explanation

### 🟢 Theory Questions
- Deep conceptual understanding
- Best practices and patterns
- Why things work the way they do

### 🟠 Coding Questions
- Code snippets with intentional bugs
- Identify what's wrong
- Explain how to fix it
- Discuss why the fix works

## What Happens Behind the Scenes

### Question Generation Flow
```
User Form Data
    ↓
Backend /api/generate-questions endpoint
    ↓
OpenAI GPT-4 API (12-15 question request)
    ↓
Parse & Validate Response
    ↓
Send to Frontend
    ↓
Display Questions in Interview
```

### If OpenAI API Fails
→ Automatically uses pre-configured questions for that technology
→ Same structure: 12-15 questions with 4 types
→ No interview interruption

## Features

✅ **Dynamic Question Generation** - Unique questions every interview
✅ **AI-Powered** - Uses GPT-4 for intelligent question creation
✅ **Technology-Specific** - Questions tailored to chosen tech stack
✅ **Experience-Aware** - Difficulty matches candidate level
✅ **Diverse Types** - Objective, Logical, Theory, Coding questions
✅ **Voice & Text** - Both input methods supported
✅ **Instant Feedback** - AI-powered evaluation after each question
✅ **Progress Tracking** - See interview progress at a glance
✅ **Fallback Support** - Default questions if API unavailable
✅ **Customizable** - API accepts custom prompts (future)

## Supported Technologies

| Tech | Level 1 | Level 2 | Level 3 | Level 4 |
|------|---------|---------|---------|---------|
| **Swift** | Novice | Adv Beginner | Proficient | Expert |
| **Kotlin** | Novice | Adv Beginner | Proficient | Expert |
| **React Native** | Novice | Adv Beginner | Proficient | Expert |
| **Flutter** | Novice | Adv Beginner | Proficient | Expert |

Each combination generates unique questions adjusted for that level.

## Troubleshooting

### Issue: "Compiled with problems" error
**Solution**: 
- Check backend .env file exists
- Verify OPENAI_API_KEY is set correctly
- Backend must be running on port 5000

### Issue: Questions not loading
**Solution**:
- Check browser console for errors
- Verify backend server is running
- Check OpenAI API key is valid
- System will use fallback questions

### Issue: Voice recording not working
**Solution**:
- Check browser microphone permissions
- Try text response instead
- Check browser console for errors

### Issue: Coding snippets showing incorrectly
**Solution**:
- Refresh the page
- Check browser console
- Try another question type first

## API Details

### POST /api/generate-questions

**Request:**
```json
{
  "technology": "swift",
  "yearsOfExperience": 5,
  "roleLevel": "proficient",
  "candidateName": "John Doe"
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "type": "objective",
      "question": "What is the difference between a struct and a class?",
      "context": null
    },
    {
      "id": 5,
      "type": "coding",
      "question": "Find the bug in this code.",
      "context": "// CODE_START\n...\n// CODE_END"
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 400: Bad request
- 500: Server error (fallback to defaults)

## Performance Tips

1. **Chrome/Edge**: Best performance (latest WebGL support)
2. **Mobile**: Responsive design but use desktop for coding questions
3. **Network**: Stable connection for OpenAI API calls
4. **Microphone**: Test before interview for voice questions

## Future Enhancements

📋 **Coming Soon:**
- Custom prompt editor in UI
- Question difficulty slider
- Interview history/analytics
- Save questions for review
- Real speech-to-text (currently mock)
- AI response evaluation (currently mock)

## Support

For issues or questions:
1. Check console logs (F12)
2. Review IMPLEMENTATION_GUIDE.md
3. Check EXAMPLE_QUESTIONS.md for question samples
4. Verify .env configuration

## Example Use Cases

### Interview Preparation
- Practice for job interviews
- Get feedback on technical knowledge
- Identify weak areas

### Hiring Assessment
- Screen candidates remotely
- Standardized question sets
- Objective scoring

### Skill Validation
- Verify technical skills
- Track improvement over time
- Personalized difficulty levels

### Team Training
- Internal skill assessments
- Learning path recommendations
- Performance benchmarking

---

**Version**: 1.0
**Last Updated**: January 2026
**Status**: Production Ready
