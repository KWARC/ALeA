import { createSafeFlamsQuery } from './flams-query-creator';

describe('createFlamsQuery', () => {
  describe('single URI parameters', () => {
    it('should replace a single URI parameter with its value', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> }';
      const params = { _uri_concept: 'http://example.org/concept' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <http://example.org/concept> }');
    });

    it('should replace a single URI parameter (with quotes are delims) with its value', () => {
      const query = 'SELECT ?x WHERE { FILTER(CONTAINS(STR(?learningObject), "_uri_learning_object")) }';
      const params = { _uri_learning_object: 'http://example.org/object' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { FILTER(CONTAINS(STR(?learningObject), "http://example.org/object")) }');
    });

    
    it('should replace multiple occurrences of the same single parameter', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> . ?y <_uri_concept> }';
      const params = { _uri_concept: 'http://example.org/concept' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <http://example.org/concept> . ?y <http://example.org/concept> }');
    });

    it('should handle URIs with special characters', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_uri> }';
      const params = { _uri_uri: 'http://mathhub.info?a=smglom&p=mod&m=system&s=information processing system' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <http://mathhub.info?a=smglom&p=mod&m=system&s=information%20processing%20system> }');
    });

    it('should leave placeholder unchanged if parameter is missing', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> }';
      const params = {};
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <_uri_concept> }');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Single URI parameter [_uri_concept] used but it is not provided in params.'
      );
      consoleSpy.mockRestore();
    });

    it('should leave placeholder unchanged if parameter is not a string', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> }';
      const params = { _uri_concept: ['http://example.org/concept'] };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <_uri_concept> }');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Single URI parameter [_uri_concept] used but it is not provided in params.'
      );
      consoleSpy.mockRestore();
    });

    it('should handle empty string parameter', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> }';
      const params = { _uri_concept: '' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x <> }');
    });
  });

  describe('multiple URI parameters', () => {
    it('should replace a multiple URI parameter with space-separated URIs', () => {
      const query = 'VALUES ?uri { <_multiuri_concepts> }';
      const params = { _multiuri_concepts: ['http://example.org/concept1', 'http://example.org/concept2'] };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('VALUES ?uri { <http://example.org/concept1> <http://example.org/concept2> }');
    });

    it('should handle single URI in multiple parameter array', () => {
      const query = 'VALUES ?uri { <_multiuri_concepts> }';
      const params = { _multiuri_concepts: ['http://example.org/concept1'] };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('VALUES ?uri { <http://example.org/concept1> }');
    });

    it('should handle empty array for multiple parameter', () => {
      const query = 'VALUES ?uri { <_multiuri_concepts> }';
      const params = { _multiuri_concepts: [] };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('VALUES ?uri { <_multiuri_concepts> }');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Multi URI parameter [_multiuri_concepts] used but it is not provided in params.'
      );
    });

    it('should leave placeholder unchanged if parameter is missing', () => {
      const query = 'VALUES ?uri { <_multiuri_concepts> }';
      const params = {};
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('VALUES ?uri { <_multiuri_concepts> }');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Multi URI parameter [_multiuri_concepts] used but it is not provided in params.'
      );
      consoleSpy.mockRestore();
    });

    it('should leave placeholder unchanged if parameter is not an array', () => {
      const query = 'VALUES ?uri { <_multiuri_concepts> }';
      const params = { _uri_concepts: 'http://example.org/concept' };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('VALUES ?uri { <_multiuri_concepts> }');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Multi URI parameter [_multiuri_concepts] used but it is not provided in params.'
      );
      consoleSpy.mockRestore();
    });

    it('should handle multiple URIs with special characters', () => {
      const query = 'VALUES ?uri { <_multiuri_uris> }';
      const params = {
        _multiuri_uris: [
          'http://mathhub.info?a=smglom&p=mod&m=system&s=concept1',
          'http://mathhub.info?a=smglom&p=mod&m=system&s=concept2',
        ],
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe(
        'VALUES ?uri { <http://mathhub.info?a=smglom&p=mod&m=system&s=concept1> <http://mathhub.info?a=smglom&p=mod&m=system&s=concept2> }'
      );
    });
  });

  describe('mixed single and multiple parameters', () => {
    it('should replace both single and multiple parameters in the same query', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept> . VALUES ?uri { <_multiuri_uris> } }';
      const params = {
        _uri_concept: 'http://example.org/concept',
        _multiuri_uris: ['http://example.org/uri1', 'http://example.org/uri2'],
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe(
        'SELECT ?x WHERE { ?x <http://example.org/concept> . VALUES ?uri { <http://example.org/uri1> <http://example.org/uri2> } }'
      );
    });

    it('should handle multiple different single parameters', () => {
      const query = 'SELECT ?x WHERE { ?x <_uri_concept1> . ?y <_uri_concept2> }';
      const params = {
        _uri_concept1: 'http://example.org/concept1',
        _uri_concept2: 'http://example.org/concept2',
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe(
        'SELECT ?x WHERE { ?x <http://example.org/concept1> . ?y <http://example.org/concept2> }'
      );
    });

    it('should handle multiple different multiple parameters', () => {
      const query = 'VALUES ?uri1 { <_multiuri_uris1> } . VALUES ?uri2 { <_multiuri_uris2> }';
      const params = {
        _multiuri_uris1: ['http://example.org/uri1'],
        _multiuri_uris2: ['http://example.org/uri2', 'http://example.org/uri3'],
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe(
        'VALUES ?uri1 { <http://example.org/uri1> } . VALUES ?uri2 { <http://example.org/uri2> <http://example.org/uri3> }'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle query with no parameters', () => {
      const query = 'SELECT ?x WHERE { ?x rdf:type ulo:definition }';
      const params = {};
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x rdf:type ulo:definition }');
    });

    it('should handle query with no placeholders', () => {
      const query = 'SELECT ?x WHERE { ?x rdf:type ulo:definition }';
      const params = { _uri_concept: 'http://example.org/concept' };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toBe('SELECT ?x WHERE { ?x rdf:type ulo:definition }');
    });
  });

  describe('real-world SPARQL query examples', () => {
    it('should handle a concept dependencies query', () => {
      const query = `SELECT DISTINCT ?dependency WHERE {
  ?loname rdf:type ulo:definition .
  ?loname ulo:defines <_uri_concept> .
  ?loname ulo:crossrefs ?dependency .
}`;
      const params = {
        _uri_concept: 'http://mathhub.info?a=smglom&p=mod&m=system&s=information processing system',
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toContain('<http://mathhub.info?a=smglom&p=mod&m=system&s=information%20processing%20system>');
      expect(result).not.toContain('<_uri_concept>');
    });

    it('should handle a query with VALUES clause for multiple concepts', () => {
      const query = `SELECT DISTINCT ?uri ?q ?s WHERE {
    VALUES ?uri { <_multiuri_section_uris> }
    ?uri (ulo:contains|dc:hasPart)* ?q.
    ?q ulo:defines ?s.
  }`;
      const params = {
        _multiuri_section_uris: [
          'http://mathhub.info?a=smglom&p=mod&m=system&s=section1',
          'http://mathhub.info?a=smglom&p=mod&m=system&s=section2',
        ],
      };
      const result = createSafeFlamsQuery(query, params);
      expect(result).toContain('<http://mathhub.info?a=smglom&p=mod&m=system&s=section1>');
      expect(result).toContain('<http://mathhub.info?a=smglom&p=mod&m=system&s=section2>');
      expect(result).not.toContain('<_multiuri_section_uris>');
    });
  });
});
