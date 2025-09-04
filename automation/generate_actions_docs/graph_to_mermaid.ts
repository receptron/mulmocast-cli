// copied from https://github.com/receptron/graphai/blob/main/packages/cli/src/mermaid.ts

import { type GraphData, type NodeData, inputs2dataSources, isComputedNodeData } from "graphai";

type MermaidState = {
  lines: string[];
  staticNodes: string[];
  computedNodes: string[];
  nestedGraphNodes: string[];
};

const BASE_INDENT = "  ";

const sanitizeNodeId = (nodeId: string): string => {
  return `n_${nodeId.replace(/\./g, "_")}`;
};

const sanitizeAgentName = (agent: unknown): string => {
  if (typeof agent === "string") {
    return agent;
  }
  if (typeof agent === "function") {
    // 関数名を取得するか、無名関数の場合は "function" を返す
    return agent.name || "function";
  }
  if (agent && typeof agent === "object") {
    // オブジェクトの場合は最初のキーを使用
    const keys = Object.keys(agent);
    return keys.length > 0 ? keys[0] : "object";
  }
  return "unknown";
};

const getFullNodeId = (nodeId: string, parentPath: string): string => {
  return parentPath ? `${parentPath}.${nodeId}` : nodeId;
};

const getIndentLevel = (parentPath: string): number => {
  return parentPath.split(".").filter(Boolean).length;
};

const formatLine = (content: string, depth: number = 0): string => {
  return BASE_INDENT + BASE_INDENT.repeat(depth) + content;
};

const processConnections = (inputs: unknown, targetNodeId: string, parentPath: string, state: MermaidState): void => {
  const depth = getIndentLevel(parentPath);
  let sources = inputs2dataSources(inputs);
  if (!Array.isArray(sources)) {
    sources = [sources];
  }

  sources.forEach((source) => {
    if (source.nodeId) {
      const sourceFullId = getFullNodeId(source.nodeId, parentPath);
      const sourceMermaidId = sanitizeNodeId(sourceFullId);
      const targetMermaidId = sanitizeNodeId(targetNodeId);

      const connection = source.propIds
        ? `${sourceMermaidId} -- ${source.propIds.join(".")} --> ${targetMermaidId}`
        : `${sourceMermaidId} --> ${targetMermaidId}`;

      state.lines.push(formatLine(connection, depth));
    }
  });
};

const processNode = (nodeId: string, node: NodeData, parentPath: string, state: MermaidState): void => {
  const fullNodeId = getFullNodeId(nodeId, parentPath);
  const mermaidNodeId = sanitizeNodeId(fullNodeId);
  const depth = getIndentLevel(parentPath);

  if ("graph" in node) {
    state.lines.push(formatLine(`subgraph ${mermaidNodeId}[${nodeId}: ${node.agent || ""}]`, depth));

    if (node.graph && typeof node.graph === "object" && node.graph.nodes) {
      Object.entries(node.graph.nodes).forEach(([subNodeId, subNode]) => {
        processNode(subNodeId, subNode, fullNodeId, state);
      });
    }

    state.lines.push(formatLine("end", depth));
    state.nestedGraphNodes.push(mermaidNodeId);
  } else if (isComputedNodeData(node)) {
    const agentName = sanitizeAgentName(node.agent);
    state.lines.push(formatLine(`${mermaidNodeId}(${nodeId}<br/>${agentName})`, depth));
    state.computedNodes.push(mermaidNodeId);
  } else {
    // Static nodes or fallback for unknown node types
    state.lines.push(formatLine(`${mermaidNodeId}(${nodeId})`, depth));
    state.staticNodes.push(mermaidNodeId);
  }

  if ("inputs" in node && node.inputs) {
    processConnections(node.inputs, fullNodeId, parentPath, state);
  }

  if ("update" in node) {
    processConnections({ update: node.update }, fullNodeId, parentPath, state);
  }
};

const addNodeClasses = (state: MermaidState): void => {
  if (state.staticNodes.length > 0) {
    state.lines.push(formatLine(`class ${state.staticNodes.join(",")} staticNode`));
  }
  if (state.computedNodes.length > 0) {
    state.lines.push(formatLine(`class ${state.computedNodes.join(",")} computedNode`));
  }
  if (state.nestedGraphNodes.length > 0) {
    state.lines.push(formatLine(`class ${state.nestedGraphNodes.join(",")} nestedGraph`));
  }
};

export const mermaid = (graphData: GraphData): string => {
  const state: MermaidState = {
    lines: ["flowchart TD"],
    staticNodes: [],
    computedNodes: [],
    nestedGraphNodes: [],
  };

  Object.entries(graphData.nodes).forEach(([nodeId, node]) => {
    processNode(nodeId, node, "", state);
  });

  addNodeClasses(state);

  return state.lines.join("\n");
};
