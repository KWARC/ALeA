import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Button,

} from '@mui/material';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { GOAL_NODE_COLORS, GoalNodeComponent, GoalNode, GoalEdge } from './GoalNode';
import { getSectionGoals, Goal, runGraphDbUpdateQuery } from '@alea/spec';
import { CreateNodeDialog, EditNodeDialog } from './goal-hierarchy/NodeDialogs';
import { RightSidebar } from './goal-hierarchy/RightSidebar';

function InstanceSetter({ setInstance }: { setInstance: (instance: ReactFlowInstance) => void }) {
  const instance = useReactFlow();
  useEffect(() => {
    if (instance) setInstance(instance);
  }, [instance, setInstance]);
  return null;
}

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 100;

function estimateNodeHeight(label: string, maxWidth: number, fontSize = 16, lineHeight = 24) {
  const charsPerLine = Math.floor(maxWidth / 8);
  const lines = Math.ceil(label.length / charsPerLine);
  return lines * lineHeight + 20;
}

export function getLayoutedElementsBT(
  nodes: Array<{ id: string; data: any }>,
  edges: Array<{ source: string; target: string }>,
  direction: 'BT' | 'LR' = 'BT'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const ranksep = NODE_HEIGHT + 50;
  const nodesep = NODE_WIDTH + 50;
  const rankdir = direction === 'BT' ? 'TB' : 'LR';
  dagreGraph.setGraph({ rankdir, ranksep, nodesep });

  nodes.forEach((n) => {
    const height = estimateNodeHeight(n.data.label, NODE_WIDTH);
    dagreGraph.setNode(n.id, { width: NODE_WIDTH, height });
  });
  edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
  dagre.layout(dagreGraph);

  let maxY = 0;
  if (direction === 'BT') maxY = Math.max(...nodes.map((n) => dagreGraph.node(n.id).y));

  return nodes.map((n) => {
    const { x, y } = dagreGraph.node(n.id);
    const position = direction === 'BT' ? { x, y: maxY - y } : { x, y };
    return {
      ...n,
      position,
      sourcePosition: direction === 'BT' ? Position.Top : Position.Right,
      targetPosition: direction === 'BT' ? Position.Bottom : Position.Left,
    };
  });
}

export enum NodeType {
  GOAL_NODE = 'GOAL_NODE',
  LOADING = 'LOADING',
  SUGGESTION = 'SUGGESTION',
  NEWLY_ADDED = 'NEWLY_ADDED',
}

interface GoalHierarchyDialogProps {
  open: boolean;
  onClose: () => void;
  courseNotesUri: string;
  sectionUri: string;
}

