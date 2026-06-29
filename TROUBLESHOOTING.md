# Troubleshooting: Questions Still Using Defaults

## Issue: Questions coming from `getDefaultQuestions` instead of AI-generated

If you're seeing default questions instead of dynamically generated ones from OpenAI, follow this step-by-step troubleshooting guide.

---

## Step 1: Check Backend Server is Running

### Terminal Output Check:
```bash
cd backend
npm start
```

You should see:
```
Server running on port 5000
```

### Verify with Health Check:
Open a new terminal and test the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "server": "Interview Bot Backend",
  "port": 5000,
  "timestamp": "2026-01-22T...",
  "openAI": {
    "configured": true,
    "apiKeyPreview": "sk-proj-..."
  }
}
```

If `"configured": false`, the API key is not set up.

---

## Step 2: Verify `.env` File Exists

### Location:
```
backend/.env
```

### Content should have:
```
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
```

### To Create/Update `.env`:

**Option 1: Using terminal**
```bash
cd backend
cat > .env << EOF
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
EOF
```

**Option 2: Manual creation**
- Create file `backend/.env`
- Add the three lines above
- Save

---

## Step 3: Test OpenAI API Endpoint Directly

### Using cURL:

```bash
curl -X POST http://localhost:5000/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "technology": "swift",
    "yearsOfExperience": 5,
    "roleLevel": "proficient",
    "candidateName": "Test User"
  }'
```

### Using Python:
```python
import requests

response = requests.post('http://localhost:5000/api/generate-questions', json={
    'technology': 'swift',
    'yearsOfExperience': 5,
    'roleLevel': 'proficient',
    'candidateName': 'Test User'
})

print(response.json())
```

### Expected Response:
- If AI generates: Array of 12-15 question objects with proper structure
- If falling back: Default questions (still correct structure)

---

## Step 4: Check Browser Console Logs

### Open DevTools:
- Press `F12` or right-click → Inspect
- Go to Console tab
- Fill the interview form and start interview

### Look for messages:
✅ Should see:
```
Fetching AI questions for: {technology: "swift", ...}
API Response Status: 200
AI Generated Questions: [{id: 1, type: 'objective', ...}]
Successfully loaded 12+ AI questions
```

❌ If seeing:
```
API Response Status: 500
Error body: (some error message)
Falling back to default questions
```
→ Backend error occurred

❌ If seeing:
```
Error fetching AI questions: TypeError: fetch failed
```
→ Backend not running or wrong URL

---

## Step 5: Check Backend Console Logs

### Look in the terminal running backend (npm start):

✅ Success output:
```
=== GENERATING QUESTIONS ===
Request received: {technology: "swift", experience: 5, roleLevel: "proficient", ...}
OpenAI API Key configured: true
Calling OpenAI API with model: gpt-4-turbo
OpenAI Response received successfully
Response content length: 2345
Successfully parsed 13 questions from OpenAI
=== QUESTIONS GENERATED SUCCESSFULLY ===
```

❌ Error outputs:

**"OpenAI API Key configured: false"**
→ `.env` file not found or OPENAI_API_KEY not set
→ Solution: Create `.env` with correct API key

**"Error type: AuthenticationError"**
→ Invalid API key
→ Solution: Verify API key is correct in `.env`

**"Error type: RateLimitError"**
→ OpenAI API rate limit exceeded
→ Solution: Wait a few minutes and try again

**"Failed to parse AI response as JSON"**
→ OpenAI response format incorrect
→ Solution: System will use defaults (this is fine)

---

## Step 6: Verify API Key is Valid

### Test with OpenAI directly:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-REPLACE_WITH_YOUR_KEY"
```

Should return list of models (not 401 Unauthorized).

---

## Step 7: Full Restart Process

If nothing above works, do a complete restart:

### Terminal 1 - Backend:
```bash
cd backend
# Kill any running process (Ctrl+C)
# Delete node_modules and package-lock.json (optional)
rm -rf node_modules package-lock.json
npm install
npm start
# Wait for "Server running on port 5000"
```

### Terminal 2 - Frontend:
```bash
cd client
# Kill any running process (Ctrl+C)
npm start
# Wait for browser to open at http://localhost:3000
```

### Browser:
- Clear cache: Ctrl+Shift+Delete
- Refresh page: Ctrl+R or F5
- Fill form and start interview

---

## Step 8: Enable Detailed Logging

### Modify client/src/InterviewAgent.jsx:

Around line 20-23, the logging is already enhanced. Check that logs show:
```javascript
console.log('Fetching AI questions for:', {...});
console.log('API Response Status:', response.status);
console.log('AI Generated Questions:', result);
```

This will help identify exactly where the problem is.

---

## Debugging Checklist

- [ ] `.env` file exists in `backend/` directory
- [ ] `OPENAI_API_KEY` is set in `.env`
- [ ] Backend server running (`npm start` in backend folder)
- [ ] Backend running on port 5000 (check terminal output)
- [ ] `/api/health` endpoint returns `"configured": true`
- [ ] No network errors in browser console (F12)
- [ ] API endpoint `/api/generate-questions` returns questions (not error)
- [ ] Browser console shows "Successfully loaded X AI questions"
- [ ] Interview loads with 12+ questions of different types

---

## Common Solutions

| Problem | Solution |
|---------|----------|
| 404 Backend Error | Backend not running or wrong port |
| 500 Backend Error | Check backend logs for actual error |
| OpenAI Auth Error | API key invalid or expired |
| Rate Limited | Wait a few minutes, try again |
| CORS Error | CORS middleware not enabled (should be in code) |
| Questions not loading | Clear cache (Ctrl+Shift+Del), refresh page |
| Wrong questions | Check that response has `type` field |

---

## If All Else Fails: Use Defaults

The system is designed so that if OpenAI API fails for ANY reason:
1. **No interview is broken** - You still get questions
2. **Technology-specific defaults** - Questions match the selected tech
3. **Same structure** - Default questions have the same format as AI ones
4. **Logging enabled** - Shows exactly what went wrong

The default questions in the code are professionally designed and work perfectly fine while you debug the API issue.

---

## Still Not Working?

1. **Check exact error message** in backend terminal
2. **Verify OpenAI API key** is correct (copy-paste directly, no typos)
3. **Ensure PORT 5000 is not in use**: `lsof -i :5000`
4. **Check Node.js version**: `node --version` (should be v14+)
5. **Reinstall dependencies**: `rm -rf node_modules && npm install`
6. **Test API directly** with cURL command above

---

**Status**: System working correctly with enhanced logging  
**Last Updated**: January 22, 2026
