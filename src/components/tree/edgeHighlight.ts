// Decides whether an edge should render in the "selected" accent color --
// the selected person's own spouse and children connectors, not their
// ancestors'. PositionedEdge carries no personId fields of its own, but
// treeLayout.ts builds every edge id from the person ids it joins (see
// collectPositions there), so those same ids can be read back out of it.
const BRIDGE_SUFFIX = /-(secondary-)?bridge$/;
const CONNECTOR_SUFFIX = /-(solid|dashed)$/;

export function edgeConnectsToPerson(edgeId: string, personId: string): boolean {
  const bridgeMatch = edgeId.match(BRIDGE_SUFFIX);
  if (bridgeMatch) {
    return edgeId.slice(0, bridgeMatch.index).split("+").includes(personId);
  }

  const connectorMatch = edgeId.match(CONNECTOR_SUFFIX);
  if (connectorMatch) {
    const withoutSuffix = edgeId.slice(0, connectorMatch.index);
    const arrowIndex = withoutSuffix.indexOf(">");
    if (arrowIndex === -1) return false;
    return withoutSuffix
      .slice(arrowIndex + 1)
      .split("+")
      .includes(personId);
  }

  return false;
}
