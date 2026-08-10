import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://local.hasura.local.nhost.run/v1/graphql",
  }),
  cache: new InMemoryCache(),
});

export default client;