export default function GoalHierarchyDialog({
  open,
  onClose,
  courseNotesUri,
  sectionUri,
}: GoalHierarchyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<'BT' | 'LR'>('BT');
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['All']);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<GoalNode | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | undefined>(
    undefined
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<GoalNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GoalEdge>([]);
  const [maxLevel, setMaxLevel] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNodeData, setNewNodeData] = useState({
    label: '',
    level: maxLevel + 1,
    position: { x: 0, y: 0 },
  });
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const nodeTypes = { [NodeType.GOAL_NODE]: GoalNodeComponent };
  const pendingConnectionRef = useRef<any>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSectionGoals(courseNotesUri, sectionUri);
      const nodeMap = new Map<string, number>();
      const assignLevel = (goal: Goal, level = 1) => {
        nodeMap.set(goal.uri, level);
        goal.subGoalUris.forEach((subUri: string) => {
          const subGoal = data.allGoals.find((g: any) => g.uri === subUri);
          if (subGoal) assignLevel(subGoal, level + 1);
        });
      };

      data.topLevelGoalUris.forEach((uri: string) => {
        const top = data.allGoals.find((g: any) => g.uri === uri);
        if (top) assignLevel(top, 1);
      });

      const baseNodes: GoalNode[] = data.allGoals.map((goal: any) => {
        const level = nodeMap.get(goal.uri) || 1;
        return {
          id: goal.uri,
          type: NodeType.GOAL_NODE,
          position: { x: 0, y: 0 },
          data: {
            label: goal.text || 'Untitled Goal',
            level,
            uri: goal.uri,
            subGoalUris: goal.subGoalUris,
            setFocusedNodeId,
          },
        };
      });

      const baseEdges: GoalEdge[] = data.allGoals.flatMap((goal: any) =>
        goal.subGoalUris.map((subUri: string) => ({
          id: `${goal.uri}-${subUri}`,
          source: subUri,
          target: goal.uri,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        }))
      );

      setMaxLevel(Math.max(...Array.from(nodeMap.values())));
      const layouted = getLayoutedElementsBT(baseNodes, baseEdges, direction);
      setNodes(layouted);
      setEdges(baseEdges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [direction,courseNotesUri,sectionUri]);

  useEffect(() => {
    if (open) fetchGoals();
  }, [open, fetchGoals]);

  const filteredNodes = useMemo(() => {
    const isAllLevels = selectedLevels.includes('All');
    const levelSet = new Set(selectedLevels.map((l) => Number(l)));

    let visibleNodeIds: Set<string> | null = null;
    if (focusedNodeId) {
      const connectedEdges = edges.filter(
        (e) => e.source === focusedNodeId || e.target === focusedNodeId
      );
      visibleNodeIds = new Set([
        focusedNodeId,
        ...connectedEdges.flatMap((e) => [e.source, e.target]),
      ]);
    }

    return nodes.filter(
      (n) =>
        (isAllLevels || levelSet.has(n.data.level)) && (!visibleNodeIds || visibleNodeIds.has(n.id))
    );
  }, [nodes, edges, selectedLevels, focusedNodeId]);

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [edges, filteredNodes]);

  const onConnect = useCallback(
    (params: any) => {
      if (!params.target) {
        pendingConnectionRef.current = params;
        setNewNodeData({ label: '', level: maxLevel + 1, position: null });
      } else {
        const newEdge: GoalEdge = {
          ...params,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        };
        setEdges((eds) => addEdge(newEdge, eds));
        runGraphDbUpdateQuery(`
        INSERT DATA { <${params.target}> <http://mathhub.info/ulo#hasSubGoal> <${params.source}> }
      `);
      }
    },
    [setEdges, maxLevel]
  );

  const handleCreateNodeConfirm = useCallback(
    (label: string, level: number) => {
      if (!label) return;

      const newId = `http://mathhub.info?goal=${encodeURIComponent(
        label.trim().replace(/\s+/g, '_')
      )}`;

      const newNode: GoalNode = {
        id: newId,
        type: NodeType.GOAL_NODE,
        data: {
          label,
          uri: newId,
          level,
          setFocusedNodeId,
        },
        position: { x: newNodeData.position.x, y: newNodeData.position.y },
        style: {
          backgroundColor: GOAL_NODE_COLORS[(level - 1) % GOAL_NODE_COLORS.length],
          color: '#fff',
          borderRadius: 8,
          padding: 8,
          border: '1px solid #ddd',
        },
      };

      setNodes((nds) => [...nds, newNode]);

      runGraphDbUpdateQuery(`
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      INSERT { 
        <${newId}> a <http://mathhub.info/Goal> .
         <${newId}> dc:description "${label}" .
      }WHERE { }
    `);

      if (pendingConnectionRef.current) {
        const newEdge = {
          id: `${pendingConnectionRef.current.source}-${newId}`,
          source: pendingConnectionRef.current.source,
          target: newId,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        };
        setEdges((eds) => [...eds, newEdge]);

        runGraphDbUpdateQuery(`
        INSERT DATA { <${pendingConnectionRef.current.source}> <http://mathhub.info/ulo#hasSubGoal> <${newId}> }
      `);

        pendingConnectionRef.current = null;
      }

      setCreateDialogOpen(false);
    },
    [setNodes, setEdges]
  );

  const handleNodeUpdate = async (oldUri: string, newLabel: string) => {
    const newUri = `http://mathhub.info?goal=${encodeURIComponent(
      newLabel.trim().replace(/\s+/g, '_')
    )}`;
    const sparqlUpdate = `
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX ulo: <http://mathhub.info/ulo#>

      DELETE { <${oldUri}> ?p ?o }
      INSERT { <${newUri}> ?p ?o }
      WHERE { <${oldUri}> ?p ?o };

      DELETE { ?s ?p <${oldUri}> }
      INSERT { ?s ?p <${newUri}> }
      WHERE { ?s ?p <${oldUri}> };

      DELETE { <${newUri}> dc:description ?oldDesc }
      INSERT { <${newUri}> dc:description "${newLabel}" }
      WHERE { OPTIONAL { <${newUri}> dc:description ?oldDesc } };
    `;

    const oldNodes = [...nodes];
    const oldEdges = [...edges];

    try {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === oldUri
            ? { ...n, id: newUri, data: { ...n.data, label: newLabel, uri: newUri } }
            : n
        )
      );
      setEdges((prev) =>
        prev.map((e) =>
          e.source === oldUri
            ? { ...e, source: newUri }
            : e.target === oldUri
            ? { ...e, target: newUri }
            : e
        )
      );
      await runGraphDbUpdateQuery(sparqlUpdate);
      setEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      setNodes(oldNodes);
      setEdges(oldEdges);
      alert('Failed to update node. Changes were rolled back.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>Goal Hierarchy (DAAG)</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" gap={2} height="75vh">
            <Box flex={1.2} border="1px solid #ddd" borderRadius={2} overflow="hidden">
              <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeContextMenu={(e, node) => {
                  e.preventDefault();
                  setNodeToEdit(node);
                  setEditDialogOpen(true);
                }}
                onPaneContextMenu={(e) => {
                  e.preventDefault();
                  setCreateDialogOpen(true);
                  setNewNodeData({ ...newNodeData, position: { x: e.clientX, y: e.clientY } });
                }}
                onConnectEnd={(e) => {
                  if (!pendingConnectionRef.current) return;
                  const bounds = (
                    document.querySelector('.react-flow__renderer') as HTMLElement
                  ).getBoundingClientRect();
                  setNewNodeData((prev) => ({
                    ...prev,
                    position: {
                      x: (e as any).clientX - bounds.left,
                      y: (e as any).clientY - bounds.top,
                    },
                  }));
                  setCreateDialogOpen(true);
                }}
                fitView
                minZoom={0.1}
                maxZoom={2}
              >
                <MiniMap nodeColor={(n: any) => n.style?.backgroundColor || '#999'} />
                <Controls />
                <Background />
                <InstanceSetter setInstance={setReactFlowInstance} />
              </ReactFlow>
              {focusedNodeId && (
                <Button onClick={() => setFocusedNodeId(null)} variant="outlined" size="small">
                  Clear Focus
                </Button>
              )}
            </Box>
            <RightSidebar
              maxLevel={maxLevel}
              selectedLevels={selectedLevels}
              setSelectedLevels={setSelectedLevels}
              direction={direction}
              setDirection={setDirection}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <CreateNodeDialog
        open={createDialogOpen}
        initialLabel={newNodeData.label}
        initialLevel={newNodeData.level}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={(label, level) => {
          setNewNodeData({ ...newNodeData, label, level });
          handleCreateNodeConfirm(label, level);
        }}
      />

      <EditNodeDialog
        open={editDialogOpen}
        nodeId={nodeToEdit?.id}
        nodeLabel={nodeToEdit?.data.label}
        onClose={() => setEditDialogOpen(false)}
        onSave={(newLabel) => handleNodeUpdate(nodeToEdit!.id, newLabel)}
      />
    </Dialog>
  );
}
