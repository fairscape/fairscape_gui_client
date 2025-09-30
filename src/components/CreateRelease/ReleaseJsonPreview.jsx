import React from "react";
import styled from "styled-components";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

const Container = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  border-radius: 10px;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  border: ${(props) =>
    props.theme.name === "light"
      ? "1px solid " + props.theme.colors.border
      : "none"};
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
`;

const Header = styled.div`
  background-color: ${(props) => props.theme.colors.accent};
  color: white;
  padding: 15px;
  border-radius: 10px 10px 0 0;
  font-weight: bold;
  font-size: 16px;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const CodeContainer = styled.div`
  height: 100%;
`;

function ReleaseJsonPreview({ jsonData }) {
  return (
    <Container>
      <Header>JSON-LD Preview</Header>
      <Content>
        <CodeContainer>
          <SyntaxHighlighter
            language="json"
            style={vs2015}
            customStyle={{
              margin: 0,
              height: "100%",
              backgroundColor: "transparent",
              padding: "15px",
              fontSize: "12px",
              lineHeight: "1.4",
            }}
            showLineNumbers
          >
            {JSON.stringify(jsonData, null, 2)}
          </SyntaxHighlighter>
        </CodeContainer>
      </Content>
    </Container>
  );
}

export default ReleaseJsonPreview;
