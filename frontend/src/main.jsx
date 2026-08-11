import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import { NhostProvider } from "@nhost/react";
import client from "./apollo";
import { nhost } from "./nhost";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NhostProvider nhost={nhost}>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </NhostProvider>
  </React.StrictMode>
);
