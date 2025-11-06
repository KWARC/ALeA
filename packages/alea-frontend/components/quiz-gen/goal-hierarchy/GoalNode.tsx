import React from 'react';
import { Edge, Handle, Node, Position } from '@xyflow/react';
import { Paper, Typography } from '@mui/material';
import { NodeType } from './GoalHierarchyDialog';

export interface GoalNodeData {
  label: string;
  level: number;
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

export const GoalNodeComponent: React.FC<GoalNodeProps> = ({ id, data, selected }) => {
  const color = GOAL_NODE_COLORS[(data.level - 1) % GOAL_NODE_COLORS.length];

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
        backgroundColor: color,

        opacity: 0.8,
        maxWidth: 300,
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: '#555' }} />
      <Typography variant="body1" color="#000000">
        {data.label}
      </Typography>
      <Typography variant="body1" color="#d1c2c2ff">
        {data.level}
      </Typography>
      {data.subGoalUris && data.subGoalUris.length > 0 && (
        <Typography> Subgoals: {data.subGoalUris.length}</Typography>
      )}
      <Handle type="source" position={Position.Top} style={{ background: '#555' }} />
    </Paper>
  );
};
