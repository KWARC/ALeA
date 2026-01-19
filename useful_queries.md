# Useful queries

## To get token from ALeA survey quiz

```
SELECT problemId, response, userId
FROM grading
WHERE (quizId, problemId, userId, browserTimestamp_ms) IN (
    SELECT quizId, problemId, userId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
    FROM grading
    WHERE quizId = 'quiz-d579e22g'
    GROUP BY problemId, userId
)
AND quizId = 'quiz-d579e22g'
```
