import React from 'react';
import { Edge, Handle, Node, Position } from '@xyflow/react';
import { Box, Paper, Typography } from '@mui/material';
import { NodeType } from './GoalHierarchyDialog';
import { ConceptView } from 'packages/stex-react-renderer/src/lib/CompetencyTable';

export interface GoalNodeData {
  label: string;
  uri: string;
  subGoalUris?: string[];
  setFocusedNodeId?: React.Dispatch<React.SetStateAction<string | null>>;
  [key: string]: unknown;
}
export type GoalNode = Node<GoalNodeData, NodeType.GOAL_NODE>;
export type GoalEdge = Edge;
interface GoalNodeProps {
  id: string;
  data: GoalNodeData;
  selected?: boolean;
}

export const GOAL_NODE_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948'];
export const NODE_TYPE_COLORS = {
  concept: '#4caf50',
  'created-prop': '#2196f3',
  'existing-prop': '#ff9800',
  unknown: '#9e9e9e',
};
export function classifyNode(id: string): 'created-prop' | 'existing-prop' | 'concept' | 'unknown' {
  try {
    const encoded = id.split('goal=')[1];
    if (!encoded) return 'unknown';

    const decoded = decodeURIComponent(encoded);

    const url = new URL(decoded);
    const params = url.searchParams;

    if (params.has('prop')) {
      return 'created-prop';
    }

    if (params.has('e') || decoded.toLowerCase().includes('definition')) {
      return 'existing-prop';
    }

    const conceptParams = ['m', 's'];
    if (Array.from(params.keys()).some((k) => conceptParams.includes(k))) {
      return 'concept';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
export const GoalNodeComponent: React.FC<GoalNodeProps> = ({ id, data, selected }) => {
  const type = classifyNode(id);
  const isConcept = type === 'concept';
  const typeColor = NODE_TYPE_COLORS[type];
  const encodedTarget = id.split("goal=")[1];

const conceptUri = decodeURIComponent(encodedTarget);
  return (
    <Paper
      elevation={1}
      onDoubleClick={() => {
        if (data.setFocusedNodeId) {
          data.setFocusedNodeId((prev) => (prev === id ? null : id));
        }
      }}
      sx={{
        p: 2,
        borderRadius: 2,
        border: selected ? '2px solid #ec1212ff' : '1px solid #0fef30ff',
        borderColor: 'divider',
        backgroundColor: typeColor,

        opacity: 0.8,
        maxWidth: 300,
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: '#555' }} />
      {isConcept ? (<Box p={1.5} borderRadius={2} bgcolor={"#fff"}>
        <ConceptView uri={conceptUri } /></Box>
      ) : (
        <Typography variant="body1" color="#000000">
          {data.label}
        </Typography>
      )}
      {data.subGoalUris && data.subGoalUris.length > 0 && (
        <Typography> Subgoals: {data.subGoalUris.length}</Typography>
      )}
      <Handle type="source" position={Position.Top} style={{ background: '#555' }} />
    </Paper>
  );
};
