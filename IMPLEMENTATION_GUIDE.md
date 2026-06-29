# AI Interview Agent - Dynamic Questions Implementation

## Overview
The interview system now generates 12-15 diverse, AI-powered questions dynamically based on candidate profile (technology, experience level, role). Questions include 4 different types: Objective, Logical, Theory, and Coding snippets.

## Key Features Implemented

### 1. **Diverse Question Types**
- **Objective Type**: Multiple-choice and factual knowledge questions
- **Logical Questions**: Problem-solving and conceptual thinking questions
- **Theory Questions**: In-depth theoretical knowledge and best practices
- **Coding Snippets**: Code with intentional bugs to identify and fix

### 2. **AI-Powered Generation (OpenAI GPT-4)**
- Backend endpoint: `POST /api/generate-questions`
- Generates 12-15 questions per interview session
- Adapts difficulty based on:
  - Technology stack (Swift, Kotlin, React Native, Flutter, etc.)
  - Years of experience (0-15+)
  - Role level (novice, adv-beginner, proficient, expert)
  - Candidate name

### 3. **Configurable Prompts**
- Support for custom prompts in the request body
- Allows for future customization of question generation logic
- Default prompt structure includes specific question type requirements

### 4. **Enhanced UI for Question Types**
- Color-coded badges for each question type
- Special rendering for coding snippets with syntax highlighting
- Display question context/code in formatted code blocks
- Type indicators: Blue (Objective), Purple (Logical), Green (Theory), Orange (Coding)

## Backend Changes (server.js)

### New Endpoint
```
POST /api/generate-questions
```

### Request Body
```json
{
  "technology": "swift",
  "yearsOfExperience": "5",
  "roleLevel": "proficient",
  "candidateName": "John Doe",
  "customPrompt": "" // Optional: Custom prompt for question generation
}
```

### Response Format
```json
{
  "questions": [
    {
      "id": 1,
      "type": "objective",
      "question": "What is the difference between a struct and a class in Swift?",
      "context": null
    },
    {
      "id": 2,
      "type": "coding",
      "question": "What is wrong with this code? Identify and fix the bug.",
      "context": "// Code snippet here..."
    }
  ]
}
```

### Question Types
- `objective`: Factual/multiple-choice questions
- `logical`: Problem-solving and reasoning questions
- `theory`: Deep conceptual knowledge questions
- `coding`: Code snippets with bugs to identify

### Fallback Mechanism
- If OpenAI API fails, uses pre-configured default questions
- Default questions are technology-specific and follow the same structure
- Ensures interview continuity even without API access

## Frontend Changes (InterviewAgent.jsx)

### State Management
- `questions`: Array of question objects with type and context
- `isLoadingQuestions`: Loading state while generating questions
- Question objects now include: id, type, question text, and context (for coding)

### UI Updates
1. **Question Type Badge**
   - Displays question type with color coding
   - Easy visual identification of question category

2. **Code Block Rendering**
   - Syntax-highlighted code display for coding questions
   - Formatted with line breaks and proper spacing
   - Dark background for better readability

3. **Question Navigation**
   - Progress tracking shows all questions
   - Question type visible in progress sidebar
   - Smooth transitions between question types

## Environment Configuration

### Create `.env` file in `/backend` directory:
```
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
```

### Required NPM Package
Already installed: `dotenv`

## Technology-Specific Questions

Each technology has 8-12 pre-configured fallback questions covering:

### Swift
- Struct vs Class differences
- Value types and reference types
- Memory management and ARC
- Protocol usage
- Coding snippets with memory leaks

### Kotlin
- Open keyword and inheritance
- Null safety implementation
- Scope functions usage
- Coroutines and threading
- Coding snippets with null safety issues

### React Native
- Props vs State
- FlatList usage
- Performance optimization
- Navigation patterns
- Coding snippets with hooks and memory leaks

### Flutter
- Widget tree concepts
- StatelessWidget vs StatefulWidget
- Widget lifecycle
- State management
- Coding snippets with lifecycle issues

## AI Question Generation Flow

1. Candidate fills interview form (technology, years, role, name)
2. User clicks "Start Interview"
3. `fetchAIQuestions()` is called
4. Backend sends request to OpenAI GPT-4 with:
   - Base prompt template (customizable)
   - Candidate profile details
   - Question type requirements
5. OpenAI generates JSON response with 12-15 questions
6. Questions are validated and normalized
7. Frontend displays loading spinner while generating
8. Questions are displayed one by one
9. If API fails, fallback to pre-configured questions

## Future Enhancements

1. **Custom Prompt Editor**
   - UI to create/edit question generation prompts
   - Save custom prompts for reuse
   - Preview generated questions before interview starts

2. **Question Difficulty Adjustment**
   - Dynamic difficulty based on candidate performance
   - Adaptive questioning based on answers

3. **Question History**
   - Save previously generated questions
   - Analytics on question performance
   - Question retirement/updates

4. **Database Storage**
   - Store questions for analytics
   - Track commonly missed questions
   - Performance metrics by question type

## Testing the Implementation

### Step 1: Start Backend Server
```bash
cd backend
npm install
npm start
```

### Step 2: Start Frontend Dev Server
```bash
cd client
npm install
npm start
```

### Step 3: Test Interview Flow
1. Navigate to http://localhost:3000
2. Fill in candidate details
3. Select technology (Swift, Kotlin, React Native, or Flutter)
4. Select role level and years of experience
5. Click "Start Interview"
6. Observe 12-15 diverse questions with different types
7. Answer questions with text or voice
8. Review feedback after each question

## Troubleshooting

### Issue: Questions not loading
- **Check**: OpenAI API key is correct in `.env`
- **Check**: Backend server is running on port 5000
- **Check**: CORS is enabled in Express
- **Fallback**: System will use pre-configured questions

### Issue: Coding snippets not displaying
- **Check**: `context` field is properly populated
- **Check**: Code is between // CODE_START and // CODE_END markers
- **Check**: Browser console for parsing errors

### Issue: Question types not showing
- **Check**: Question objects have `type` field
- **Check**: Type values are: objective, logical, theory, or coding
- **Check**: Badge CSS classes are applied correctly

## API Documentation

### Generate Questions Endpoint

**URL**: `/api/generate-questions`
**Method**: `POST`
**Content-Type**: `application/json`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| technology | string | Yes | Technology stack (swift, kotlin, react-native, flutter) |
| yearsOfExperience | number | Yes | Candidate's experience in years |
| roleLevel | string | Yes | Role level (novice, adv-beginner, proficient, expert) |
| candidateName | string | Yes | Candidate's full name |
| customPrompt | string | No | Custom prompt for question generation |

**Response**:
```json
{
  "questions": [
    {
      "id": number,
      "type": string (objective|logical|theory|coding),
      "question": string,
      "context": string | null
    }
  ]
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:5000/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "technology": "swift",
    "yearsOfExperience": 5,
    "roleLevel": "proficient",
    "candidateName": "John Doe"
  }'
```
