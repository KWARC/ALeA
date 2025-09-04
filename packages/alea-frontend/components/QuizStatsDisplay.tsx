import { QuizStatsResponse } from '@stex-react/spec';
import { convertHtmlStringToPlain } from '@stex-react/utils';
import Chart from 'react-google-charts';
import { BarChart } from './HomeworkState';

export function TimedLineChart({
  data,
  column1,
  column2,
}: {
  data: { ts: number; value: number }[];
  column1: string;
  column2: string;
}) {
  // Enter a dummy value if there isn't any data, to following error from Google charts :
  // `Data column(s) for axis #0 cannot be of type string`
  const vals = data?.length ? data.map((d) => [new Date(d.ts * 1000), d.value]) : [[new Date(), 0]];
  return (
    <Chart
      chartType="LineChart"
      data={[[column1, column2], ...vals]}
      width="100%"
      height="400px"
      options={{
        vAxis: { minValue: 0 },
        hAxis: {
          title: 'Time',
          format: 'dd MMM HH:mm:ss',
        },
      }}
      legendToggle
    />
  );
}

function bucketToFirstNum(bucket: string) {
  if (!bucket.includes(',')) {
    const n = parseFloat(bucket);
    if (n === 0) return -1e-6;
    return n + 1e-6;
  }

  const lowerBound = bucket.split(',')[0].replace('[', '').trim();
  return parseFloat(lowerBound);
}

function getColorOfBar(avgQuotient: number): string {
  if (avgQuotient < 0.5) {
    return '#dc3912';
  } else if (avgQuotient >= 0.5 && avgQuotient <= 0.7) {
    return '#ff9900';
  } else {
    return '#109618';
  }
}

export function QuizStatsDisplay({
  stats,
  maxProblems,
}: {
  stats: QuizStatsResponse;
  maxProblems: number;
}) {
  return (
    <>
      <h2>
        Quiz attempted by <b style={{ color: 'red' }}>{stats.totalStudents}</b> students
      </h2>

      <h2>Problems attempted</h2>
      <BarChart
        data={Array.from({ length: maxProblems + 1 }).map((_, idx) => ({
          key: idx.toString(),
          value: +stats.attemptedHistogram[idx],
        }))}
        column1="Attempted Problems"
        column2="Number of students"
      />
      <br />

      <h2>Response Rates</h2>
      <TimedLineChart
        data={Object.keys(stats.requestsPerSec)
          .map((s) => +s)
          .sort((a, b) => a - b)
          .map((ts) => ({
            ts: +ts,
            value: +stats.requestsPerSec[ts],
          }))}
        column1="Time"
        column2="Responses/sec"
      />
      <br />

      <h2>Scores</h2>
      <BarChart
        data={Object.keys(stats.scoreHistogram)
          .sort((a, b) => bucketToFirstNum(a) - bucketToFirstNum(b))
          .map((bucket) => ({
            key: bucket,
            value: +stats.scoreHistogram[bucket],
          }))}
        column1="Score"
        column2="Number of students"
      />
      <Chart
        chartType="ColumnChart"
        data={[
          ['Question', 'Satisfactory (>70%)', 'Pass (50-70%)', 'Fail (<50%)'],
          ...Object.keys(stats.perProblemStats).map((problemId) => {
            const { satisfactory, fail, pass, header, maxPoints } =
              stats.perProblemStats[problemId];
            let disp = header ? convertHtmlStringToPlain(header) : '';
            disp += ` (${problemId}) [${maxPoints}]`;
            return [disp, satisfactory, pass, fail];
          }),
        ]}
        width="100%"
        height="400px"
        options={{
          vAxis: { minValue: 0 },
          isStacked: true,
          series: {
            0: { color: '#109618' },
            1: { color: '#ff9900' },
            2: { color: '#dc3912' },
          },
        }}
        legendToggle
      />
      <Chart
        chartType="ColumnChart"
        data={[
          ['Quotient', 'AvgQuotient', { role: 'style' }],
          ...Object.keys(stats.perProblemStats).map((problemId) => {
            const { avgQuotient, header, maxPoints } = stats.perProblemStats[problemId];
            let disp = header ? convertHtmlStringToPlain(header) : '';
            disp += ` (${problemId}) [${maxPoints}]`;
            return [disp, avgQuotient, getColorOfBar(avgQuotient)];
          }),
        ]}
        width="100%"
        height="400px"
      />
    </>
  );
}
