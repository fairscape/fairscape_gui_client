// Ported from fairscape_web_client. Studio changes: dropped react-router <Link>
// (no /view route) in favor of an onNavigateEntity callback; removed the unused
// extractSupportData/findRootEntity dead code; fixed import paths; hooks run
// unconditionally before any early return.
import React, { useState, useMemo, ReactNode } from "react";
import styled from "styled-components";
import { GraphDataService } from "./hooks/GraphDataService";
import { RawGraphEntity } from "./types/graph";

const Container = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  width: 100%;
  color: #1a1a1a; /* dark text on the light table rows (app theme defaults text to light) */
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const SearchInputContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.colors.primary}33`};
  }
`;

const CollapsibleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.9rem;
`;

const SectionContent = styled.div<{ isOpen: boolean }>`
  max-height: ${({ isOpen }) => (isOpen ? "2000px" : "0")};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  background-color: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 2px solid ${({ theme }) => theme.colors.primary};
`;

const TableHeaderCell = styled.th`
  padding: ${({ theme }) => theme.spacing.sm};
  text-align: left;
  font-weight: bold;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const TableRow = styled.tr`
  &:nth-child(odd) {
    background-color: ${({ theme }) => theme.colors.background};
  }
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundHover};
  }
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: middle;
  font-size: 0.9rem;
`;

const DescriptionCell = styled(TableCell)`
  max-width: 400px;
  line-height: 1.4;
  vertical-align: top;
`;

const EntityLinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  cursor: pointer;
  text-align: left;
  &:hover {
    text-decoration: underline;
  }
`;

const NoDataMessage = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.md};
`;

const RelationshipButton = styled.button`
  background-color: ${({ theme }) => theme.colors.secondary};
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-left: 8px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const HighlightSpan = styled.span`
  background-color: yellow;
  font-weight: bold;
  color: black;
