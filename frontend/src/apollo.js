import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { nhost } from "./nhost";

const httpLink = new HttpLink({
  uri: "https://local.hasura.local.nhost.run/v1/graphql",
});

const authLink = setContext((_, { headers }) => {
  const accessToken = nhost.auth.getAccessToken();

  return {
    headers: {
      ...headers,
      ...(accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}),
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;