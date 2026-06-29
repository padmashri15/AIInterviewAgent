# 5-Minute Fix: AI Questions Not Loading

## THE PROBLEM
Questions coming from fallback `getDefaultQuestions()` instead of OpenAI GPT-4

## THE SOLUTION
Follow these 5 commands exactly as shown.

---

## Terminal 1: Setup Backend .env

```bash
cd /Users/nandhakumar_r/Documents/CodeGen/InterviewBot/InterviewProcess/backend

# Create/update .env file
cat > .env << EOF
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
EOF

# Verify it was created
cat .env
```

Expected output:
```
PORT=5000
OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
NODE_ENV=development
```

---

## Terminal 1: Start Backend Server

```bash
# Still in backend folder
npm start
```

Wait for this output:
```
Server running on port 5000
```

✓ **Keep this terminal running**

---

## Terminal 2: Test Backend is Ready

Open a NEW terminal and run:

```bash
# Test health endpoint
curl http://localhost:5000/api/health
```

Should return something like:
```json
{"status":"OK","server":"Interview Bot Backend","port":5000,"openAI":{"configured":true,"apiKeyPreview":"sk-proj-..."}}
```

**KEY**: Look for `"configured":true`
- If `false` → API key not set, go back to step 1
- If `true` → Everything is good, continue

---

## Terminal 2: Start Frontend

```bash
cd /Users/nandhakumar_r/Documents/CodeGen/InterviewBot/InterviewProcess/client

npm start
```

Wait for browser to open at `http://localhost:3000`

---

## Browser: Clear Cache and Test

1. **Clear Cache:**
   - Press `Ctrl + Shift + Delete`
   - Click "Clear data"

2. **Refresh:**
   - Press `Ctrl + R`

3. **Open DevTools:**
   - Press `F12`
   - Go to "Console" tab

4. **Start Interview:**
   - Fill form with any values
   - Select Technology: Swift
   - Click "Start Interview"

5. **Watch Console for Success:**

Look for these logs appearing:
```
Fetching AI questions for: {technology: "swift", ...}
API Response Status: 200
AI Generated Questions: (13) [{…}, {…}, ...]
Successfully loaded 13 AI questions
```

---

## Verify Success

✓ Questions display in interview
✓ Questions have color badges (Blue/Purple/Green/Orange)
✓ Some questions show code snippets in dark boxes
✓ Progress shows 12-15 questions total

---

## If Still Not Working

### Check Backend Terminal (where npm start is running)

Look for either:

**SUCCESS (Good - you're done):**
```
=== GENERATING QUESTIONS ===
Request received: {technology: "swift", ...}
OpenAI API Key configured: true
Successfully parsed 13 questions from OpenAI
=== QUESTIONS GENERATED SUCCESSFULLY ===
```

**ERROR (Problem - read error message):**
```
=== ERROR GENERATING QUESTIONS ===
Error type: AuthenticationError
Error message: Incorrect API key provided
```

---

### If Error: Check .env File

Open `backend/.env` and verify:
1. File exists
2. Has exactly these 3 lines:
   ```
   PORT=5000
   OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY
   NODE_ENV=development
   ```
3. No extra spaces or quotes
4. API key is exactly: `sk-proj-REPLACE_WITH_YOUR_KEY`

---

### If Backend Not Starting

```bash
cd backend

# Kill old process
pkill -f "npm start"

# Try again
npm start
```

---

### If Port 5000 Already In Use

```bash
# Find what's using port 5000
lsof -i :5000

# Kill it (replace PID with number from above)
kill -9 <PID>

# Start backend again
npm start
```

---

## Still Need Help?

Check these files in order:

1. **QUICK_FIX.md** ← You are here
2. **TROUBLESHOOTING.md** ← Detailed debugging
3. **DEBUG_ENHANCEMENTS.md** ← What was improved

Or run the diagnostic:
```bash
bash /Users/nandhakumar_r/Documents/CodeGen/InterviewBot/InterviewProcess/diagnose.sh
```

---

## Timeline

- ⏱️ 1 min: Create .env file
- ⏱️ 1 min: Start backend
- ⏱️ 1 min: Test health endpoint  
- ⏱️ 1 min: Start frontend
- ⏱️ 1 min: Clear cache & test

**Total: ~5 minutes**

---

**Version**: 1.0  
**Date**: January 22, 2026  
**Status**: Ready to Execute
