import { FTML } from '@flexiformal/ftml';
import { FTMLProblemWithSolution } from '@alea/spec';
import { getPoints, ProblemDisplay } from '@alea/stex-react-renderer';
import { useEffect, useState } from 'react';

const ProblemFetcher = ({
  problemUri,
  isFrozen,
  response,
  onResponseUpdate,
}: {
  problemUri: string;
  isFrozen: boolean;
  response?: FTML.ProblemResponse;
  onResponseUpdate?: (response: FTML.ProblemResponse | undefined, quotient: number) => void;
}) => {
  const [problem, setProblem] = useState<FTMLProblemWithSolution | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      if (!problemUri) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // TODO ALEA4-G1
        const fetchedProblem: FTMLProblemWithSolution = {
          problem: {
            html: '',
            title_html: undefined,
            uri: problemUri,
            total_points: 1,
            preconditions: [],
            objectives: [],
          },
          answerClasses: [],
          solution: '',
        };
        /*const problemHtml = await getLearningObjectShtml(problemUri);
        const fetchedProblem = getProblem(problemHtml, '');
        setProblem(fetchedProblem);*/
        if (!isFrozen) onResponseUpdate(undefined, 0);
      } catch (error) {
        console.error('Error fetching problem:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [problemUri]);

  if (!problemUri) {
    return <i>No problem link provided.</i>;
  }

  if (loading) return <div>Loading problem...</div>;

  return (
    <ProblemDisplay
      problem={problem}
      isFrozen={isFrozen}
      r={response}
      showPoints={false}
      onResponseUpdate={(r) => {
        const points = getPoints(problem, r);
        console.log('points:', points);
        if (onResponseUpdate) onResponseUpdate(r, points / (problem.problem.total_points || 1));
      }}
    />
  );
};

export default ProblemFetcher;
