import { FTML } from '@flexiformal/ftml';
import { Box } from '@mui/material';
import { FTMLProblemWithSolution, FTMLProblemWithSubProblems } from '@alea/spec';
import React from 'react';

function getProblemsFromQuiz(quiz: FTML.Quiz): Record<string, FTMLProblemWithSolution> {
  const result: Record<string, FTMLProblemWithSolution> = {};
  function findSubProblem(str1: string, str2: string) {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;
    return str1.length != str2.length ? longer.startsWith(shorter) : false;
  }
  function processQuizElement(element: FTML.QuizElement) {
    if ('Problem' in element) {
      const problem = element.Problem as FTMLProblemWithSubProblems;
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
    } else if ('Section' in element) {
      element.Section.elements.forEach(processQuizElement);
    }
  }

  quiz.elements.forEach(processQuizElement);
  return result;
}

export function QuizFileReader({
  setCss,
  setTitle,
  setProblems,
}: {
  setTitle: (title: string) => void;
  setProblems: (problems: Record<string, FTMLProblemWithSolution>) => void;
  setCss: (css: FTML.Css[]) => void;
}) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(e.target?.result);
      const contents = e.target?.result as string;
      try {
        const parsedJson = JSON.parse(contents) as FTML.Quiz;
        console.log(parsedJson);
        // Check if the parsed content is a valid JSON object before updating the state
        if (typeof parsedJson === 'object' && parsedJson !== null) {
          setProblems(getProblemsFromQuiz(parsedJson));
          setTitle(parsedJson.title);
          setCss(parsedJson.css);
        } else {
          alert('Invalid JSON file.');
        }
      } catch (error) {
        alert('Error parsing JSON: ' + error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <input type="file" accept=".json" onChange={handleFileChange} />
    </Box>
  );
}
