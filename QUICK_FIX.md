# Quick Checklist: Fix AI Questions Not Loading

## ✓ Complete These Steps in Order

### Step 1: Verify Backend .env File
- [ ] File exists: `backend/.env`
- [ ] Contains: `OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY`
- [ ] Contains: `PORT=5000`
- [ ] Contains: `NODE_ENV=development`

**If .env missing:**
```bash
cd backend
cat > .env << EOF
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
EOF
```

---

### Step 2: Restart Backend Server
- [ ] Kill any running backend (Ctrl+C)
- [ ] Terminal 1:
  ```bash
  cd backend
  npm start
  ```
- [ ] Wait for output: `Server running on port 5000`

---

### Step 3: Test Health Endpoint
- [ ] Terminal 2 (new terminal):
  ```bash
  curl http://localhost:5000/api/health
  ```
- [ ] Should return JSON with `"configured": true`
- [ ] If false, API key not set in .env

---

### Step 4: Clear Frontend Cache
- [ ] Open browser DevTools (F12)
- [ ] Press Ctrl+Shift+Delete OR:
  - Settings → Privacy and security → Clear browsing data
  - Select "Cookies and cached images"
  - Click "Clear data"

---

### Step 5: Refresh Frontend
- [ ] Refresh page (Ctrl+R or F5)
- [ ] Or restart frontend:
  ```bash
  cd client
  npm start
  ```

---

### Step 6: Run Interview and Monitor Logs

#### Browser Console (F12):
- [ ] Open DevTools (F12)
- [ ] Go to "Console" tab
- [ ] Fill interview form
- [ ] Click "Start Interview"
- [ ] Look for logs:
  ```
  Fetching AI questions for: {...}
  API Response Status: 200
  Successfully loaded 12 AI questions
  ```

#### Backend Terminal:
- [ ] Look at terminal running npm start
- [ ] Should see:
  ```
  === GENERATING QUESTIONS ===
  Request received: {...}
  OpenAI API Key configured: true
  Successfully parsed 13 questions from OpenAI
  === QUESTIONS GENERATED SUCCESSFULLY ===
  ```

---

### Step 7: Verify Questions Are Dynamic
- [ ] Questions should be diverse (Objective, Logical, Theory, Coding types)
- [ ] Questions should be specific to selected technology
- [ ] NOT the default fallback questions

---

## ✗ Troubleshooting If Still Not Working

### Symptom: "Falling back to default questions"
→ **Check Backend Console For Error**
- Look for line starting with `Error type:`
- Common errors:
  - `AuthenticationError` → Invalid API key
  - `RateLimitError` → API rate limit exceeded
  - `NetworkError` → Network issue

### Symptom: "Can't connect to http://localhost:5000"
→ **Backend Not Running**
```bash
ps aux | grep "npm start"
# If not found, start: cd backend && npm start
```

### Symptom: API returns 500 error
→ **Backend Error**
- Check backend terminal for error message
- See `TROUBLESHOOTING.md` for solutions

### Symptom: No logs appear
→ **Frontend Not Connecting**
- Verify backend is on port 5000
- Check browser console for network errors (F12 → Network tab)
- Try testing endpoint: `curl http://localhost:5000/api/health`

---

## 🚀 Success Indicators

- [ ] Browser console shows "Successfully loaded X AI questions"
- [ ] Backend console shows "QUESTIONS GENERATED SUCCESSFULLY"
- [ ] Interview questions are 12-15 diverse types
- [ ] Questions match selected technology
- [ ] Color badges show: Blue (Objective), Purple (Logical), Green (Theory), Orange (Coding)
- [ ] For Coding questions: Code snippets display in dark background

---

## 📋 If You Need Help

### Provide This Information:
1. **Backend Console Output**: Copy-paste the entire generation log
2. **Browser Console Output**: Screenshot F12 console
3. **Health Check Result**: Output of `curl http://localhost:5000/api/health`
4. **Error Message**: Exact error text if visible

### Files to Check:
- `backend/.env` - Does it exist? Is API key there?
- `backend/server.js` - Line 183+ for generate-questions endpoint
- `client/src/InterviewAgent.jsx` - Line 20+ for fetchAIQuestions function

---

## 📊 Current System Status

### Files with Enhanced Debugging:
- ✅ `client/src/InterviewAgent.jsx` - Frontend logging added
- ✅ `backend/server.js` - Backend logging + health endpoint added
- ✅ `backend/.env` - Should exist with API key

### Documentation Created:
- ✅ `TROUBLESHOOTING.md` - Complete debugging guide
- ✅ `DEBUG_ENHANCEMENTS.md` - What was fixed
- ✅ `diagnose.sh` - Automated diagnostics

### Testing Tools Available:
```bash
# Health check
curl http://localhost:5000/api/health

# Direct API test
curl -X POST http://localhost:5000/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "technology": "swift",
    "yearsOfExperience": 5,
    "roleLevel": "proficient",
    "candidateName": "Test"
  }'

# Run diagnostics
bash diagnose.sh
```

---

## ⏱️ Estimated Time to Fix
- Checking .env file: 1 minute
- Restarting backend: 1 minute
- Testing endpoints: 2 minutes
- Total: ~5 minutes

**You should have AI questions working within 5 minutes following this checklist!**

---

Last Updated: January 22, 2026
Status: Ready for Implementation
