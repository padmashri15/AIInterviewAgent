# Example AI-Generated Interview Questions

## Swift (iOS Development) - Proficient Level

### Sample Generated Questions (10-15 mix):

#### Objective Type (Factual Knowledge)
1. **What is the difference between a struct and a class in Swift?**
   - Evaluates understanding of value vs reference types
   - Tests fundamental Swift knowledge

2. **Which of these is NOT a value type in Swift: Array, Dictionary, Set, or Class?**
   - Multiple choice question
   - Tests knowledge of Swift's type system

#### Logical Questions (Problem-Solving)
3. **How would you optimize memory usage when working with large image collections in a ScrollView?**
   - Tests practical thinking and optimization skills
   - Real-world scenario-based

4. **Explain how you would implement a singleton pattern in Swift and when you would use it.**
   - Design pattern understanding
   - Practical application knowledge

#### Theory Questions (Conceptual Knowledge)
5. **Explain Swift's Automatic Reference Counting (ARC) and the problem of strong reference cycles.**
   - Deep conceptual understanding
   - Memory management expertise

6. **What are protocols in Swift and how do they support composition over inheritance?**
   - Advanced language concepts
   - Architecture and design patterns

#### Coding Snippets (Bug Identification)
7. **What is wrong with this code? There is a memory leak. Identify and fix it.**
   ```swift
   class DataManager {
       var delegate: (() -> Void)?
       
       func setupCallback() {
           delegate = { [unowned self] in  // ERROR: Should use [weak self]
               self.loadData()
           }
       }
       
       func loadData() {}
   }
   ```
   - Strong reference cycle issue
   - Memory management problem

8. **Find the bug in this code. It won't compile.**
   ```swift
   func processArray(_ items: [Int]) -> Int {
       var sum = 0
       for item in items {
           sum += item  // ERROR: Missing type annotation
       }
       return sum  // ERROR: Should be optional
   }
   ```
   - Type safety issues
   - Optional handling

---

## React Native - Advanced Beginner Level

### Sample Generated Questions:

#### Objective Type
1. **What is the primary difference between props and state in React Native?**
   - Foundational concept
   - Data flow understanding

2. **Which component is used for rendering a scrollable list in React Native?**
   - API knowledge
   - Component selection

#### Logical Questions
3. **How would you prevent unnecessary re-renders in a React Native component?**
   - Performance optimization
   - React lifecycle understanding

#### Theory Questions
4. **Explain how React Native bridges JavaScript and native code.**
   - Architecture understanding
   - Platform-specific knowledge

#### Coding Snippets
5. **Find the memory leak in this component.**
   ```javascript
   useEffect(() => {
       const timer = setInterval(() => {
           console.log("Tick");
       }, 1000);
       // ERROR: Missing cleanup function
       // Should: return () => clearInterval(timer);
   }, []);
   ```
   - Cleanup functions
   - Memory management

---

## Kotlin - Expert Level

### Sample Generated Questions:

#### Objective Type
1. **What keyword makes a Kotlin class open for inheritance?**
   - Language feature knowledge

#### Logical Questions
2. **How would you implement a Repository pattern in Kotlin with coroutines?**
   - Advanced architecture
   - Async programming

#### Theory Questions
3. **Explain Kotlin coroutines and their advantages over traditional threading.**
   - Deep conceptual understanding
   - Performance considerations

#### Coding Snippets
4. **Identify the null safety issue in this code.**
   ```kotlin
   val name: String = null  // ERROR: Cannot assign null to non-nullable type
   val length = name.length  // ERROR: Possible null pointer
   
   fun getValue(): String? = "test"
   val result = getValue().length  // ERROR: length called on nullable type
   ```
   - Null safety features
   - Type system understanding

---

## Flutter - Novice Level

### Sample Generated Questions:

#### Objective Type
1. **What is the base class for all Flutter widgets?**
   - Foundational knowledge

2. **Difference between StatelessWidget and StatefulWidget?**
   - Core concept understanding

#### Logical Questions
3. **How would you optimize Flutter app performance for large lists?**
   - Practical optimization

#### Theory Questions
4. **Explain the Flutter widget tree and rendering pipeline.**
   - Architecture understanding

#### Coding Snippets
5. **Identify the bug causing memory leak.**
   ```dart
   class MyWidget extends StatefulWidget {
       @override
       _MyWidgetState createState() => _MyWidgetState();
   }
   
   class _MyWidgetState extends State<MyWidget> {
       StreamSubscription? subscription;
       
       @override
       void initState() {
           super.initState();
           subscription = stream.listen((data) {
               setState(() {});
           });
           // ERROR: Missing dispose() call
       }
   }
   ```
   - Resource management
   - Lifecycle awareness

---

## Question Generation Parameters

### Difficulty Levels
- **Novice** (0-1 years): Fundamentals, basic API usage
- **Advanced Beginner** (1-3 years): Intermediate concepts, design patterns
- **Proficient** (3-5 years): Advanced features, optimization, best practices
- **Expert** (5+ years): Architecture, advanced patterns, edge cases

### Question Type Distribution
- **Objective**: 2-3 questions (20-25%)
- **Logical**: 3-4 questions (25-30%)
- **Theory**: 3-4 questions (25-30%)
- **Coding**: 3-4 questions (20-25%)

### Total Questions: 12-15 per interview session

---

## How Questions Are Generated

1. **Prompt Template** is used with:
   - Selected technology
   - Candidate's experience level
   - Role level
   - Candidate name

2. **OpenAI GPT-4** generates questions that:
   - Match the specified difficulty
   - Cover different question types
   - Are technology-specific
   - Include realistic coding snippets for Kotlin questions

3. **Validation & Normalization**:
   - Ensures proper JSON format
   - Verifies all required fields
   - Assigns unique IDs
   - Sets default values

4. **Fallback Questions** used if:
   - API key is invalid
   - Network error occurs
   - API rate limit reached
   - Response parsing fails

---

## Tips for Interview Success

### For Objective Questions
- Pay attention to details
- Read all options carefully
- Think about edge cases

### For Logical Questions
- Explain your thinking process
- Provide real-world examples
- Discuss trade-offs and alternatives

### For Theory Questions
- Show deep understanding
- Mention industry best practices
- Connect concepts together

### For Coding Questions
- Take time to analyze the code
- Identify the bug systematically
- Explain the fix and why it works
- Discuss how to prevent such issues

---

## Example Interview Session

**Candidate**: John Doe
**Technology**: Swift (iOS)
**Experience**: 5 years
**Role Level**: Proficient
**Questions Generated**: 13 questions
- Objective: 2 questions
- Logical: 3 questions
- Theory: 4 questions
- Coding: 4 questions

**Interview Duration**: ~45-60 minutes
**Average Question Time**: 4-5 minutes per question
