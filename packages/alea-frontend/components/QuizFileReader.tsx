import { FTML } from '@flexiformal/ftml';
import { Box, Alert } from '@mui/material';
import { FTMLProblemWithSolution, FTMLProblemWithSubProblems } from '@alea/spec';
import React, { useState } from 'react';
function quizHasSubProblems(quiz: FTML.Quiz): boolean {
  let found = false;
  function checkElement(element: FTML.QuizElement) {
    if (element.type === 'Problem') {
      const problem = element as FTMLProblemWithSubProblems;
      if (problem.subProblems && problem.subProblems.length > 0) {
        found = true;
      }
    }
    if (element.type === 'Section') {
      element.elements?.forEach(checkElement);
    }
  }
  quiz.elements.forEach(checkElement);
  return found;
}
function getProblemsFromQuiz(quiz: FTML.Quiz): Record<string, FTMLProblemWithSolution> {
  const result: Record<string, FTMLProblemWithSolution> = {};
  function findSubProblem(str1: string, str2: string) {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;
    return str1.length != str2.length ? longer.startsWith(shorter) : false;
  }
  function processQuizElement(element: FTML.QuizElement) {
    if (element.type === 'Problem') {
      const problem = element as FTMLProblemWithSubProblems;
      const answerClasses = quiz.answer_classes[problem.uri];
      const solution = quiz.solutions[problem.uri] || '';
      for (const item of Object.keys(quiz.solutions)) {
        if (findSubProblem(item, problem.uri)) {
          if (problem.subProblems == null) {
            problem.subProblems = [];
          }
          problem.subProblems.push({
            solution: quiz.solutions[item],
            answerClasses: quiz.answer_classes[item],
            id: item,
          });
        }
      }
      result[problem.uri] = { problem, answerClasses, solution };
    } else if (element.type === 'Section') {
      element.elements?.forEach(processQuizElement);
    }
  }

  quiz.elements.forEach(processQuizElement);
  return result;
}

export function QuizFileReader({
  setCss,
  setTitle,
  setProblems,
  allowSubproblems = true,
  setHasSubproblemError,
}: {
  setTitle: (title: string) => void;
  setProblems: (problems: Record<string, FTMLProblemWithSolution>) => void;
  setCss: (css: FTML.Css[]) => void;
  allowSubproblems?: boolean;
  setHasSubproblemError: (hasError: boolean) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setHasSubproblemError(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(e.target?.result);
      const contents = e.target?.result as string;
      try {
        const parsedJson = JSON.parse(contents) as FTML.Quiz;
        console.log(parsedJson);
        // Check if the parsed content is a valid JSON object before updating the state
        if (typeof parsedJson === 'object' && parsedJson !== null) {
          if (quizHasSubProblems(parsedJson) && !allowSubproblems) {
            setErrorMessage('Subproblems are not supported in this quiz.');
            setHasSubproblemError(true);
            return;
          }
          const extractedProblems = getProblemsFromQuiz(parsedJson);
          setProblems(extractedProblems);
          setTitle(parsedJson.title);
          setCss(parsedJson.css);
        } else {
          setErrorMessage('Invalid JSON file.');
        }
      } catch (error) {
        setErrorMessage('Error parsing JSON: ' + error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <input type="file" accept=".json" onChange={handleFileChange} />
      {errorMessage && (
        <Alert severity="error" sx={{ marginTop: '8px', fontSize: '13px' }}>
          {errorMessage}
        </Alert>
      )}
    </Box>
  );
}
