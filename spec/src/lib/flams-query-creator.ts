import { rdfEncodeUri } from "@flexiformal/ftml";

const MULTIPLE_URI_PARAM_REGEX = /[<](_multiuri_[a-zA-Z0-9-_]+)[>]/g;
const SINGLE_URI_PARAM_REGEX = /[<"](_uri_[a-zA-Z0-9-_]+)[>"]/g;

export function findAllUriParams(query: string) {
  const multiParamNames = new Set<string>();
  for (const match of query.matchAll(MULTIPLE_URI_PARAM_REGEX)) {
    multiParamNames.add(match[1]);
  }

  const singleParamNames = new Set<string>();
  for (const match of query.matchAll(SINGLE_URI_PARAM_REGEX)) {
    singleParamNames.add(match[1]);
  }

  return { multiParamNames: [...multiParamNames], singleParamNames: [...singleParamNames] };
}

function encodeSpecialChars(value: string) {
  return value.replace(/ /g, '%20');
}

// This function creates a FLAMS query from a given query and parameters.
// Single query parameters expect a string value, and are replaced with their values. `<>` or `"` are retained
// Eg. parameterizedQuery: `SELECT ?x WHERE { ?x <_uri_concept> }` and uriParams: { _uri_concept: 'http://example.org/concept' }
// returns `SELECT ?x WHERE { ?x <http://example.org/concept> }`
//
// Multiple query parameters expect an array of strings, and are replaced with their values in the following manner:
// Eg. parameterizedQuery: `VALUES ?uri { <_multiuri_sections> }` and uriParams: { _multiuri_sections: ['uri1', 'uri2', 'uri3'] }
// returns `VALUES ?uri { <uri1> <uri2> <uri3> }`
//
// The optional `useRdfEncodeUri` flag controls whether URIs are encoded using `rdfEncodeUri`
// from `@flexiformal/ftml` (when true) or a minimal space-encoding function (when false / omitted).
export function createSafeFlamsQuery(
  parameterizedQuery: string,
  uriParams: Record<string, string | string[]>,
  useRdfEncodeUri=false
) {
  let result = parameterizedQuery;

  const encodeUriFn = useRdfEncodeUri ? rdfEncodeUri : encodeSpecialChars;
  // Replace multiple URI parameters
  result = result.replace(MULTIPLE_URI_PARAM_REGEX, (match, paramName) => {
    const value = uriParams[paramName];
    if (!Array.isArray(value) || !value.length) {
      console.warn(`Multi URI parameter [${paramName}] used but it is not provided in params.`);
      return match;
    }
    return value.map((uri) => `${match[0]}${encodeUriFn(uri)}${match.at(-1)}`).join(' ');
  });

  // Replace single URI parameters
  result = result.replace(SINGLE_URI_PARAM_REGEX, (match, paramName) => {
    const value = uriParams[paramName];
    if (typeof value !== 'string') {
      console.warn(`Single URI parameter [${paramName}] used but it is not provided in params.`);
      return match;
    }
    return `${match[0]}${encodeUriFn(value)}${match.at(-1)}`;
  });

  return result;
}
