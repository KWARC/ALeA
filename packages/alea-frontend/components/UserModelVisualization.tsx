import { getLmpUriWeightsAggBulk } from '@alea/spec';
import { TourAPIEntry } from '@alea/stex-react-renderer';
import { simpleHash } from '@alea/utils';
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, IconButton } from '@mui/material';
import axios from 'axios';
import * as d3 from 'd3';
import { Dag, dagStratify, decrossOpt /*DagNode, zherebko, grid*/, sugiyama } from 'd3-dag';
import { useEffect, useReducer, useState } from 'react';

const nodeRadius = 20;

interface D3DagEntry {
  id: string; // This is a hash of the full_id;
  parentIds: string[]; // List of hashes of dependents

  fullId: string;
  weight: number;
}

function getD3DagEntries(tourAPIEntries: TourAPIEntry[], weights: number[]) {
  const tourItems: Map<string, D3DagEntry> = new Map();
  for (const [idx, entry] of tourAPIEntries.entries()) {
    tourItems.set(entry.id, {
      id: simpleHash(entry.id),
      fullId: entry.id,
      parentIds: [],
      weight: weights[idx],
    });
  }
  for (const n of tourAPIEntries) {
    for (const s of n.successors) {
      tourItems.get(s)?.parentIds.push(simpleHash(n.id));
    }
  }
  return Array.from(tourItems.values());
}

interface D3DagInfo {
  dag: Dag<D3DagEntry, undefined>;
  d3DagEntries: D3DagEntry[];
  width: number;
  height: number;
}

async function fetchDataForDag(tourId: string, language: string): Promise<D3DagInfo> {
  const tourInfoUrl = `TODO ALEA4-M2/:vollki/tour?path=${tourId}&user=nulluser&lang=${language}`;
  const apiEntries: TourAPIEntry[] = (await axios.get(tourInfoUrl)).data;
  const tourUris = apiEntries.map((e) => e.id);
  const weights = await getLmpUriWeightsAggBulk(tourUris);
  const d3DagEntries = getD3DagEntries(
    apiEntries,
    weights.map((d) => d.Remember)
  );

  const dag = dagStratify()(d3DagEntries);
  const layout = sugiyama() // base layout
    .decross(decrossOpt()) // minimize number of crossings
    .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]);
  const { width, height } = layout(dag as any);
  return { dag, d3DagEntries, width, height };
}

function simplify(id: string) {
  return id.substring(id.indexOf('?') + 1);
}

function renderD3Dag(d3DagInfo: D3DagInfo) {
  if (!d3DagInfo) return;
  const { dag, width, height } = d3DagInfo;

  d3.selectAll('#visualization > *').remove();
  const svgSelection = d3.select('#visualization');
  svgSelection.attr('viewBox', [0, 0, width, height].join(' '));
  const defs = svgSelection.append('defs'); // For gradients

  const steps = dag.size();
  const interp = d3.interpolateRainbow;
  const colorMap = new Map();
  for (const [i, node] of Array.from(dag.idescendants()).entries()) {
    const hue = Math.round((i / steps) * 360.0);
    const lum = Math.round(node.data.weight * 40 + 10);
    colorMap.set(node.data.id, `hsl(${hue}, 100%, ${lum}%)`); //interp(i / steps)
  }

  // How to draw edges
  const line = d3
    .line()
    .curve(d3.curveCatmullRom)
    .x((d) => d.x)
    .y((d) => d.y);

  // Plot edges
  svgSelection
    .append('g')
    .selectAll('path')
    .data(dag.links())
    .enter()
    .append('path')
    .attr('d', ({ points }) => line(points))
    .attr('fill', 'none')
    .attr('stroke-width', 3)
    .attr('stroke', ({ source, target }) => {
      // encodeURIComponents for spaces, hope id doesn't have a `--` in it
      const gradId = encodeURIComponent(`${source.data.id}--${target.data.id}`);
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', source.x)
        .attr('x2', target.x)
        .attr('y1', source.y)
        .attr('y2', target.y);
      grad.append('stop').attr('offset', '0%').attr('stop-color', colorMap.get(source.data.id));
      grad.append('stop').attr('offset', '100%').attr('stop-color', colorMap.get(target.data.id));
      return `url(#${gradId})`;
    });

  // Select nodes
  const nodes = svgSelection
    .append('g')
    .selectAll('g')
    .data(dag.descendants())
    .enter()
    .append('g')
    .attr('transform', ({ x, y }) => `translate(${x}, ${y})`);

  // Plot node circles
  nodes
    .append('circle')
    //.attr('opacity', (d) => `${(d.data.weight + 1) / 2}`)
    /*.on('mouseover', (n) => {
      d3.select(n.target).style('stroke', 'black').style('opacity', 1);
      console.log('a');
      console.log(n.target.__data__.data);
    })*/
    .attr('r', nodeRadius)
    .attr('fill', (n) => colorMap.get(n.data.id));

  // Add text to nodes
  nodes
    .append('text')
    .text((d) => `${simplify(d.data.fullId)} ${d.data.weight}`)
    .attr('font-weight', 'bold')
    .attr('font-size', '7px')
    .attr('font-family', 'sans-serif')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', 'white');
}
export function UserModelVisualization({
  tourId,
  language = 'en',
}: {
  tourId: string;
  language?: string;
}) {
  const [d3DagInfo, setD3DagInfo] = useState(null as D3DagInfo);
  const [forceCount, forceUpdate] = useReducer((x) => x + 1, 0);
  renderD3Dag(d3DagInfo);
  useEffect(() => {
    console.log(forceCount);
    fetchDataForDag(tourId, language).then((i) => setD3DagInfo(i));
    // set node size instead of constraining to fit
  }, [tourId, language, forceCount]);

  return (
    <Box sx={{ backgroundColor: 'black' }}>
      {d3DagInfo && (
        <IconButton sx={{ color: 'white' }} onClick={forceUpdate}>
          <ReplayIcon />
        </IconButton>
      )}
      <svg id="visualization"></svg>
    </Box>
  );
}