`;

interface SupportingElementsComponentProps {
  dataService: GraphDataService | null;
  onShowRelationshipPath: (pathNodeIds: string[] | null) => void;
  onNavigateEntity?: (arkId: string) => void;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getHighlightedText = (text: string, highlight: string): ReactNode[] => {
  if (!text) return [text];
  if (!highlight.trim()) return [text];
  const escaped = escapeRegExp(highlight);
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <HighlightSpan key={`${part}-${i}`}>{part}</HighlightSpan>
    ) : (
      part
    )
  );
};

const extractArkIdentifier = (url: string) => {
  const match = url.match(/(ark:.+)/);
  return match ? match[1] : url;
};

const getEntityType = (typeUri: string | string[] | undefined): string => {
  if (!typeUri) return "Unknown";
  const typeString = Array.isArray(typeUri) ? typeUri[typeUri.length - 1] : typeUri;
  return typeString.split(/[#/]/).pop() || "Unknown";
};

const SupportingElementsComponent: React.FC<SupportingElementsComponentProps> = ({
  dataService,
  onShowRelationshipPath,
  onNavigateEntity,
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    datasets: false,
    software: false,
    computations: false,
    samples: false,
    experiments: false,
    instruments: false,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const supportData = useMemo(() => {
    const categorized = {
      datasets: [] as RawGraphEntity[],
      software: [] as RawGraphEntity[],
      computations: [] as RawGraphEntity[],
      samples: [] as RawGraphEntity[],
      experiments: [] as RawGraphEntity[],
      instruments: [] as RawGraphEntity[],
    };
    if (!dataService) return categorized;
    for (const node of dataService.getAllNodes()) {
      switch (getEntityType(node["@type"])) {
        case "Dataset":
          categorized.datasets.push(node);
          break;
        case "Software":
          categorized.software.push(node);
          break;
        case "Computation":
          categorized.computations.push(node);
          break;
        case "Sample":
          categorized.samples.push(node);
          break;
        case "Experiment":
          categorized.experiments.push(node);
          break;
        case "Instrument":
          categorized.instruments.push(node);
          break;
      }
    }
    return categorized;
  }, [dataService]);

  const filteredSupportData = useMemo(() => {
    if (!searchTerm.trim()) return supportData;
    const q = searchTerm.toLowerCase();
    const result = {
      datasets: [] as RawGraphEntity[],
      software: [] as RawGraphEntity[],
      computations: [] as RawGraphEntity[],
      samples: [] as RawGraphEntity[],
      experiments: [] as RawGraphEntity[],
      instruments: [] as RawGraphEntity[],
    };
    (Object.keys(supportData) as Array<keyof typeof supportData>).forEach((key) => {
      result[key] = supportData[key].filter(
        (el) =>
          (el.name && el.name.toLowerCase().includes(q)) ||
          (el.description && el.description.toLowerCase().includes(q))
      );
    });
    return result;
  }, [supportData, searchTerm]);

  if (!dataService) {
    return (
      <Container>
        <SectionTitle>Supporting Elements</SectionTitle>
        <NoDataMessage>Graph data not loaded yet.</NoDataMessage>
      </Container>
    );
  }

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const showRelationship = (elementId: string) => {
    const path = dataService.findPathFromAnyOutput(elementId);
    if (path && path.length > 0) onShowRelationshipPath(path);
    else onShowRelationshipPath(null);
  };

  const hasAnyElements = Object.values(supportData).some((arr) => arr.length > 0);
  if (!hasAnyElements) {
    return (
      <Container>
        <SectionTitle>Supporting Elements</SectionTitle>
        <NoDataMessage>No supporting elements found for this graph.</NoDataMessage>
      </Container>
    );
  }

  const hasFilteredElements = Object.values(filteredSupportData).some((arr) => arr.length > 0);
  const outputIds = dataService.getOutputNodes().map((n) => n["@id"]);

  return (
    <Container>
      <SectionTitle>Supporting Elements</SectionTitle>

      <SearchInputContainer>
        <SearchInput
          type="text"
          placeholder="Search elements by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchInputContainer>

      {!hasFilteredElements && searchTerm.trim() ? (
        <NoDataMessage>No supporting elements match your search criteria.</NoDataMessage>
      ) : (
        Object.entries(filteredSupportData).map(([sectionKey, elements]) => {
          if (elements.length === 0) return null;
          return (
            <CollapsibleSection key={sectionKey}>
              <SectionHeader onClick={() => toggleSection(sectionKey)}>
                <span>
                  {sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} ({elements.length})
                </span>
                <span>{expandedSections[sectionKey] ? "▲" : "▼"}</span>
              </SectionHeader>
              <SectionContent isOpen={!!expandedSections[sectionKey]}>
                <div style={{ overflowX: "auto" }}>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Description</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <tbody>
                      {elements.map((el) => {
                        const isOutput = outputIds.includes(el["@id"]);
                        return (
                          <TableRow key={el["@id"]}>
                            <TableCell>
                              <EntityLinkButton
                                type="button"
                                onClick={() =>
                                  onNavigateEntity?.(extractArkIdentifier(el["@id"]))
                                }
                                title={el["@id"]}
                              >
                                {getHighlightedText(el.name || el["@id"], searchTerm)}
                              </EntityLinkButton>
                              {isOutput && " (Output)"}
                            </TableCell>
                            <DescriptionCell>
                              {getHighlightedText(
                                el.description || "No description provided.",
                                searchTerm
                              )}
                            </DescriptionCell>
                            <TableCell>
                              <RelationshipButton
                                onClick={() => showRelationship(el["@id"])}
                                disabled={isOutput}
                                title={
                                  isOutput
                                    ? "This node is already an output"
                                    : "Show path from an output to this node"
                                }
                              >
                                {isOutput ? "Is Output" : "Show Relationship"}
                              </RelationshipButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </SectionContent>
            </CollapsibleSection>
          );
        })
      )}
    </Container>
  );
};

export default SupportingElementsComponent;
