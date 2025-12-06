import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import {
  ALL_DIM_CONCEPT_PAIR,
  ALL_LO_RELATION_TYPES,
  ALL_NON_DIM_CONCEPT,
  AllLoRelationTypes,
  getQueryResults,
  getSparqlQueryForLoRelationToDimAndConceptPair,
  getSparqlQueryForLoRelationToNonDimConcept,
  LoRelationToDimAndConceptPair,
  LoRelationToNonDimConcept,
  SparqlResponse,
} from '@alea/spec';
import { DimAndURIListDisplay, URIListDisplay } from '@alea/stex-react-renderer';
import { capitalizeFirstLetter, PRIMARY_COL } from '@alea/utils';
import { useEffect, useState } from 'react';

function processDimAndConceptData(result: SparqlResponse) {
  try {
    const groupedData: Partial<Record<LoRelationToDimAndConceptPair, string[]>> = {};
    result.results.bindings.map((binding: Record<string, { type: string; value: string }>) => {
      const relationValue = binding.relation.value.split('#').pop() || binding.relation.value;
      const relatedData = binding.relatedData.value.split('; ');
      const cognitiveDimensions = relatedData
        .filter((data: string) => data.startsWith('http://mathhub.info/ulo#cognitive-dimension='))
        .map((data: string) => {
          const encodedValue = data.split('=')[1];
          const decoded = decodeURIComponent(encodedValue);
          return decoded.split('cd-').pop();
        });
      const poSymbols = relatedData
        .filter((data: string) => data.startsWith('http://mathhub.info/ulo#po-symbol='))
        .map((data: string) => {
          const encodedValue = data.split('#po-symbol=')[1];
          const decodedValue = decodeURIComponent(encodedValue);
          return decodedValue.endsWith('#') ? decodedValue.slice(0, -1) : decodedValue;
        });
      const combinedData = cognitiveDimensions.flatMap((dim) =>
        poSymbols.map((symbol) => `${dim}:${encodeURIComponent(symbol)}`)
      );

      if (!groupedData[relationValue]) {
        groupedData[relationValue] = [];
      }
      groupedData[relationValue]?.push(...combinedData);
    });
    return groupedData;
  } catch (error) {
    console.error('Error processing data:', error);
    return null;
  }
}

function processNonDimConceptData(result: SparqlResponse) {
  try {
    const groupedData = result.results.bindings.reduce(
      (acc: Partial<Record<LoRelationToNonDimConcept, string[]>>, { relation, obj1 }) => {
        const relationValue = relation.value.split('#').pop() || relation.value;
        const obj1Value = obj1.value;
        if (!acc[relationValue]) {
          acc[relationValue] = [];
        }
        acc[relationValue].push(obj1Value);
        return acc;
      },
      {}
    );
    return groupedData;
  } catch (error) {
    console.error('Error processing data:', error);
    return null;
  }
}

function NonDimensionalUriListDisplay({
  title,
  data,
  displayReverseRelation,
}: {
  title: string;
  data: string;
  displayReverseRelation?: (conceptUri: string) => void;
}) {
  const uniqueUris = Array.from(new Set(data.split(',')));
  return (
    <Box border="1px solid black" mb="10px" bgcolor="white">
      <Typography fontWeight="bold" sx={{ p: '10px' }}>
        {title}&nbsp;
      </Typography>
      <Box borderTop="1px solid #AAA" p="5px" display="flex" flexWrap="wrap">
        <URIListDisplay uris={uniqueUris} displayReverseRelation={displayReverseRelation} />
      </Box>
    </Box>
  );
}

const LoRelations = ({
  uri,
  displayReverseRelation,
}: {
  uri: string;
  displayReverseRelation?: (conceptUri: string) => void;
}) => {
  const [data, setData] = useState<Record<AllLoRelationTypes, string>>({
    objective: '',
    precondition: '',
    crossrefs: '',
    'example-for': '',
    defines: '',
    specifies: '',
  });
  useEffect(() => {
    const processData = async () => {
      try {
        if (!uri?.length) return;

        const updatedData = { ...data };
        const dimConceptQuery = getSparqlQueryForLoRelationToDimAndConceptPair(uri);
        const nonDimConceptQuery = getSparqlQueryForLoRelationToNonDimConcept(uri);

        const [dimConceptResult, nonDimConceptResult] = await Promise.all([
          getQueryResults(dimConceptQuery),
          getQueryResults(nonDimConceptQuery),
        ]);

        const dimConceptData = processDimAndConceptData(dimConceptResult);
        ALL_DIM_CONCEPT_PAIR.forEach((relation) => {
          updatedData[relation] = dimConceptData[relation]?.join(',') || '';
        });

        const nonDimConceptData = processNonDimConceptData(nonDimConceptResult);
        ALL_NON_DIM_CONCEPT.forEach((relation) => {
          updatedData[relation] = nonDimConceptData[relation]?.join(',') || '';
        });

        setData(updatedData);
      } catch (error) {
        console.error('Error processing data:', error);
      }
    };
    processData();
  }, [uri]);

  if (!uri) return;
  return (
    <Box mb={2}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            borderBottom: '1px solid #BDBDBD',
            '&:hover': {
              backgroundColor: '#F0F0F0',
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: 'bold',
              color: PRIMARY_COL,
            }}
          >
            Show Insights
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            backgroundColor: '#F0F2F5',
            padding: '16px',
          }}
        >
          {ALL_LO_RELATION_TYPES.some((loRelation) => data[loRelation]) ? (
            ALL_LO_RELATION_TYPES.filter((loRelation) => data[loRelation]).map((loRelation) =>
              ALL_DIM_CONCEPT_PAIR.includes(loRelation as LoRelationToDimAndConceptPair) ? (
                <DimAndURIListDisplay
                  key={loRelation}
                  title={capitalizeFirstLetter(loRelation)}
                  data={data[loRelation]}
                  displayReverseRelation={displayReverseRelation}
                />
              ) : (
                <NonDimensionalUriListDisplay
                  key={loRelation}
                  title={capitalizeFirstLetter(loRelation)}
                  data={data[loRelation]}
                  displayReverseRelation={displayReverseRelation}
                />
              )
            )
          ) : (
            <Typography textAlign="center" color="gray" fontStyle="italic" mt="10px">
              No data available to display.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default LoRelations;
